import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const client = new Anthropic();

const tools: Anthropic.Tool[] = [
  {
    name: "get_all_jobs",
    description: "Fetch all jobs for the current user",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_jobs_by_status",
    description: "Fetch jobs filtered by status",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["APPLIED", "FOLLOWED_UP", "INTERVIEW", "OFFER", "REJECTED"],
        },
      },
      required: ["status"],
    },
  },
  {
    name: "get_stats",
    description: "Get aggregate stats: total applied, interview rate, average response time, top skills",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
];

async function runTool(name: string, userId: string) {
  if (name === "get_all_jobs") {
    return prisma.job.findMany({
      where: { userId },
      include: { events: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  if (name === "get_jobs_by_status") {
    // status is passed via input — handled in the calling code
    return null;
  }

  if (name === "get_stats") {
    const jobs = await prisma.job.findMany({ where: { userId } });
    const applied = jobs.filter((j: { status: string }) => j.status !== "APPLIED").length;
    const interviews = jobs.filter((j: { status: string }) =>
      ["INTERVIEW", "OFFER"].includes(j.status)
    ).length;
    const interviewRate = applied > 0 ? Math.round((interviews / applied) * 100) : 0;

    const skillCount: Record<string, number> = {};
    for (const job of jobs) {
      for (const req of job.requirements) {
        skillCount[req] = (skillCount[req] ?? 0) + 1;
      }
    }
    const topSkills = Object.entries(skillCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([skill, count]) => ({ skill, count }));

    return { total: jobs.length, applied, interviewRate, topSkills };
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages } = await req.json();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system:
      "You are a helpful job search assistant. Use the available tools to answer questions about the user's job applications. Be concise and practical.",
    tools,
    messages,
  });

  // Handle tool use in a loop
  const allMessages: Anthropic.MessageParam[] = [...messages];
  let current = response;

  while (current.stop_reason === "tool_use") {
    const toolUseBlocks = current.content.filter((b) => b.type === "tool_use");

    allMessages.push({ role: "assistant", content: current.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (block) => {
        if (block.type !== "tool_use") return null!;
        let result;

        if (block.name === "get_jobs_by_status") {
          const input = block.input as { status: string };
          result = await prisma.job.findMany({
            where: { userId, status: input.status as any },
            include: { events: true },
          });
        } else {
          result = await runTool(block.name, userId);
        }

        return {
          type: "tool_result" as const,
          tool_use_id: block.id,
          content: JSON.stringify(result),
        };
      })
    );

    allMessages.push({ role: "user", content: toolResults });

    current = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system:
        "You are a helpful job search assistant. Use the available tools to answer questions about the user's job applications. Be concise and practical.",
      tools,
      messages: allMessages,
    });
  }

  const textBlock = current.content.find((b) => b.type === "text");
  return NextResponse.json({ reply: textBlock?.type === "text" ? textBlock.text : "" });
}

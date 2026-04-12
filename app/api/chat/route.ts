import { auth } from "@clerk/nextjs/server";
import { streamText, tool, convertToModelMessages, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Tools are defined with `tool()` helper. Each tool has:
// - `inputSchema`: Zod schema (replaces raw `input_schema` JSON from the Anthropic SDK)
// - `execute`: runs server-side when Claude decides to call this tool
// The SDK handles the tool-call → execute → feed result back → loop automatically.
function makeTools(userId: string) {
  return {
    get_all_jobs: tool({
      description: "Fetch all jobs for the current user",
      inputSchema: z.object({}),
      execute: async () =>
        prisma.job.findMany({
          where: { userId },
          include: { events: true },
          orderBy: { updatedAt: "desc" },
        }),
    }),

    get_jobs_by_status: tool({
      description: "Fetch jobs filtered by status",
      inputSchema: z.object({
        status: z.enum(["APPLIED", "FOLLOWED_UP", "INTERVIEW", "OFFER", "REJECTED"]),
      }),
      execute: async ({ status }) =>
        prisma.job.findMany({
          where: { userId, status },
          include: { events: true },
        }),
    }),

    get_stats: tool({
      description: "Get aggregate stats: total applied, interview rate, top skills",
      inputSchema: z.object({}),
      execute: async () => {
        const jobs = await prisma.job.findMany({ where: { userId } });
        const applied = jobs.filter((j) => j.status !== "APPLIED").length;
        const interviews = jobs.filter((j) =>
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
      },
    }),
  };
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { messages } = await req.json();

  // In AI SDK v6, useChat sends UIMessage[] to the server.
  // convertToModelMessages() maps them to ModelMessage[] that streamText understands.
  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    maxOutputTokens: 1024,
    // Default stopWhen is stepCountIs(1) — that's why it halted after the tool call.
    // stepCountIs(5) lets the loop run up to 5 turns: tool call → result → final reply.
    stopWhen: stepCountIs(5),
    system:
      "You are a helpful job search assistant. Use the available tools to answer questions about the user's job applications. Be concise and practical.",
    tools: makeTools(userId),
    messages: await convertToModelMessages(messages),
  });

  // toUIMessageStreamResponse() is the native v6 streaming format.
  // The useChat hook on the client knows how to consume it.
  return result.toUIMessageStreamResponse();
}

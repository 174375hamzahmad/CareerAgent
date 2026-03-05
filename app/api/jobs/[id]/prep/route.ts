import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const client = new Anthropic();

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || job.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Generate concise interview prep for this role:

Company: ${job.company}
Role: ${job.role}
${job.description ? `Description: ${job.description}` : ""}
${job.requirements.length > 0 ? `Requirements: ${job.requirements.join(", ")}` : ""}

Provide:
**5 Likely Interview Questions**
(specific to this role and company)

**3 Key Talking Points**
(things to emphasize about yourself)

**2 Questions to Ask Them**
(thoughtful questions that show genuine interest)

Be specific. No generic advice.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const interviewPrep = textBlock?.type === "text" ? textBlock.text : "";

  const updated = await prisma.job.update({
    where: { id },
    data: { interviewPrep },
    include: { events: { orderBy: { date: "desc" } } },
  });

  return NextResponse.json(updated);
}

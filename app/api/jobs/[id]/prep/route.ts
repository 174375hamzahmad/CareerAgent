import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { prisma } from "@/lib/prisma";

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

  // generateText replaces client.messages.create + the manual .content.find(b => b.type === "text")
  // unwrapping. `text` is just a string directly.
  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    maxOutputTokens: 1024,
    prompt: `Generate concise interview prep for this role:

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
  });

  const updated = await prisma.job.update({
    where: { id },
    data: { interviewPrep: text },
    include: { events: { orderBy: { date: "desc" } } },
  });

  return NextResponse.json(updated);
}

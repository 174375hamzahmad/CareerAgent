import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

// Zod schema replaces the raw JSON input_schema we passed to the Anthropic tool.
// generateObject uses this to force Claude to return exactly this shape,
// and TypeScript knows the type of `object` without any casting.
const JobSchema = z.object({
  company: z.string().describe("Company name"),
  role: z.string().describe("Job title / role"),
  salary: z.string().nullable().describe("Salary or compensation range, as written. Null if not mentioned."),
  location: z.string().nullable().describe("City, state, or country. Null if not mentioned."),
  remote: z.boolean().describe("True if remote or hybrid is mentioned"),
  description: z.string().describe("2-3 sentence summary of the role"),
  requirements: z
    .array(z.string())
    .describe("Key skills and requirements, each as a short phrase e.g. 'React', '5+ years experience'"),
});

async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; JobTrackerBot/1.0)" },
    signal: AbortSignal.timeout(8000),
  });
  const html = await res.text();
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 15000);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url, text } = await req.json();

  if (!url && !text) {
    return NextResponse.json({ error: "Provide a url or text" }, { status: 400 });
  }

  let jobText = text;

  if (url && !text) {
    try {
      jobText = await fetchPageText(url);
    } catch {
      return NextResponse.json(
        { error: "Could not fetch the URL. Please paste the job description as text instead." },
        { status: 422 }
      );
    }
  }

  // generateObject replaces: client.messages.create → find tool_use block → cast .input
  // Now Claude is constrained to return exactly the JobSchema shape.
  // `object` is fully typed as z.infer<typeof JobSchema> — no `as Record<string, unknown>` needed.
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: JobSchema,
    prompt: `Extract the job details from this posting:\n\n${jobText}`,
  });

  return NextResponse.json({ ...object, url: url ?? null });
}

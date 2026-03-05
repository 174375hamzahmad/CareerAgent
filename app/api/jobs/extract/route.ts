import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const extractTool: Anthropic.Tool = {
  name: "extract_job_details",
  description: "Extract structured job details from a job posting",
  input_schema: {
    type: "object" as const,
    properties: {
      company: { type: "string", description: "Company name" },
      role: { type: "string", description: "Job title / role" },
      salary: { type: "string", description: "Salary or compensation range, as written. Null if not mentioned." },
      location: { type: "string", description: "City, state, or country. Null if not mentioned." },
      remote: { type: "boolean", description: "True if remote or hybrid is mentioned" },
      description: { type: "string", description: "2-3 sentence summary of the role" },
      requirements: {
        type: "array",
        items: { type: "string" },
        description: "Key skills and requirements, each as a short phrase e.g. 'React', '5+ years experience', 'TypeScript'",
      },
    },
    required: ["company", "role", "remote", "requirements"],
  },
};

async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; JobTrackerBot/1.0)" },
    signal: AbortSignal.timeout(8000),
  });
  const html = await res.text();
  // Strip HTML tags to get readable text
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 15000); // Keep within token limits
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

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    tools: [extractTool],
    tool_choice: { type: "any" },
    messages: [
      {
        role: "user",
        content: `Extract the job details from this posting:\n\n${jobText}`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return NextResponse.json({ error: "AI could not extract job details" }, { status: 500 });
  }

  const raw = toolUse.input as Record<string, unknown>;
  // Normalize: convert string "null" / "none" / empty → actual null
  const nullify = (v: unknown) =>
    typeof v === "string" && /^(null|none|n\/a)$/i.test(v.trim()) ? null : v ?? null;

  return NextResponse.json({
    ...raw,
    salary: nullify(raw.salary),
    location: nullify(raw.location),
    url: url ?? null,
  });
}

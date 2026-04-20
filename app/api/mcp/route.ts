/**
 * MCP (Model Context Protocol) Server — /api/mcp
 *
 * Exposes CareerAgent job data as MCP tools so any MCP-compatible client
 * (Claude Desktop, Cursor, etc.) can query your job applications directly.
 *
 * Auth: Bearer token in Authorization header must match MCP_SECRET env var.
 * Each tool also requires a `userId` argument so the server knows whose data to fetch.
 *
 * Transport: WebStandardStreamableHTTPServerTransport — stateless HTTP,
 * works with Vercel serverless functions (no persistent connections needed).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Auth helper
// MCP clients can't use Clerk session tokens, so we use a shared secret.
// The client sends: Authorization: Bearer <MCP_SECRET>
// ---------------------------------------------------------------------------
function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token === process.env.MCP_SECRET;
}

// ---------------------------------------------------------------------------
// Build and connect a fresh McpServer for each request.
// This is the stateless pattern — no session state is kept between calls.
// ---------------------------------------------------------------------------
function buildServer(): McpServer {
  const server = new McpServer({
    name: "careeragent",
    version: "1.0.0",
  });

  // ------------------------------------------------------------------
  // Tool 1: get_applications
  // List job applications with optional filters.
  // ------------------------------------------------------------------
  server.registerTool(
    "get_applications",
    {
      description: "List job applications for a user with optional filters",
      inputSchema: {
        userId: z.string().describe("The Clerk user ID"),
        status: z
          .enum(["APPLIED", "FOLLOWED_UP", "INTERVIEW", "OFFER", "REJECTED"])
          .optional()
          .describe("Filter by application status"),
        company: z.string().optional().describe("Filter by company name (partial match)"),
        from: z.string().optional().describe("ISO date string — only return jobs applied on or after this date"),
        to: z.string().optional().describe("ISO date string — only return jobs applied on or before this date"),
      },
    },
    async ({ userId, status, company, from, to }) => {
      const jobs = await prisma.job.findMany({
        where: {
          userId,
          ...(status && { status }),
          ...(company && { company: { contains: company, mode: "insensitive" } }),
          ...(from || to
            ? {
                createdAt: {
                  ...(from && { gte: new Date(from) }),
                  ...(to && { lte: new Date(to) }),
                },
              }
            : {}),
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          company: true,
          role: true,
          status: true,
          location: true,
          remote: true,
          salary: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify(jobs, null, 2) }],
      };
    }
  );

  // ------------------------------------------------------------------
  // Tool 2: get_application_detail
  // Full detail for a single job including prep content and events.
  // ------------------------------------------------------------------
  server.registerTool(
    "get_application_detail",
    {
      description: "Get full detail for a single job application including interview prep and timeline events",
      inputSchema: {
        userId: z.string().describe("The Clerk user ID"),
        jobId: z.string().describe("The job application ID"),
      },
    },
    async ({ userId, jobId }) => {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: { events: { orderBy: { date: "desc" } } },
      });

      if (!job || job.userId !== userId) {
        return {
          content: [{ type: "text" as const, text: "Job not found or access denied" }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(job, null, 2) }],
      };
    }
  );

  // ------------------------------------------------------------------
  // Tool 3: update_application_status
  // Change the status of a job application.
  // ------------------------------------------------------------------
  server.registerTool(
    "update_application_status",
    {
      description: "Update the status of a job application",
      inputSchema: {
        userId: z.string().describe("The Clerk user ID"),
        jobId: z.string().describe("The job application ID"),
        status: z
          .enum(["APPLIED", "FOLLOWED_UP", "INTERVIEW", "OFFER", "REJECTED"])
          .describe("The new status to set"),
      },
    },
    async ({ userId, jobId, status }) => {
      const job = await prisma.job.findUnique({ where: { id: jobId } });

      if (!job || job.userId !== userId) {
        return {
          content: [{ type: "text" as const, text: "Job not found or access denied" }],
          isError: true,
        };
      }

      const updated = await prisma.job.update({
        where: { id: jobId },
        data: { status },
        select: { id: true, company: true, role: true, status: true },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Updated ${updated.company} — ${updated.role} to status: ${updated.status}`,
          },
        ],
      };
    }
  );

  // ------------------------------------------------------------------
  // Tool 4: get_interview_prep
  // Return the saved interview prep content for a job.
  // ------------------------------------------------------------------
  server.registerTool(
    "get_interview_prep",
    {
      description: "Get the interview prep questions and talking points for a job application",
      inputSchema: {
        userId: z.string().describe("The Clerk user ID"),
        jobId: z.string().describe("The job application ID"),
      },
    },
    async ({ userId, jobId }) => {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: { userId: true, company: true, role: true, interviewPrep: true },
      });

      if (!job || job.userId !== userId) {
        return {
          content: [{ type: "text" as const, text: "Job not found or access denied" }],
          isError: true,
        };
      }

      if (!job.interviewPrep) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No interview prep generated yet for ${job.company} — ${job.role}. Generate it first via the app.`,
            },
          ],
        };
      }

      return {
        content: [{ type: "text" as const, text: job.interviewPrep }],
      };
    }
  );

  return server;
}

// ---------------------------------------------------------------------------
// Next.js route handlers
// Both GET and POST are required — MCP uses POST for tool calls,
// GET for optional server-sent event streams (we support both).
// ---------------------------------------------------------------------------
async function handler(req: Request): Promise<Response> {
  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // sessionIdGenerator: undefined = stateless mode.
  // Each request is handled independently — no session state is stored.
  // This is correct for Vercel serverless where instances don't share memory.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  const server = buildServer();
  await server.connect(transport);

  return transport.handleRequest(req);
}

export const GET = handler;
export const POST = handler;

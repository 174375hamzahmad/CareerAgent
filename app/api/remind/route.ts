import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  // Verify cron secret to prevent unauthorized triggers
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find all jobs where follow-up is due and email hasn't been sent yet
  const jobs = await prisma.job.findMany({
    where: {
      followUpAt: { lte: now },
      followUpSent: false,
      status: { in: ["APPLIED", "INTERVIEW"] },
    },
  });

  if (jobs.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const results = await Promise.allSettled(
    jobs.map(async (job) => {
      await resend.emails.send({
        from: "CareerAgent <onboarding@resend.dev>",
        to: process.env.NOTIFY_EMAIL ?? "you@example.com",
        subject: `Follow up: ${job.role} at ${job.company}`,
        html: `
          <p>Hey,</p>
          <p>You applied for <strong>${job.role}</strong> at <strong>${job.company}</strong> and haven't heard back yet.</p>
          <p>This is your reminder to follow up.</p>
          ${job.recruiterEmail ? `<p>Recruiter: <a href="mailto:${job.recruiterEmail}">${job.recruiter ?? job.recruiterEmail}</a></p>` : ""}
          <p>Good luck!</p>
        `,
      });

      await prisma.job.update({
        where: { id: job.id },
        data: { followUpSent: true },
      });
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ sent, failed });
}

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobs = await prisma.job.findMany({
    where: { userId },
    include: { events: { orderBy: { date: "desc" } }, resume: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(jobs);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const job = await prisma.job.create({
    data: {
      userId,
      company: body.company,
      role: body.role,
      salary: body.salary ?? null,
      location: body.location ?? null,
      remote: body.remote ?? false,
      url: body.url ?? null,
      description: body.description ?? null,
      requirements: body.requirements ?? [],
      notes: body.notes ?? null,
      recruiter: body.recruiter ?? null,
      recruiterEmail: body.recruiterEmail ?? null,
      resumeId: body.resumeId ?? null,
    },
    include: { events: true, resume: true },
  });

  return NextResponse.json(job, { status: 201 });
}

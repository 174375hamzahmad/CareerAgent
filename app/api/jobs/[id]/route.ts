import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Ensure the job belongs to this user
  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Create the event first so it's included in the job response below
  if (body.status && body.status !== existing.status) {
    await prisma.event.create({
      data: {
        jobId: id,
        type: body.status.toLowerCase(),
        note: body.eventNote ?? null,
      },
    });
  }

  const job = await prisma.job.update({
    where: { id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.appliedAt !== undefined && { appliedAt: body.appliedAt ? new Date(body.appliedAt) : null }),
      ...(body.followUpAt !== undefined && { followUpAt: body.followUpAt ? new Date(body.followUpAt) : null }),
      ...(body.followUpSent !== undefined && { followUpSent: body.followUpSent }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.recruiter !== undefined && { recruiter: body.recruiter }),
      ...(body.recruiterEmail !== undefined && { recruiterEmail: body.recruiterEmail }),
      ...(body.interviewPrep !== undefined && { interviewPrep: body.interviewPrep }),
      ...(body.salary !== undefined && { salary: body.salary }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.remote !== undefined && { remote: body.remote }),
      ...(body.resumeId !== undefined && { resumeId: body.resumeId }),
    },
    include: { events: { orderBy: { date: "desc" } }, resume: true },
  });

  return NextResponse.json(job);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.job.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}

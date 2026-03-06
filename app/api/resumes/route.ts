import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resumes = await prisma.resume.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(resumes);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const name = (formData.get("name") as string | null)?.trim();

  if (!file || !name) {
    return NextResponse.json({ error: "file and name are required" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "pdf";
  const filename = `${Date.now()}-${userId.slice(-6)}.${ext}`;

  const blob = await put(filename, file, { access: "private" });

  const resume = await prisma.resume.create({
    data: {
      userId,
      name,
      fileUrl: blob.url,
      fileSize: file.size,
      mimeType: file.type || null,
    },
  });

  return NextResponse.json(resume, { status: 201 });
}

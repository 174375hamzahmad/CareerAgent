import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const resume = await prisma.resume.findUnique({ where: { id } });
  if (!resume || resume.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch private blob server-side with the read/write token
  const blobRes = await fetch(resume.fileUrl, {
    headers: {
      Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
    },
  });

  if (!blobRes.ok) {
    return NextResponse.json(
      { error: `Blob fetch failed: ${blobRes.status} ${blobRes.statusText}` },
      { status: 502 }
    );
  }

  return new NextResponse(blobRes.body, {
    headers: {
      "Content-Type": resume.mimeType || "application/pdf",
      "Content-Disposition": `inline; filename="${resume.name}"`,
    },
  });
}

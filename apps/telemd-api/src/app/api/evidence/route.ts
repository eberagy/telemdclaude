import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/rbac";

// GET /api/evidence?practiceId=...
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const practiceId = searchParams.get("practiceId");

  if (!practiceId) {
    return NextResponse.json({ error: "practiceId required" }, { status: 400 });
  }

  await requireMember(userId, practiceId, ["Clinician", "PracticeOwner", "PlatformAdmin"]);

  const links = await prisma.evidenceLink.findMany({
    where: { practiceId },
    orderBy: { title: "asc" },
  });

  return NextResponse.json({ links });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { PracticeRiskControlsSchema } from "@telemd/shared";
import { writeAuditLog } from "@/lib/audit";

export async function GET(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const member = await prisma.practiceMember.findFirst({
    where: { clerkUserId: userId, role: { in: ["PracticeOwner", "PlatformAdmin"] } },
    include: { practice: true },
  });

  if (!member) {
    return NextResponse.json({ error: "No practice found" }, { status: 404 });
  }

  return NextResponse.json({ practice: member.practice });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const member = await prisma.practiceMember.findFirst({
    where: { clerkUserId: userId, role: { in: ["PracticeOwner", "PlatformAdmin"] } },
  });

  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = PracticeRiskControlsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const practice = await prisma.practice.update({
    where: { id: member.practiceId },
    data: parsed.data,
  });

  await writeAuditLog({
    practiceId: member.practiceId,
    clerkUserId: userId,
    memberId: member.id,
    eventType: "EDIT_NOTE",
    resourceType: "PracticeRiskControls",
    resourceId: member.practiceId,
  });

  return NextResponse.json({ practice });
}

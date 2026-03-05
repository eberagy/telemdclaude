import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["Clinician", "Staff"]),
});

// GET /api/owner/team — list all practice members
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const owner = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, role: "PracticeOwner", isActive: true },
    });
    if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const members = await prisma.practiceMember.findMany({
      where: { practiceId: owner.practiceId, isActive: true },
      include: {
        clinician: {
          select: {
            id: true,
            seatStatus: true,
            specialty: true,
            npi: true,
            licensedStates: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { lastName: "asc" }],
    });

    return NextResponse.json({ members });
  } catch (err) {
    console.error("[owner/team GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/owner/team — invite a new member to the practice
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const owner = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, role: "PracticeOwner", isActive: true },
    });
    if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { email, role } = parsed.data;

    const existing = await prisma.practiceMember.findFirst({
      where: { practiceId: owner.practiceId, email, isActive: true },
    });
    if (existing) {
      return NextResponse.json({ error: "This email is already a member of the practice" }, { status: 409 });
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invite = await prisma.practiceInvite.create({
      data: { practiceId: owner.practiceId, email, role, expiresAt },
    });

    await writeAuditLog({
      practiceId: owner.practiceId,
      clerkUserId: userId,
      memberId: owner.id,
      eventType: "INVITE_SENT",
      resourceType: "PracticeInvite",
      resourceId: invite.id,
    });

    // TODO: send invite email via Postmark with invite.token

    return NextResponse.json({ invite: { id: invite.id, email, role, expiresAt } }, { status: 201 });
  } catch (err) {
    console.error("[owner/team POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

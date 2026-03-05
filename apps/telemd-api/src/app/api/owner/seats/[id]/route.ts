import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

// POST /api/owner/seats/[id] — activate or deactivate a clinician seat
// [id] is the ClinicianProfile id
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const owner = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, role: "PracticeOwner", isActive: true },
    });
    if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const action: "activate" | "deactivate" = body.action;
    if (!["activate", "deactivate"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const clinician = await prisma.clinicianProfile.findUnique({
      where: { id: params.id },
      include: { member: { select: { practiceId: true } } },
    });

    if (!clinician || clinician.member.practiceId !== owner.practiceId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const newStatus = action === "activate" ? "ACTIVE" : "INACTIVE";
    const updated = await prisma.clinicianProfile.update({
      where: { id: params.id },
      data: {
        seatStatus: newStatus,
        ...(action === "activate"
          ? { seatActivatedAt: new Date(), seatDeactivatedAt: null }
          : { seatDeactivatedAt: new Date() }),
      },
    });

    await writeAuditLog({
      practiceId: owner.practiceId,
      clerkUserId: userId,
      memberId: owner.id,
      eventType: action === "activate" ? "SEAT_ACTIVATED" : "SEAT_DEACTIVATED",
      resourceType: "ClinicianProfile",
      resourceId: params.id,
    });

    return NextResponse.json({ seatStatus: updated.seatStatus });
  } catch (err) {
    console.error("[owner/seats/[id] POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

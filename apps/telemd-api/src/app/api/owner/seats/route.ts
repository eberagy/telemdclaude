import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET /api/owner/seats — list all clinician seats for the practice
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const owner = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, role: "PracticeOwner", isActive: true },
    });
    if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const clinicians = await prisma.practiceMember.findMany({
      where: { practiceId: owner.practiceId, role: "Clinician", isActive: true },
      include: {
        clinician: {
          select: {
            id: true,
            seatStatus: true,
            stripeSubscriptionId: true,
            seatActivatedAt: true,
            seatDeactivatedAt: true,
            specialty: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const seats = clinicians.map((m) => ({
      id: m.clinician?.id ?? m.id,
      memberId: m.id,
      member: { firstName: m.firstName, lastName: m.lastName, email: m.email },
      seatStatus: m.clinician?.seatStatus ?? "PENDING",
      stripeSubscriptionId: m.clinician?.stripeSubscriptionId,
      seatActivatedAt: m.clinician?.seatActivatedAt,
      seatDeactivatedAt: m.clinician?.seatDeactivatedAt,
      specialty: m.clinician?.specialty,
    }));

    return NextResponse.json({ seats });
  } catch (err) {
    console.error("[owner/seats GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

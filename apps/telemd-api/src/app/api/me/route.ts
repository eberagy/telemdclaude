import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET /api/me — Get current user's practice membership and role
export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const member = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, isActive: true },
      include: {
        practice: { select: { id: true, name: true, slug: true } },
        clinician: { select: { id: true, seatStatus: true, specialty: true } },
      },
    });

    const patient = await prisma.patientProfile.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
        employerGroupId: true,
        employerGroup: { select: { name: true, discountPercent: true, coveredVisitsCap: true } },
      },
    });

    return NextResponse.json({
      userId,
      role: member?.role ?? (patient ? "Patient" : null),
      practiceId: member?.practiceId ?? null,
      practice: member?.practice ?? null,
      clinicianId: member?.clinician?.id ?? null,
      seatStatus: member?.clinician?.seatStatus ?? null,
      patientId: patient?.id ?? null,
      employerGroup: patient?.employerGroup ?? null,
    });
  } catch (err) {
    console.error("[me]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

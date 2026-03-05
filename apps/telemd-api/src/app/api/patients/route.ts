import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET /api/patients — list patients seen by this practice/clinician (PHI-gated)
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const member = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, isActive: true, role: { in: ["Clinician", "PracticeOwner"] } },
    });
    if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";

    let patientIds: string[];

    if (member.role === "Clinician") {
      const clinician = await prisma.clinicianProfile.findFirst({
        where: { memberId: member.id },
        select: { id: true },
      });
      if (!clinician) return NextResponse.json({ patients: [] });

      const appts = await prisma.appointment.findMany({
        where: { clinicianId: clinician.id },
        select: { patientId: true },
        distinct: ["patientId"],
      });
      patientIds = appts.map((a) => a.patientId);
    } else {
      const appts = await prisma.appointment.findMany({
        where: { practiceId: member.practiceId },
        select: { patientId: true },
        distinct: ["patientId"],
      });
      patientIds = appts.map((a) => a.patientId);
    }

    const patients = await prisma.patientProfile.findMany({
      where: {
        id: { in: patientIds },
        isActive: true,
        ...(search ? { email: { contains: search, mode: "insensitive" } } : {}),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        state: true,
        createdAt: true,
        _count: { select: { appointments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ patients });
  } catch (err) {
    console.error("[patients GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

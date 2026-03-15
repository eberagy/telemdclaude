import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const JoinSchema = z.object({ code: z.string().min(1) });

// POST /api/employer-groups/join — patient enters employer code to enroll
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const parsed = JoinSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "code required" }, { status: 400 });

    const group = await prisma.employerGroup.findUnique({
      where: { code: parsed.data.code.toUpperCase() },
      select: { id: true, name: true, isActive: true, practiceId: true, discountPercent: true, coveredVisitsCap: true },
    });

    if (!group || !group.isActive) {
      return NextResponse.json({ error: "Invalid or inactive employer code." }, { status: 404 });
    }

    const patient = await prisma.patientProfile.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });

    if (!patient) return NextResponse.json({ error: "Patient profile not found." }, { status: 404 });

    await prisma.patientProfile.update({
      where: { id: patient.id },
      data: { employerGroupId: group.id },
    });

    return NextResponse.json({
      success: true,
      group: { name: group.name, discountPercent: group.discountPercent, coveredVisitsCap: group.coveredVisitsCap },
    });
  } catch (err) {
    console.error("[employer-groups/join POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireMember, AuthorizationError } from "@/lib/rbac";

// GET /api/notes?practiceId=... — list all signed/draft notes for the clinician's appointments
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const practiceId = searchParams.get("practiceId");
    if (!practiceId) {
      return NextResponse.json({ error: "practiceId required" }, { status: 400 });
    }

    const member = await requireMember(userId, practiceId, ["Clinician", "PracticeOwner"]);

    // For clinicians: only their own notes. Owners see all.
    const clinicianFilter =
      member.role === "Clinician"
        ? { clinicianId: member.id }
        : {};

    const notes = await prisma.clinicianNote.findMany({
      where: {
        ...clinicianFilter,
        appointment: { practiceId },
      },
      select: {
        id: true,
        status: true,
        signedAt: true,
        createdAt: true,
        updatedAt: true,
        appointment: {
          select: {
            id: true,
            slotStart: true,
            appointmentType: { select: { name: true } },
            patient: { select: { email: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ notes });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[notes list GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

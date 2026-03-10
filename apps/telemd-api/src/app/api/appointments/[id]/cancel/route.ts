import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, getClientIP } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/appointments/[id]/cancel — Patient-side appointment cancellation
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Patient-only endpoint
    const patientProfile = await prisma.patientProfile.findUnique({
      where: { clerkUserId: userId },
    });

    if (!patientProfile) {
      return NextResponse.json({ error: "Forbidden: patient access only" }, { status: 403 });
    }

    const appt = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Verify appointment belongs to this patient
    if (appt.patientId !== patientProfile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Appointment must be more than 2 hours away
    const hoursUntilAppt =
      (appt.slotStart.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilAppt <= 2) {
      return NextResponse.json(
        { error: "Appointment must be cancelled at least 2 hours in advance." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({})) as { reason?: string };

    await prisma.appointment.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancellationReason: body.reason,
      },
    });

    await writeAuditLog({
      practiceId: appt.practiceId,
      clerkUserId: userId,
      eventType: "VIEW_PATIENT_RECORD",
      resourceId: id,
      resourceType: "appointment",
      ipAddress: getClientIP(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
      metadata: { action: "patient_cancel" },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[appointments/:id/cancel POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

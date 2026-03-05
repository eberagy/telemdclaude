import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { generateZoomSessionToken } from "@/services/zoom";
import { requireActiveSeat, AuthorizationError } from "@/lib/rbac";
import { writeAuditLog, getClientIP } from "@/lib/audit";
import { isWithinJoinWindow } from "@telemd/shared";

// POST /api/zoom/session — Get Zoom session token for a visit
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { appointmentId } = await req.json();

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        clinician: {
          include: {
            member: { select: { clerkUserId: true } },
          },
        },
        patient: { select: { clerkUserId: true } },
        practice: { select: { id: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const isClinicianUser =
      appointment.clinician.member.clerkUserId === userId;
    const isPatientUser = appointment.patient.clerkUserId === userId;

    if (!isClinicianUser && !isPatientUser) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check appointment status — must be CONFIRMED or INTAKE_COMPLETED
    if (
      !["CONFIRMED", "INTAKE_PENDING", "INTAKE_COMPLETED", "IN_PROGRESS"].includes(
        appointment.status
      )
    ) {
      return NextResponse.json(
        { error: "Appointment is not in a joinable state." },
        { status: 400 }
      );
    }

    // Join window: patient can join 10 min before start
    if (!isWithinJoinWindow(appointment.slotStart)) {
      return NextResponse.json(
        {
          error: `Visit opens 10 minutes before your scheduled time at ${appointment.slotStart.toISOString()}.`,
        },
        { status: 400 }
      );
    }

    // Clinician: verify active seat
    if (isClinicianUser) {
      await requireActiveSeat(appointment.clinicianId);
    }

    const role = isClinicianUser ? "host" : "participant";
    const tokenData = await generateZoomSessionToken(
      appointmentId,
      userId,
      role
    );

    // Audit log
    await writeAuditLog({
      practiceId: appointment.practice.id,
      clerkUserId: userId,
      eventType: isClinicianUser ? "START_VISIT" : "JOIN_VISIT",
      resourceId: appointmentId,
      resourceType: "appointment",
      ipAddress: getClientIP(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json(tokenData);
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[zoom/session]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requirePHIAccess, AuthorizationError } from "@/lib/rbac";
import { writeAuditLog, getClientIP } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/appointments/[id] — Get full appointment details (with PHI guard)
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Find appointment first to get practiceId
    const appt = await prisma.appointment.findUnique({
      where: { id },
      select: { practiceId: true, patientId: true, clinicianId: true },
    });

    if (!appt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check if requester is the patient themselves
    const patient = await prisma.patientProfile.findUnique({
      where: { clerkUserId: userId },
    });

    let isPatient = false;
    if (patient?.id === appt.patientId) {
      isPatient = true;
    }

    let isClinicalUser = false;
    if (!isPatient) {
      // Must be a practice member with PHI access
      const { member } = await requirePHIAccess(appt.practiceId, id);
      isClinicalUser = member.role === "Clinician" || member.role === "PracticeOwner" || member.role === "PlatformAdmin";
    }

    // Full appointment with PHI
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        appointmentType: true,
        clinician: {
          include: { member: { select: { firstName: true, lastName: true, email: true } } },
        },
        patient: {
          select: {
            id: true,
            email: true,
            phone: isPatient || isClinicalUser ? true : false,
            dateOfBirth: isPatient || isClinicalUser ? true : false,
          },
        },
        soapSummary: isClinicalUser ? true : false,
        clinicianNote: isClinicalUser ? { select: { id: true, status: true, signedAt: true } } : false,
        practice: { select: { name: true, slug: true, timezone: true } },
      },
    });

    // For staff: remove clinical fields
    const role = (await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, practiceId: appt.practiceId },
      select: { role: true },
    }))?.role;

    if (role === "Staff") {
      // Staff sees logistics only — no clinical note, no SOAP, no transcript
      const staffView = {
        ...appointment,
        soapSummary: undefined,
        clinicianNote: undefined,
        transcriptRaw: undefined,
      };
      return NextResponse.json({ appointment: staffView });
    }

    // Audit: view patient record
    await writeAuditLog({
      practiceId: appt.practiceId,
      clerkUserId: userId,
      eventType: "VIEW_PATIENT_RECORD",
      resourceId: id,
      resourceType: "appointment",
      ipAddress: getClientIP(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({ appointment });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[appointments/:id GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/appointments/[id] — Cancel or reschedule
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { action, reason, newSlotStart } = body;

    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: { practice: true, appointmentType: true },
    });

    if (!appt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check policy window
    const now = new Date();
    const hoursUntilAppt =
      (appt.slotStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (action === "cancel") {
      if (hoursUntilAppt < appt.practice.cancelWindowHours) {
        return NextResponse.json(
          {
            error: `Cancellation must be at least ${appt.practice.cancelWindowHours} hours in advance.`,
          },
          { status: 400 }
        );
      }

      await prisma.appointment.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledBy: userId,
          cancellationReason: reason,
        },
      });

      return NextResponse.json({ success: true, action: "cancelled" });
    }

    if (action === "reschedule" && newSlotStart) {
      if (hoursUntilAppt < appt.practice.rescheduleWindowHours) {
        return NextResponse.json(
          {
            error: `Rescheduling must be at least ${appt.practice.rescheduleWindowHours} hours in advance.`,
          },
          { status: 400 }
        );
      }

      const newStart = new Date(newSlotStart);
      const newEnd = new Date(
        newStart.getTime() + appt.appointmentType.durationMinutes * 60 * 1000
      );

      await prisma.$transaction(async (tx) => {
        // Mark old as rescheduled
        await tx.appointment.update({
          where: { id },
          data: { status: "RESCHEDULED" },
        });

        // Create new appointment (payment carries over)
        return tx.appointment.create({
          data: {
            practiceId: appt.practiceId,
            clinicianId: appt.clinicianId,
            patientId: appt.patientId,
            appointmentTypeId: appt.appointmentTypeId,
            status: "CONFIRMED",
            slotStart: newStart,
            slotEnd: newEnd,
            paAttestationAt: appt.paAttestationAt,
            amountPaidCents: appt.amountPaidCents,
            stripePaymentIntentId: appt.stripePaymentIntentId,
            rescheduledFromId: id,
          },
        });
      });

      return NextResponse.json({ success: true, action: "rescheduled" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[appointments/:id PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

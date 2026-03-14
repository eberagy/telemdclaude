// POST /api/appointments/[id]/reschedule — Move an appointment to a new slot.
// Auth: patient who owns it OR any active practice member (clinician/owner).
// Moves the existing appointment in-place (preserves payment, status=CONFIRMED/INTAKE_PENDING).
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, getClientIP } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const RescheduleSchema = z.object({
  newSlotStart: z.string().datetime(),
  newSlotEnd: z.string().datetime(),
});

const RESCHEDULABLE: string[] = ["CONFIRMED", "INTAKE_PENDING"];

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const appt = await prisma.appointment.findUnique({ where: { id } });
    if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Auth: patient owner OR active practice member
    const patientProfile = await prisma.patientProfile.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });

    if (patientProfile) {
      if (appt.patientId !== patientProfile.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      const member = await prisma.practiceMember.findFirst({
        where: { clerkUserId: userId, practiceId: appt.practiceId, isActive: true },
        select: { id: true },
      });
      if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!RESCHEDULABLE.includes(appt.status)) {
      return NextResponse.json(
        { error: `Only ${RESCHEDULABLE.join(" or ")} appointments can be rescheduled.` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = RescheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "newSlotStart and newSlotEnd (ISO datetime strings) are required." },
        { status: 400 }
      );
    }

    const newStart = new Date(parsed.data.newSlotStart);
    const newEnd = new Date(parsed.data.newSlotEnd);

    if (newStart <= new Date()) {
      return NextResponse.json({ error: "New slot must be in the future." }, { status: 400 });
    }
    if (newEnd <= newStart) {
      return NextResponse.json({ error: "newSlotEnd must be after newSlotStart." }, { status: 400 });
    }

    // Check for clinician conflict on the new slot (excluding this appointment)
    const conflict = await prisma.appointment.findFirst({
      where: {
        clinicianId: appt.clinicianId,
        slotStart: newStart,
        id: { not: id },
        status: { notIn: ["CANCELLED", "RESCHEDULED"] },
      },
      select: { id: true },
    });
    if (conflict) {
      return NextResponse.json({ error: "That slot is no longer available." }, { status: 409 });
    }

    // Check active SlotLock on new slot
    const slotLock = await prisma.slotLock.findUnique({
      where: { clinicianId_slotStart: { clinicianId: appt.clinicianId, slotStart: newStart } },
      select: { expiresAt: true },
    });
    if (slotLock && slotLock.expiresAt > new Date()) {
      return NextResponse.json(
        { error: "Slot is currently held by another booking." },
        { status: 409 }
      );
    }

    // Move appointment in-place and release old SlotLock
    const [updated] = await prisma.$transaction([
      prisma.appointment.update({
        where: { id },
        data: { slotStart: newStart, slotEnd: newEnd, rescheduledFromId: id },
      }),
      prisma.slotLock.deleteMany({
        where: { clinicianId: appt.clinicianId, slotStart: appt.slotStart },
      }),
    ]);

    await writeAuditLog({
      practiceId: appt.practiceId,
      clerkUserId: userId,
      eventType: "EDIT_NOTE",
      resourceId: id,
      resourceType: "appointment",
      ipAddress: getClientIP(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
      metadata: {
        action: "reschedule",
        previousSlotStart: appt.slotStart.toISOString(),
        newSlotStart: newStart.toISOString(),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[appointments/:id/reschedule POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

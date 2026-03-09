import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/availability?practiceSlug=demo&appointmentTypeId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const practiceSlug = searchParams.get("practiceSlug");
    const appointmentTypeId = searchParams.get("appointmentTypeId");
    const dateStr = searchParams.get("date"); // "YYYY-MM-DD" optional

    if (!practiceSlug || !appointmentTypeId) {
      return NextResponse.json(
        { error: "practiceSlug and appointmentTypeId are required" },
        { status: 400 }
      );
    }

    const practice = await prisma.practice.findUnique({
      where: { slug: practiceSlug },
    });

    if (!practice) {
      return NextResponse.json({ error: "Practice not found" }, { status: 404 });
    }

    const apptType = await prisma.appointmentType.findFirst({
      where: { id: appointmentTypeId, practiceId: practice.id, isActive: true },
    });

    if (!apptType) {
      return NextResponse.json({ error: "Appointment type not found" }, { status: 404 });
    }

    // Get all active, PA-licensed, active-seat clinicians for this practice
    const clinicians = await prisma.practiceMember.findMany({
      where: {
        practiceId: practice.id,
        role: "Clinician",
        isActive: true,
        clinician: {
          seatStatus: "ACTIVE",
          licensedStates: { has: "PA" },
        },
      },
      include: {
        clinician: {
          include: {
            availabilityBlocks: true,
            dateOverrides: true,
          },
        },
      },
    });

    // Generate slots for next 14 days
    // NOTE: availability block times ("09:00") are interpreted in server-local time.
    // For production, these should be interpreted in practice.timezone using a tz library.
    const targetDate = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const windowEnd = new Date(targetDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    const now = new Date();

    const clinicianIds = clinicians
      .map((m) => m.clinician?.id)
      .filter((id): id is string => !!id);

    // Batch fetch: all booked slots for all clinicians in one query (avoid N+1)
    const [bookedAppointments, activeLocks] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          clinicianId: { in: clinicianIds },
          slotStart: { gte: targetDate, lte: windowEnd },
          status: { notIn: ["CANCELLED", "RESCHEDULED", "PAYMENT_FAILED"] },
        },
        select: { clinicianId: true, slotStart: true },
      }),
      prisma.slotLock.findMany({
        where: {
          clinicianId: { in: clinicianIds },
          slotStart: { gte: targetDate, lte: windowEnd },
          expiresAt: { gt: now },
        },
        select: { clinicianId: true, slotStart: true },
      }),
    ]);

    // Build per-clinician unavailable sets (booked + locked)
    const unavailableByClinicianId = new Map<string, Set<string>>();
    for (const { clinicianId, slotStart } of [...bookedAppointments, ...activeLocks]) {
      if (!unavailableByClinicianId.has(clinicianId)) {
        unavailableByClinicianId.set(clinicianId, new Set());
      }
      unavailableByClinicianId.get(clinicianId)!.add(slotStart.toISOString());
    }

    const slots: Record<
      string,
      { clinicianId: string; clinicianName: string; specialty?: string; slots: string[] }
    > = {};

    for (const member of clinicians) {
      if (!member.clinician) continue;

      const clinicianSlots: string[] = [];
      const clinicianId = member.clinician.id;
      const unavailable = unavailableByClinicianId.get(clinicianId) ?? new Set<string>();

      for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
        const date = new Date(targetDate);
        date.setDate(date.getDate() + dayOffset);
        const dayOfWeek = date.getDay();
        const dateKey = date.toISOString().split("T")[0];

        // Check for date override
        const override = member.clinician.dateOverrides.find(
          (o) => o.date === dateKey
        );

        if (override && !override.available) continue; // Blocked day

        let startTime: string | null = null;
        let endTime: string | null = null;

        if (override?.available && override.startTime && override.endTime) {
          startTime = override.startTime;
          endTime = override.endTime;
        } else {
          const block = member.clinician.availabilityBlocks.find(
            (b) => b.dayOfWeek === dayOfWeek
          );
          if (!block) continue;
          startTime = block.startTime;
          endTime = block.endTime;
        }

        // Generate slots within availability window
        const [startH, startM] = startTime.split(":").map(Number);
        const [endH, endM] = endTime!.split(":").map(Number);

        const slotWindowStart = new Date(date);
        slotWindowStart.setHours(startH, startM, 0, 0);
        const slotWindowEnd = new Date(date);
        slotWindowEnd.setHours(endH, endM, 0, 0);

        const slotDurationMs =
          (apptType.durationMinutes + member.clinician.bufferMinutes) * 60 * 1000;
        const apptDurationMs = apptType.durationMinutes * 60 * 1000;

        let slotTime = slotWindowStart;
        while (slotTime.getTime() + apptDurationMs <= slotWindowEnd.getTime()) {
          const iso = slotTime.toISOString();
          // Skip past slots and unavailable (booked + locked) slots
          if (slotTime > now && !unavailable.has(iso)) {
            clinicianSlots.push(iso);
          }
          slotTime = new Date(slotTime.getTime() + slotDurationMs);
        }
      }

      if (clinicianSlots.length > 0) {
        slots[clinicianId] = {
          clinicianId,
          clinicianName: `Dr. ${member.firstName} ${member.lastName}`,
          specialty: member.clinician.specialty ?? undefined,
          slots: clinicianSlots,
        };
      }
    }

    return NextResponse.json({
      clinicianSlots: Object.values(slots),
    });
  } catch (err) {
    console.error("[availability]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

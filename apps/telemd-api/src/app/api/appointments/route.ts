import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMember, requirePALicensure, AuthorizationError } from "@/lib/rbac";
import { writeAuditLog, getClientIP } from "@/lib/audit";
import { BookingRequestSchema } from "@telemd/shared";

// POST /api/appointments — Book an appointment (patient)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = BookingRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { appointmentTypeId, clinicianId, slotStart, practiceSlug, patientNotes, paAttestation } =
      parsed.data;

    // Lookup practice
    const practice = await prisma.practice.findUnique({
      where: { slug: practiceSlug },
    });
    if (!practice) {
      return NextResponse.json({ error: "Practice not found" }, { status: 404 });
    }

    // PA gating: service state must be PA
    if (practice.serviceState !== "PA") {
      return NextResponse.json(
        { error: "This practice does not serve your state." },
        { status: 400 }
      );
    }

    // PA attestation must be true
    if (!paAttestation) {
      return NextResponse.json(
        { error: "PA location attestation is required." },
        { status: 400 }
      );
    }

    // Clinician PA licensure + seat check
    await requirePALicensure(clinicianId);

    // Get appointment type
    const apptType = await prisma.appointmentType.findFirst({
      where: { id: appointmentTypeId, practiceId: practice.id, isActive: true },
    });
    if (!apptType) {
      return NextResponse.json(
        { error: "Appointment type not found" },
        { status: 404 }
      );
    }

    // Get patient profile
    const patient = await prisma.patientProfile.findUnique({
      where: { clerkUserId: userId },
    });
    if (!patient) {
      return NextResponse.json(
        { error: "Patient profile not found. Please complete your profile." },
        { status: 404 }
      );
    }

    const slotStartDate = new Date(slotStart);
    const slotEndDate = new Date(
      slotStartDate.getTime() + apptType.durationMinutes * 60 * 1000
    );

    // Slot locking transaction + booking creation
    const appointment = await prisma.$transaction(async (tx) => {
      // Acquire slot lock (expires in 10 minutes for checkout)
      const lockExpiry = new Date(Date.now() + 10 * 60 * 1000);

      // Check for existing appointment at this slot (double-booking guard)
      const existing = await tx.appointment.findFirst({
        where: {
          clinicianId,
          slotStart: slotStartDate,
          status: {
            notIn: ["CANCELLED", "RESCHEDULED", "PAYMENT_FAILED"],
          },
        },
      });

      if (existing) {
        throw new Error("SLOT_TAKEN");
      }

      // Acquire lock
      await tx.slotLock.upsert({
        where: { clinicianId_slotStart: { clinicianId, slotStart: slotStartDate } },
        update: { expiresAt: lockExpiry, lockedBy: userId },
        create: {
          clinicianId,
          slotStart: slotStartDate,
          lockedBy: userId,
          expiresAt: lockExpiry,
        },
      });

      // Create appointment in PENDING_PAYMENT state
      return tx.appointment.create({
        data: {
          practiceId: practice.id,
          clinicianId,
          patientId: patient.id,
          appointmentTypeId,
          status: "PENDING_PAYMENT",
          slotStart: slotStartDate,
          slotEnd: slotEndDate,
          paAttestationAt: new Date(),
          patientNotes: patientNotes,
          amountPaidCents: 0,
        },
      });
    });

    // Audit: patient attestation
    await writeAuditLog({
      practiceId: practice.id,
      clerkUserId: userId,
      eventType: "PATIENT_ATTESTATION",
      resourceId: appointment.id,
      resourceType: "appointment",
      ipAddress: getClientIP(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
      metadata: { practiceSlug, appointmentTypeId, clinicianId },
    });

    return NextResponse.json({ appointmentId: appointment.id }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "SLOT_TAKEN") {
      return NextResponse.json(
        { error: "This time slot is no longer available." },
        { status: 409 }
      );
    }
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[appointments POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/appointments — List appointments for authenticated user
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const practiceId = searchParams.get("practiceId");
    const role = searchParams.get("role");

    if (role === "patient") {
      const patient = await prisma.patientProfile.findUnique({
        where: { clerkUserId: userId },
      });
      if (!patient) return NextResponse.json({ appointments: [] });

      const appointments = await prisma.appointment.findMany({
        where: { patientId: patient.id },
        include: {
          appointmentType: { select: { name: true, durationMinutes: true, priceInCents: true } },
          clinician: {
            include: {
              member: { select: { firstName: true, lastName: true } },
            },
          },
          practice: { select: { name: true, slug: true } },
        },
        orderBy: { slotStart: "desc" },
      });

      return NextResponse.json({ appointments });
    }

    if (role === "clinician" && practiceId) {
      const member = await prisma.practiceMember.findFirst({
        where: { clerkUserId: userId, practiceId, role: "Clinician" },
        include: { clinician: true },
      });

      if (!member?.clinician) {
        return NextResponse.json({ error: "Clinician not found" }, { status: 404 });
      }

      const appointments = await prisma.appointment.findMany({
        where: { clinicianId: member.clinician.id, practiceId },
        include: {
          appointmentType: { select: { name: true, durationMinutes: true } },
          patient: { select: { id: true, email: true } },
        },
        orderBy: { slotStart: "asc" },
      });

      return NextResponse.json({ appointments });
    }

    // Owner: all appointments for their practice
    if (role === "owner") {
      const owner = await prisma.practiceMember.findFirst({
        where: { clerkUserId: userId, role: "PracticeOwner", isActive: true },
      });
      if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const limit = parseInt(searchParams.get("limit") ?? "200");
      const appointments = await prisma.appointment.findMany({
        where: { practiceId: owner.practiceId },
        include: {
          appointmentType: { select: { name: true, durationMinutes: true } },
          patient: { select: { id: true, email: true, phone: true } },
          clinician: { include: { member: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { slotStart: "desc" },
        take: limit,
      });
      return NextResponse.json({ appointments });
    }

    // Staff: scheduling-only view (no clinical fields), scoped to their practice
    if (role === "staff") {
      const staff = await prisma.practiceMember.findFirst({
        where: { clerkUserId: userId, role: "Staff", isActive: true },
      });
      if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const limit = parseInt(searchParams.get("limit") ?? "200");
      const appointments = await prisma.appointment.findMany({
        where: { practiceId: staff.practiceId },
        select: {
          id: true,
          status: true,
          slotStart: true,
          slotEnd: true,
          practiceId: true,
          appointmentType: { select: { name: true, durationMinutes: true } },
          // Only minimal patient info for scheduling — no PHI notes/transcripts
          patient: { select: { id: true, email: true, phone: true } },
        },
        orderBy: { slotStart: "asc" },
        take: limit,
      });
      return NextResponse.json({ appointments });
    }

    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  } catch (err) {
    console.error("[appointments GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

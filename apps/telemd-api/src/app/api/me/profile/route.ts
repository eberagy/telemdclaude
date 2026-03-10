/**
 * GET  /api/me/profile — Return patient's own editable profile fields
 * PATCH /api/me/profile — Patient updates phone and dateOfBirth
 * Only phone and dateOfBirth are editable; email is Clerk-managed.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const UpdateSchema = z.object({
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number")
    .optional()
    .nullable(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
    .optional()
    .nullable(),
});

/** Look up a practiceId associated with this patient (for audit log FK). */
async function getPatientPracticeId(patientId: string): Promise<string | null> {
  const appt = await prisma.appointment.findFirst({
    where: { patientId },
    select: { practiceId: true },
    orderBy: { createdAt: "desc" },
  });
  return appt?.practiceId ?? null;
}

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const patient = await prisma.patientProfile.findUnique({
      where: { clerkUserId: userId },
      select: { id: true, email: true, phone: true, dateOfBirth: true, state: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });
    }

    const practiceId = await getPatientPracticeId(patient.id);
    if (practiceId) {
      await writeAuditLog({
        practiceId,
        clerkUserId: userId,
        eventType: "VIEW_PATIENT_RECORD",
        resourceType: "PatientProfile",
        resourceId: patient.id,
      });
    }

    return NextResponse.json({ profile: patient });
  } catch (err) {
    console.error("[me/profile GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const patient = await prisma.patientProfile.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });
    }

    const updated = await prisma.patientProfile.update({
      where: { clerkUserId: userId },
      data: {
        ...(parsed.data.phone !== undefined && { phone: parsed.data.phone }),
        ...(parsed.data.dateOfBirth !== undefined && { dateOfBirth: parsed.data.dateOfBirth }),
      },
      select: { id: true, email: true, phone: true, dateOfBirth: true, state: true },
    });

    const practiceId = await getPatientPracticeId(patient.id);
    if (practiceId) {
      await writeAuditLog({
        practiceId,
        clerkUserId: userId,
        eventType: "PROFILE_UPDATE",
        resourceType: "PatientProfile",
        resourceId: patient.id,
      });
    }

    return NextResponse.json({ profile: updated });
  } catch (err) {
    console.error("[me/profile PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

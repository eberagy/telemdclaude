import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const VITAL_UNITS: Record<string, string> = {
  BP_SYSTOLIC: "mmHg",
  BP_DIASTOLIC: "mmHg",
  WEIGHT_LB: "lbs",
  BLOOD_GLUCOSE_MGDL: "mg/dL",
  MOOD_SCORE: "/10",
  O2_SAT_PERCENT: "%",
  HEART_RATE_BPM: "bpm",
};

const VitalSchema = z.object({
  type: z.enum([
    "BP_SYSTOLIC",
    "BP_DIASTOLIC",
    "WEIGHT_LB",
    "BLOOD_GLUCOSE_MGDL",
    "MOOD_SCORE",
    "O2_SAT_PERCENT",
    "HEART_RATE_BPM",
  ]),
  value: z.number().positive(),
  notes: z.string().max(200).optional(),
  recordedAt: z.string().datetime().optional(),
  practiceId: z.string(),
});

// GET /api/vitals?practiceId=... — patient's own vitals
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const practiceId = req.nextUrl.searchParams.get("practiceId");
    const type = req.nextUrl.searchParams.get("type");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "30");

    const patient = await prisma.patientProfile.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });

    if (!patient) return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });

    const vitals = await prisma.patientVital.findMany({
      where: {
        patientId: patient.id,
        ...(practiceId ? { practiceId } : {}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(type ? { type: type as any } : {}),
      },
      orderBy: { recordedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ vitals });
  } catch (err) {
    console.error("[vitals GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/vitals — patient logs a new vital
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const parsed = VitalSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const patient = await prisma.patientProfile.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });
    if (!patient) return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });

    const { type, value, notes, recordedAt, practiceId } = parsed.data;
    const vital = await prisma.patientVital.create({
      data: {
        patientId: patient.id,
        practiceId,
        type,
        value,
        unit: VITAL_UNITS[type],
        notes,
        recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
      },
    });

    return NextResponse.json({ vital }, { status: 201 });
  } catch (err) {
    console.error("[vitals POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

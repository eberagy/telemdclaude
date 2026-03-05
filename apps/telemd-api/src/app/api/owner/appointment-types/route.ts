import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const AppointmentTypeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  durationMinutes: z.number().int().min(15).max(180),
  priceInCents: z.number().int().min(0),
  isActive: z.boolean().optional().default(true),
  intakeTemplateId: z.string().optional().nullable(),
});

// GET /api/owner/appointment-types
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const owner = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, role: "PracticeOwner", isActive: true },
    });
    if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const types = await prisma.appointmentType.findMany({
      where: { practiceId: owner.practiceId },
      include: { intakeTemplate: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ appointmentTypes: types });
  } catch (err) {
    console.error("[owner/appointment-types GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/owner/appointment-types
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const owner = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, role: "PracticeOwner", isActive: true },
    });
    if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const parsed = AppointmentTypeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const type = await prisma.appointmentType.create({
      data: { ...parsed.data, practiceId: owner.practiceId },
    });

    return NextResponse.json({ appointmentType: type }, { status: 201 });
  } catch (err) {
    console.error("[owner/appointment-types POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

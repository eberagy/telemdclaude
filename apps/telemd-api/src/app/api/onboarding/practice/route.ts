import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Schema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  timezone: z.string().default("America/New_York"),
});

// POST /api/onboarding/practice — create a new practice and make the caller its owner
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, slug, timezone } = parsed.data;

    // Check slug uniqueness
    const existing = await prisma.practice.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "This URL slug is already taken. Please choose another." }, { status: 409 });
    }

    // Get caller's Clerk email
    const existingMember = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, isActive: true },
    });

    // Create practice
    const practice = await prisma.practice.create({
      data: { name, slug, timezone, serviceState: "PA" },
    });

    // Create owner member record
    await prisma.practiceMember.create({
      data: {
        practiceId: practice.id,
        clerkUserId: userId,
        role: "PracticeOwner",
        email: existingMember?.email ?? `user-${userId}@telemd.internal`,
        firstName: existingMember?.firstName ?? "",
        lastName: existingMember?.lastName ?? "",
        isActive: true,
      },
    });

    // Create a default appointment type
    await prisma.appointmentType.create({
      data: {
        practiceId: practice.id,
        name: "Initial Consultation",
        description: "30-minute telehealth consultation",
        durationMinutes: 30,
        priceInCents: 15000, // $150
        isActive: true,
      },
    });

    return NextResponse.json({ practiceId: practice.id, slug: practice.slug }, { status: 201 });
  } catch (err) {
    console.error("[onboarding/practice POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

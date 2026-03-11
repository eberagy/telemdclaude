import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const UpdateSchema = z.object({
  emailReminders: z.boolean().optional(),
  smsReminders: z.boolean().optional(),
});

// GET /api/me/notifications — return notification preferences (creates defaults on first access)
export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const prefs = await prisma.patientNotificationPreferences.upsert({
      where: { clerkUserId: userId },
      create: { clerkUserId: userId },
      update: {},
    });

    return NextResponse.json({ prefs });
  } catch (err) {
    console.error("[me/notifications GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/me/notifications — update notification preferences
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

    const prefs = await prisma.patientNotificationPreferences.upsert({
      where: { clerkUserId: userId },
      create: { clerkUserId: userId, ...parsed.data },
      update: parsed.data,
    });

    return NextResponse.json({ prefs });
  } catch (err) {
    console.error("[me/notifications PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

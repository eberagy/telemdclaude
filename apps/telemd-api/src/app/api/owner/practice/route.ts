import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const UpdatePracticeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().optional().nullable(),
  timezone: z.string().optional(),
  cancelWindowHours: z.number().int().min(0).max(168).optional(),
  rescheduleWindowHours: z.number().int().min(0).max(168).optional(),
  afterVisitSummaryVisible: z.boolean().optional(),
  intakeFieldMinimization: z.boolean().optional(),
  emergencyDisclaimerText: z.string().max(500).optional(),
  messagingDisclaimerText: z.string().max(500).optional(),
  patientAttestationText: z.string().max(500).optional(),
  cancelPolicyText: z.string().max(500).optional(),
  reschedulePolicyText: z.string().max(500).optional(),
});

// GET /api/owner/practice — get practice settings
export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const owner = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, role: "PracticeOwner", isActive: true },
    });
    if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const practice = await prisma.practice.findUnique({
      where: { id: owner.practiceId },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        timezone: true,
        serviceState: true,
        cancelWindowHours: true,
        rescheduleWindowHours: true,
        afterVisitSummaryVisible: true,
        intakeFieldMinimization: true,
        emergencyDisclaimerText: true,
        messagingDisclaimerText: true,
        patientAttestationText: true,
        cancelPolicyText: true,
        reschedulePolicyText: true,
        stripeAccountId: true,
      },
    });

    return NextResponse.json({ practice });
  } catch (err) {
    console.error("[owner/practice GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/owner/practice — update practice settings
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const owner = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, role: "PracticeOwner", isActive: true },
    });
    if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const parsed = UpdatePracticeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const practice = await prisma.practice.update({
      where: { id: owner.practiceId },
      data: parsed.data,
    });

    await writeAuditLog({
      practiceId: owner.practiceId,
      clerkUserId: userId,
      memberId: owner.id,
      eventType: "EDIT_NOTE",
      resourceType: "Practice",
      resourceId: owner.practiceId,
    });

    return NextResponse.json({ practice });
  } catch (err) {
    console.error("[owner/practice PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { AuthorizationError } from "@/lib/rbac";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/appointments/[id]/refund — issue a Stripe refund (PracticeOwner or Clinician only)
export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Fetch appointment first to get practiceId
    const appt = await prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        practiceId: true,
        status: true,
        stripePaymentIntentId: true,
        refundedAt: true,
      },
    });

    if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Auth: PracticeOwner or Clinician in this practice
    const member = await prisma.practiceMember.findFirst({
      where: {
        clerkUserId: userId,
        practiceId: appt.practiceId,
        role: { in: ["PracticeOwner", "Clinician"] },
        isActive: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Guard: must have a Stripe payment intent to refund
    if (!appt.stripePaymentIntentId) {
      return NextResponse.json(
        { error: "No payment on record for this appointment." },
        { status: 400 }
      );
    }

    // Guard: only CANCELLED appointments (PracticeOwner may also force-refund COMPLETED)
    const refundableStatuses =
      member.role === "PracticeOwner"
        ? ["CANCELLED", "COMPLETED"]
        : ["CANCELLED"];

    if (!refundableStatuses.includes(appt.status)) {
      return NextResponse.json(
        { error: "Refunds are only available for cancelled appointments." },
        { status: 400 }
      );
    }

    // Guard: already refunded
    if (appt.refundedAt) {
      return NextResponse.json(
        { error: "This appointment has already been refunded." },
        { status: 400 }
      );
    }

    const refund = await stripe.refunds.create({
      payment_intent: appt.stripePaymentIntentId,
    });

    await prisma.appointment.update({
      where: { id },
      data: {
        refundedAt: new Date(),
        refundId: refund.id,
      },
    });

    await writeAuditLog({
      practiceId: appt.practiceId,
      clerkUserId: userId,
      memberId: member.id,
      eventType: "EDIT_NOTE",
      resourceId: id,
      resourceType: "appointment",
      metadata: { action: "refund", refundId: refund.id },
    });

    return NextResponse.json({ ok: true, refundId: refund.id });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[appointments/:id/refund POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

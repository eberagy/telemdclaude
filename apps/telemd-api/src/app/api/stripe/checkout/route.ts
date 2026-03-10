import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// POST /api/stripe/checkout — Create Stripe Checkout session for appointment
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { appointmentId } = await req.json();

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        appointmentType: true,
        practice: true,
        patient: { select: { clerkUserId: true, email: true } },
        clinician: {
          include: { member: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Verify the patient is the one paying
    if (appointment.patient.clerkUserId !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (appointment.status !== "PENDING_PAYMENT") {
      return NextResponse.json(
        { error: "Appointment is not awaiting payment." },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: appointment.patient.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: appointment.appointmentType.priceInCents,
            product_data: {
              name: `${appointment.appointmentType.name} — ${appointment.practice.name}`,
              description: `Telehealth appointment with ${appointment.clinician.member.firstName} ${appointment.clinician.member.lastName}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        appointmentId: appointment.id,
        practiceId: appointment.practiceId,
      },
      success_url: `${baseUrl}/patient/appointments/${appointment.id}?payment=success`,
      cancel_url: `${baseUrl}/patient/appointments/${appointment.id}?payment=cancelled`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min
    }, { idempotencyKey: appointmentId });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

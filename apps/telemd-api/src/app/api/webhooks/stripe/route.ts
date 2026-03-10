import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export const dynamic = "force-dynamic";

// In-memory idempotency guard — prevents double-processing on retry within the same instance lifetime.
// For multi-instance deployments, replace with a short-TTL Redis SET.
const processedEventIds = new Set<string>();

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[stripe webhook] Invalid signature", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Replay protection: reject events older than 5 minutes
  const ageSeconds = Math.floor(Date.now() / 1000) - event.created;
  if (ageSeconds > 300) {
    console.warn("[stripe webhook] Rejected stale event", event.id, `age=${ageSeconds}s`);
    return NextResponse.json({ error: "Event too old" }, { status: 400 });
  }

  // Idempotency guard: skip events already processed this instance
  if (processedEventIds.has(event.id)) {
    return NextResponse.json({ received: true });
  }
  processedEventIds.add(event.id);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(session);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(sub);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceFailed(invoice);
        break;
      }

      default:
        // Ignore unhandled events
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe webhook] Handler error", event.type, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const appointmentId = session.metadata?.appointmentId;
  if (!appointmentId) return;

  const amountPaid = session.amount_total ?? 0;

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: "CONFIRMED",
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id,
      paidAt: new Date(),
      amountPaidCents: amountPaid,
    },
  });

  // Schedule reminders
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { slotStart: true },
  });

  if (appt) {
    const h24 = new Date(appt.slotStart.getTime() - 24 * 60 * 60 * 1000);
    const h1 = new Date(appt.slotStart.getTime() - 60 * 60 * 1000);

    await prisma.reminder.createMany({
      skipDuplicates: true,
      data: [
        { appointmentId, type: "EMAIL_24H", scheduledAt: h24 },
        { appointmentId, type: "SMS_24H", scheduledAt: h24 },
        { appointmentId, type: "EMAIL_1H", scheduledAt: h1 },
        { appointmentId, type: "SMS_1H", scheduledAt: h1 },
      ],
    });
  }

  console.log(`[stripe] Appointment ${appointmentId} confirmed, paid $${amountPaid / 100}`);
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const appointmentId = session.metadata?.appointmentId;
  if (!appointmentId) return;

  await prisma.appointment.update({
    where: { id: appointmentId, status: "PENDING_PAYMENT" },
    data: { status: "PAYMENT_FAILED" },
  });

  // Release slot lock
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { clinicianId: true, slotStart: true },
  });

  if (appt) {
    await prisma.slotLock.deleteMany({
      where: { clinicianId: appt.clinicianId, slotStart: appt.slotStart },
    });
  }
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const clinicianProfile = await prisma.clinicianProfile.findFirst({
    where: { stripeSubscriptionId: sub.id },
  });

  if (!clinicianProfile) return;

  const isActive =
    sub.status === "active" || sub.status === "trialing";

  await prisma.clinicianProfile.update({
    where: { id: clinicianProfile.id },
    data: {
      seatStatus: isActive ? "ACTIVE" : "INACTIVE",
      ...(isActive && !clinicianProfile.seatActivatedAt
        ? { seatActivatedAt: new Date() }
        : {}),
      ...(!isActive ? { seatDeactivatedAt: new Date() } : {}),
    },
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const clinicianProfile = await prisma.clinicianProfile.findFirst({
    where: { stripeSubscriptionId: sub.id },
  });

  if (!clinicianProfile) return;

  await prisma.clinicianProfile.update({
    where: { id: clinicianProfile.id },
    data: {
      seatStatus: "INACTIVE",
      seatDeactivatedAt: new Date(),
    },
  });
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;

  if (!subscriptionId) return;

  const clinicianProfile = await prisma.clinicianProfile.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!clinicianProfile) return;

  // Deactivate seat on payment failure
  await prisma.clinicianProfile.update({
    where: { id: clinicianProfile.id },
    data: {
      seatStatus: "INACTIVE",
      seatDeactivatedAt: new Date(),
    },
  });
}

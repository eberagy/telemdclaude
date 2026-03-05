import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

// POST /api/stripe/billing-portal — create Stripe billing portal session for practice owner
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const owner = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, role: "PracticeOwner", isActive: true },
      include: { practice: { select: { stripeCustomerId: true } } },
    });
    if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (!owner.practice?.stripeCustomerId) {
      return NextResponse.json({ error: "No billing account found" }, { status: 400 });
    }

    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/owner/billing`;

    const session = await stripe.billingPortal.sessions.create({
      customer: owner.practice.stripeCustomerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/billing-portal]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

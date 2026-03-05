import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";

// POST /api/webhooks/clerk — sync Clerk user events to the DB
export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let event: { type: string; data: Record<string, unknown> };
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof event;
  } catch (err) {
    console.error("[clerk-webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = event;

  if (type === "user.created" || type === "user.updated") {
    const clerkUserId = data.id as string;
    const emailAddresses = data.email_addresses as Array<{ email_address: string; id: string }>;
    const primaryEmailId = data.primary_email_address_id as string;
    const primaryEmail = emailAddresses.find((e) => e.id === primaryEmailId)?.email_address;
    const firstName = (data.first_name as string) ?? "";
    const lastName = (data.last_name as string) ?? "";

    if (!primaryEmail) {
      return NextResponse.json({ received: true });
    }

    // Update PracticeMember records that match this clerk user
    await prisma.practiceMember.updateMany({
      where: { clerkUserId },
      data: { firstName, lastName, email: primaryEmail },
    });

    // If this is a patient, try to update the patient profile
    await prisma.patientProfile.upsert({
      where: { clerkUserId },
      update: { email: primaryEmail },
      create: { clerkUserId, email: primaryEmail, state: "PA" },
    }).catch(() => {
      // Silently ignore if patient profile doesn't exist (non-patient user)
    });
  }

  if (type === "user.deleted") {
    const clerkUserId = data.id as string;
    // Soft-deactivate practice members
    await prisma.practiceMember.updateMany({
      where: { clerkUserId },
      data: { isActive: false },
    });
    // Soft-deactivate patient profile
    await prisma.patientProfile.updateMany({
      where: { clerkUserId },
      data: { isActive: false },
    });
  }

  return NextResponse.json({ received: true });
}

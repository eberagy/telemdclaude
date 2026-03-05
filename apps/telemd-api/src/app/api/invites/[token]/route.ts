/**
 * GET  /api/invites/[token] — Fetch invite details (public — to show preview before sign-in)
 * POST /api/invites/[token] — Accept an invite (requires auth)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invite = await prisma.practiceInvite.findUnique({
      where: { token },
      include: { practice: { select: { name: true, slug: true } } },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found or already used" }, { status: 404 });
    }

    if (invite.acceptedAt || invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: invite.acceptedAt ? "Invite already accepted" : "Invite expired" },
        { status: 410 }
      );
    }

    return NextResponse.json({
      invite: {
        token: invite.token,
        email: invite.email,
        role: invite.role,
        practiceName: invite.practice.name,
        practiceSlug: invite.practice.slug,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (err) {
    console.error("[invites GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { token } = await params;

    const invite = await prisma.practiceInvite.findUnique({
      where: { token },
      include: { practice: true },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.acceptedAt) {
      return NextResponse.json({ error: "Invite already accepted" }, { status: 410 });
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
    }

    // Check this user isn't already a member
    const existing = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, practiceId: invite.practiceId, isActive: true },
    });
    if (existing) {
      return NextResponse.json({ error: "You are already a member of this practice" }, { status: 409 });
    }

    // Get user info from Clerk
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const email =
      clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
        ?.emailAddress ?? invite.email;
    const firstName = clerkUser.firstName ?? "";
    const lastName = clerkUser.lastName ?? "";

    // Create the practice member
    const member = await prisma.practiceMember.create({
      data: {
        practiceId: invite.practiceId,
        clerkUserId: userId,
        role: invite.role,
        email,
        firstName,
        lastName,
        isActive: true,
      },
    });

    // If clinician, create clinician profile
    if (invite.role === "Clinician") {
      await prisma.clinicianProfile.create({
        data: {
          memberId: member.id,
          seatStatus: "INACTIVE", // Requires owner activation
          licensedStates: [],
          specialty: null,
          npi: null,
        },
      });
    }

    // Mark invite as accepted
    await prisma.practiceInvite.update({
      where: { token },
      data: { acceptedAt: new Date() },
    });

    // Update Clerk metadata with correct role
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role: invite.role, practiceId: invite.practiceId },
    });

    await writeAuditLog({
      practiceId: invite.practiceId,
      clerkUserId: userId,
      memberId: member.id,
      eventType: "INVITE_ACCEPTED",
      resourceType: "PracticeInvite",
      resourceId: invite.id,
    });

    const destination =
      invite.role === "Clinician" ? "/clinician/schedule" : "/staff/schedule";

    return NextResponse.json({ ok: true, role: invite.role, redirectTo: destination });
  } catch (err) {
    console.error("[invites POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

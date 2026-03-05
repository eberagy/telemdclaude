import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["Clinician", "Staff"]),
});

// GET /api/owner/team — list all practice members
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const owner = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, role: "PracticeOwner", isActive: true },
    });
    if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const members = await prisma.practiceMember.findMany({
      where: { practiceId: owner.practiceId, isActive: true },
      include: {
        clinician: {
          select: {
            id: true,
            seatStatus: true,
            specialty: true,
            npi: true,
            licensedStates: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { lastName: "asc" }],
    });

    return NextResponse.json({ members });
  } catch (err) {
    console.error("[owner/team GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/owner/team — invite a new member to the practice
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const owner = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, role: "PracticeOwner", isActive: true },
    });
    if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { email, role } = parsed.data;

    const existing = await prisma.practiceMember.findFirst({
      where: { practiceId: owner.practiceId, email, isActive: true },
    });
    if (existing) {
      return NextResponse.json({ error: "This email is already a member of the practice" }, { status: 409 });
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invite = await prisma.practiceInvite.create({
      data: { practiceId: owner.practiceId, email, role, expiresAt },
    });

    await writeAuditLog({
      practiceId: owner.practiceId,
      clerkUserId: userId,
      memberId: owner.id,
      eventType: "INVITE_SENT",
      resourceType: "PracticeInvite",
      resourceId: invite.id,
    });

    // Send invite email via Postmark
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const inviteUrl = `${appUrl}/invites/${invite.token}`;
    const postmarkToken = process.env.POSTMARK_API_KEY;
    const practice = await prisma.practice.findUnique({ where: { id: owner.practiceId }, select: { name: true } });

    if (postmarkToken) {
      await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Postmark-Server-Token": postmarkToken,
        },
        body: JSON.stringify({
          From: "noreply@telemd.health",
          To: email,
          Subject: `You're invited to join ${practice?.name ?? "a TeleMD practice"}`,
          HtmlBody: `
            <p>You have been invited to join <strong>${practice?.name}</strong> on TeleMD as a <strong>${role}</strong>.</p>
            <p><a href="${inviteUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px;">Accept Invite</a></p>
            <p style="color:#6b7280;font-size:12px;">This invite expires ${expiresAt.toLocaleDateString()}. If you did not expect this, you can ignore this email.</p>
          `,
          TextBody: `You've been invited to join ${practice?.name} on TeleMD as a ${role}.\n\nAccept here: ${inviteUrl}\n\nExpires: ${expiresAt.toLocaleDateString()}`,
          Tag: "team-invite",
        }),
      }).catch((err) => console.error("[team invite] Postmark failed:", err));
    } else {
      console.log(`[team invite] INVITE_URL: ${inviteUrl}`);
    }

    return NextResponse.json({ invite: { id: invite.id, email, role, expiresAt } }, { status: 201 });
  } catch (err) {
    console.error("[owner/team POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/messages/[id] — Mark a message as read
export async function PATCH(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const message = await prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Verify requester is the patient in this conversation or an active practice member (not Staff)
    const patientProfile = await prisma.patientProfile.findUnique({
      where: { clerkUserId: userId },
    });

    const member = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, practiceId: message.practiceId, isActive: true },
    });

    const isPatient = patientProfile?.id === message.patientId;
    const isMember = !!member && member.role !== "Staff";

    if (!isPatient && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ message: updated });
  } catch (err) {
    console.error("[messages/:id PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

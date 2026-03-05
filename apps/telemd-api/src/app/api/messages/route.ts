import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const SendMessageSchema = z.object({
  practiceId: z.string(),
  content: z.string().min(1).max(2000),
  patientId: z.string().optional(), // required for staff/clinician sending to a patient
});

// GET /api/messages?practiceId=&patientId= — list messages in a conversation
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const practiceId = searchParams.get("practiceId");
    const patientId = searchParams.get("patientId");

    if (!practiceId) {
      return NextResponse.json({ error: "practiceId required" }, { status: 400 });
    }

    const member = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, practiceId, isActive: true },
    });

    const patientProfile = await prisma.patientProfile.findUnique({
      where: { clerkUserId: userId },
    });

    if (!member && !patientProfile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Staff cannot access patient messages (PHI boundary)
    if (member?.role === "Staff") {
      return NextResponse.json({ error: "Staff cannot access patient messages" }, { status: 403 });
    }

    const resolvedPatientId = patientProfile?.id ?? patientId;
    if (!resolvedPatientId) {
      return NextResponse.json({ error: "patientId required" }, { status: 400 });
    }

    const messages = await prisma.message.findMany({
      where: { practiceId, patientId: resolvedPatientId },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        content: true,
        senderRole: true,
        createdAt: true,
        readAt: true,
        isClinicalFlag: true,
      },
    });

    // Mark incoming messages as read
    const unreadIds = messages
      .filter((m) => !m.readAt && (
        (patientProfile && m.senderRole !== "Patient") ||
        (member && m.senderRole === "Patient")
      ))
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: unreadIds } },
        data: { readAt: new Date() },
      });
    }

    return NextResponse.json({ messages });
  } catch (err) {
    console.error("[messages GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/messages — send a message
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const parsed = SendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { practiceId, content, patientId } = parsed.data;

    const member = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, practiceId, isActive: true },
    });

    const patientProfile = await prisma.patientProfile.findUnique({
      where: { clerkUserId: userId },
    });

    if (!member && !patientProfile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (member?.role === "Staff") {
      return NextResponse.json({ error: "Staff cannot send patient messages" }, { status: 403 });
    }

    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
      select: { id: true },
    });
    if (!practice) return NextResponse.json({ error: "Practice not found" }, { status: 404 });

    let resolvedPatientId: string;
    let senderRole: "Patient" | "Clinician" | "System";

    if (patientProfile) {
      resolvedPatientId = patientProfile.id;
      senderRole = "Patient";
    } else if (member && patientId) {
      resolvedPatientId = patientId;
      senderRole = "Clinician";
    } else {
      return NextResponse.json({ error: "patientId required" }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        practiceId,
        patientId: resolvedPatientId,
        senderRole,
        senderUserId: userId,
        content,
      },
    });

    await writeAuditLog({
      practiceId,
      clerkUserId: userId,
      memberId: member?.id,
      eventType: "MESSAGE_SENT",
      resourceType: "Message",
      resourceId: message.id,
    });

    return NextResponse.json({ message });
  } catch (err) {
    console.error("[messages POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

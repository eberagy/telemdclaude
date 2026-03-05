import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requirePHIAccess, AuthorizationError } from "@/lib/rbac";
import { writeAuditLog, getClientIP } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>; // appointmentId
}

// GET /api/notes/[appointmentId] — Load note content for the editor
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: appointmentId } = await params;
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { practiceId: true },
    });
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    await requirePHIAccess(appointment.practiceId, appointmentId);

    const note = await prisma.clinicianNote.findUnique({
      where: { appointmentId },
      select: {
        id: true,
        subjective: true,
        objective: true,
        assessment: true,
        plan: true,
        freeText: true,
        status: true,
        signedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ note });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[notes GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/notes/[appointmentId] — Create or update clinician note
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: appointmentId } = await params;
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { practiceId: true, clinicianId: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const { member } = await requirePHIAccess(appointment.practiceId, appointmentId);

    if (member.role !== "Clinician" && member.role !== "PracticeOwner") {
      return NextResponse.json(
        { error: "Only clinicians can write notes" },
        { status: 403 }
      );
    }

    const { subjective, objective, assessment, plan, freeText, sign } =
      await req.json();

    // Check if note already exists and is signed
    const existing = await prisma.clinicianNote.findUnique({
      where: { appointmentId },
    });

    if (existing?.status === "SIGNED") {
      return NextResponse.json(
        { error: "Note is already signed and cannot be edited" },
        { status: 409 }
      );
    }

    const note = await prisma.clinicianNote.upsert({
      where: { appointmentId },
      update: {
        subjective,
        objective,
        assessment,
        plan,
        freeText,
        status: sign ? "SIGNED" : "DRAFT",
        clinicianId: member.id,
        signedAt: sign ? new Date() : undefined,
      },
      create: {
        appointmentId,
        clinicianId: member.id,
        subjective,
        objective,
        assessment,
        plan,
        freeText,
        status: sign ? "SIGNED" : "DRAFT",
        signedAt: sign ? new Date() : undefined,
      },
    });

    // Audit
    await writeAuditLog({
      practiceId: appointment.practiceId,
      clerkUserId: userId,
      memberId: member.id,
      eventType: sign ? "SIGN_NOTE" : "EDIT_NOTE",
      resourceId: appointmentId,
      resourceType: "appointment",
      ipAddress: getClientIP(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({ note });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[notes POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

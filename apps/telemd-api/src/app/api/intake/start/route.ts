import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { LIMITS } from "@/lib/ratelimit";

const RETELL_API_KEY = process.env.RETELL_API_KEY!;
const RETELL_AGENT_ID = process.env.RETELL_AGENT_ID!;

// POST /api/intake/start — Trigger Retell AI intake call for patient
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { appointmentId } = await req.json();

    // Rate limit: max 3 intake calls per user per hour (Retell costs money)
    const rl = LIMITS.intakeStart(userId);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many intake attempts. Please wait before trying again." },
        { status: 429 }
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { clerkUserId: true, phone: true, email: true } },
        appointmentType: { select: { name: true, intakeTemplateId: true } },
        practice: { select: { name: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (appointment.patient.clerkUserId !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!["CONFIRMED", "INTAKE_PENDING"].includes(appointment.status)) {
      return NextResponse.json(
        { error: "Appointment not ready for intake." },
        { status: 400 }
      );
    }

    if (appointment.intakeStatus === "COMPLETED") {
      return NextResponse.json(
        { error: "Intake already completed." },
        { status: 400 }
      );
    }

    // Get intake template fields for Retell context
    let templateFields: Array<{ name: string; label: string }> = [];
    if (appointment.appointmentType.intakeTemplateId) {
      const template = await prisma.intakeTemplate.findUnique({
        where: { id: appointment.appointmentType.intakeTemplateId },
      });
      if (template) {
        templateFields = template.fields as Array<{ name: string; label: string }>;
      }
    }

    // Create Retell web call
    const retellResponse = await fetch("https://api.retellai.com/v2/create-web-call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RETELL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: RETELL_AGENT_ID,
        metadata: {
          appointmentId: appointment.id,
          practiceId: appointment.practiceId,
          appointmentType: appointment.appointmentType.name,
          practiceName: appointment.practice.name,
          intakeFields: templateFields.map((f) => f.label).join(", "),
        },
        retell_llm_dynamic_variables: {
          appointment_type: appointment.appointmentType.name,
          practice_name: appointment.practice.name,
          intake_questions: templateFields.map((f) => f.label).join("; "),
        },
      }),
    });

    if (!retellResponse.ok) {
      const errorText = await retellResponse.text();
      console.error("[intake/start] Retell error:", errorText);
      return NextResponse.json(
        { error: "Failed to create intake call. Please try again." },
        { status: 500 }
      );
    }

    const retellData = await retellResponse.json();

    // Update appointment with call details
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        retellCallId: retellData.call_id,
        intakeStatus: "IN_PROGRESS",
        intakeStartedAt: new Date(),
        status: "INTAKE_PENDING",
      },
    });

    return NextResponse.json({
      callId: retellData.call_id,
      accessToken: retellData.access_token, // Used by Retell Web SDK
    });
  } catch (err) {
    console.error("[intake/start]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

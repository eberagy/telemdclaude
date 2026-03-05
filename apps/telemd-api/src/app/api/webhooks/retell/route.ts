import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSOAPSummary } from "@/services/soap";

export const dynamic = "force-dynamic";

// Retell AI webhook — call completed event
export async function POST(req: NextRequest) {
  try {
    // Verify Retell webhook signature
    const retellSecret = process.env.RETELL_WEBHOOK_SECRET;
    if (retellSecret) {
      const sig = req.headers.get("x-retell-signature");
      if (sig !== retellSecret) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const body = await req.json();
    const { event, data } = body;

    if (event === "call_ended" || event === "call_analyzed") {
      const { call_id, transcript, call_analysis } = data;

      // Find appointment by retell call ID
      const appointment = await prisma.appointment.findFirst({
        where: { retellCallId: call_id },
        include: { practice: true },
      });

      if (!appointment) {
        console.warn(`[retell] No appointment for call_id ${call_id}`);
        return NextResponse.json({ received: true });
      }

      // Store transcript (PHI — stored encrypted at rest via DB)
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          intakeStatus: "COMPLETED",
          intakeCompletedAt: new Date(),
          transcriptRaw: transcript ?? call_analysis?.transcript ?? "",
        },
      });

      // Generate SOAP summary asynchronously (don't block webhook response)
      generateSOAPSummary(appointment.id, transcript ?? "").catch((err) => {
        console.error("[retell] SOAP generation failed", err);
      });

      return NextResponse.json({ received: true });
    }

    if (event === "call_started") {
      const { call_id } = data;
      const appointmentId = data.metadata?.appointmentId;

      if (appointmentId) {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: {
            retellCallId: call_id,
            intakeStatus: "IN_PROGRESS",
            intakeStartedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[retell webhook]", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}

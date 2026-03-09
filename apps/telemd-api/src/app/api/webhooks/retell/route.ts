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

    if (event === "call_ended") {
      const { call_id, transcript } = data;

      const appointment = await prisma.appointment.findFirst({
        where: { retellCallId: call_id },
      });

      if (!appointment) {
        console.warn(`[retell] No appointment for call_id ${call_id}`);
        return NextResponse.json({ received: true });
      }

      // Store transcript immediately when call ends (PHI — never log)
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          intakeStatus: "COMPLETED",
          intakeCompletedAt: new Date(),
          transcriptRaw: transcript ?? "",
        },
      });

      return NextResponse.json({ received: true });
    }

    // call_analyzed fires after call_ended with enriched analysis — use this for SOAP
    if (event === "call_analyzed") {
      const { call_id, transcript, call_analysis } = data;

      const appointment = await prisma.appointment.findFirst({
        where: { retellCallId: call_id },
      });

      if (!appointment) {
        return NextResponse.json({ received: true });
      }

      // Update transcript with richer analyzed version if available
      const finalTranscript = transcript ?? call_analysis?.transcript ?? "";
      if (finalTranscript) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { transcriptRaw: finalTranscript },
        });
      }

      // Generate SOAP summary only if not already generated
      if (!appointment.soapSummaryId) {
        generateSOAPSummary(appointment.id, finalTranscript).catch((err) => {
          console.error("[retell] SOAP generation failed", err);
        });
      }

      return NextResponse.json({ received: true });
    }

    if (event === "call_failed") {
      const { call_id } = data;

      const appointment = await prisma.appointment.findFirst({
        where: { retellCallId: call_id },
      });

      if (appointment) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { intakeStatus: "FAILED" },
        });
      }

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

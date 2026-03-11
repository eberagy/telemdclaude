import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Prisma requires Node.js runtime — edge runtime lacks TCP support needed for DB connections
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// GET /api/appointments/[id]/events — SSE stream for real-time appointment status
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { userId } = await auth();

  if (!userId) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const appt = await prisma.appointment.findUnique({
    where: { id },
    select: {
      practiceId: true,
      patientId: true,
      status: true,
      intakeStatus: true,
      soapSummaryId: true,
    },
  });

  if (!appt) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Auth: patient who owns the appointment, or any active practice member
  const patientProfile = await prisma.patientProfile.findUnique({
    where: { clerkUserId: userId },
  });

  const isPatient = patientProfile?.id === appt.patientId;

  if (!isPatient) {
    const member = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, practiceId: appt.practiceId, isActive: true },
    });
    if (!member) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const encoder = new TextEncoder();
  const maxDurationMs = 2 * 60 * 60 * 1000; // 2 hours
  const startTime = Date.now();

  // Shared cancellation flag — set when client disconnects
  let cancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      // Emit initial state
      send({
        status: appt.status,
        intakeStatus: appt.intakeStatus,
        hasSoap: !!appt.soapSummaryId,
      });

      // Already terminal — close immediately
      if (appt.status === "COMPLETED" || appt.status === "CANCELLED") {
        controller.close();
        return;
      }

      while (!cancelled) {
        await sleep(3000);

        if (cancelled) break;

        // Enforce max stream duration
        if (Date.now() - startTime > maxDurationMs) {
          controller.close();
          break;
        }

        let updated: {
          status: string;
          intakeStatus: string;
          soapSummaryId: string | null;
        } | null;

        try {
          updated = await prisma.appointment.findUnique({
            where: { id },
            select: { status: true, intakeStatus: true, soapSummaryId: true },
          });
        } catch {
          controller.close();
          break;
        }

        if (!updated) {
          controller.close();
          break;
        }

        try {
          send({
            status: updated.status,
            intakeStatus: updated.intakeStatus,
            hasSoap: !!updated.soapSummaryId,
          });
        } catch {
          // Controller was closed (client disconnected between sleep and send)
          break;
        }

        if (updated.status === "COMPLETED" || updated.status === "CANCELLED") {
          controller.close();
          break;
        }
      }
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Prevent nginx from buffering the stream
    },
  });
}

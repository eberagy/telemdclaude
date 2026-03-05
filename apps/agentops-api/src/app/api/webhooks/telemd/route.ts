import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { TeleMDEvent } from "@telemd/shared";

export const dynamic = "force-dynamic";

// POST /api/webhooks/telemd — Receive TeleMD platform events
export async function POST(req: NextRequest) {
  try {
    // Verify TeleMD webhook secret
    const telemdSecret = process.env.TELEMD_WEBHOOK_SECRET;
    if (telemdSecret) {
      const sig = req.headers.get("x-telemd-signature");
      if (sig !== telemdSecret) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const event = (await req.json()) as TeleMDEvent;

    // Store event for processing by worker
    await prisma.teleMDEventLog.create({
      data: {
        eventType: event.type,
        payload: event.payload as object,
      },
    });

    console.log(`[telemd webhook] Received event: ${event.type}`);

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[telemd webhook]", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}

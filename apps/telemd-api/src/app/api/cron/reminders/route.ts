import { NextRequest, NextResponse } from "next/server";
import { processDueReminders } from "@/services/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Called by Vercel Cron every 5 minutes
// Or by any external scheduler (UptimeRobot, cron-job.org — free)
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized triggering
  const cronSecret = req.headers.get("x-cron-secret");
  if (
    process.env.CRON_SECRET &&
    cronSecret !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDueReminders();
  return NextResponse.json({ ok: true, ...result });
}

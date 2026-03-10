import { NextRequest, NextResponse } from "next/server";
import { processDueReminders } from "@/services/reminders";
import { prisma } from "@/lib/prisma";

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

  // Auto-mark NO_SHOW: appointments that were CONFIRMED but whose slot ended
  // within the last 4 hours and were never transitioned to IN_PROGRESS/COMPLETED.
  let noShowMarked = 0;
  try {
    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    const { count } = await prisma.appointment.updateMany({
      where: {
        status: "CONFIRMED",
        slotEnd: { lt: now, gt: fourHoursAgo },
      },
      data: { status: "NO_SHOW" },
    });

    noShowMarked = count;
    if (count > 0) {
      console.log(`[cron] Marked ${count} appointment(s) as NO_SHOW`);
    }
  } catch (err) {
    console.error("[cron] Failed to mark NO_SHOW appointments", err);
  }

  return NextResponse.json({ ok: true, ...result, noShowMarked });
}

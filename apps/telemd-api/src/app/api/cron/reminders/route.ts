import { NextRequest, NextResponse } from "next/server";
import { processDueReminders } from "@/services/reminders";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";

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

  // Secondary delivery pass: catch any past-due reminders not processed by the
  // primary service batch (e.g. overflow beyond take:50 or service-layer failures).
  let remindersSent = 0;
  let remindersFailed = 0;
  try {
    const now2 = new Date();
    const pastDue = await prisma.reminder.findMany({
      where: {
        sentAt: null,
        failed: false,
        scheduledAt: { lte: now2 },
      },
      include: {
        appointment: {
          include: {
            patient: { select: { email: true, phone: true } },
            appointmentType: { select: { name: true } },
            clinician: {
              include: { member: { select: { firstName: true, lastName: true } } },
            },
            practice: { select: { name: true, timezone: true } },
          },
        },
      },
      take: 50,
    });

    for (const reminder of pastDue) {
      try {
        const { appointment } = reminder;
        const is24h = reminder.type.includes("24H");

        const slotStr = appointment.slotStart.toLocaleString("en-US", {
          timeZone: appointment.practice.timezone,
          weekday: "long",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

        const clinicianName = `Dr. ${appointment.clinician.member.firstName} ${appointment.clinician.member.lastName}`;
        const subject = is24h
          ? "Reminder: Your TeleMD appointment is tomorrow"
          : "Reminder: Your TeleMD appointment is in 1 hour";
        const body = `Your ${appointment.appointmentType.name} appointment with ${clinicianName} at ${appointment.practice.name} is scheduled for ${slotStr}.`;

        if (reminder.type.startsWith("EMAIL") && appointment.patient.email) {
          await sendEmail(appointment.patient.email, subject, body);
        }
        if (reminder.type.startsWith("SMS") && appointment.patient.phone) {
          await sendSMS(appointment.patient.phone, `TeleMD: ${body}`);
        }

        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { sentAt: new Date() },
        });
        remindersSent++;
      } catch (err) {
        console.error(`[cron] Failed to deliver reminder ${reminder.id}:`, err);
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { failed: true },
        });
        remindersFailed++;
      }
    }

    if (remindersSent + remindersFailed > 0) {
      console.log(`[cron] Secondary pass — sent: ${remindersSent}, failed: ${remindersFailed}`);
    }
  } catch (err) {
    console.error("[cron] Secondary reminder delivery pass failed", err);
  }

  return NextResponse.json({ ok: true, ...result, noShowMarked, remindersSent, remindersFailed });
}

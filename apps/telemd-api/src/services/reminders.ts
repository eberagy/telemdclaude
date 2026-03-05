/**
 * Reminder sender — processes scheduled reminders from the DB.
 * Called by a cron job (can run via Vercel cron or external trigger).
 * Uses Postmark for email, Twilio for SMS.
 * Cost-efficient: only sends what's due, batches queries.
 */

import { prisma } from "@/lib/prisma";

const POSTMARK_TOKEN = process.env.POSTMARK_TOKEN!;
const POSTMARK_FROM = process.env.POSTMARK_FROM ?? "noreply@telemd.app";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER!;

export async function processDueReminders(): Promise<{ sent: number; failed: number }> {
  const now = new Date();
  const lookAhead = new Date(now.getTime() + 5 * 60 * 1000); // 5-min window

  const due = await prisma.reminder.findMany({
    where: {
      sentAt: null,
      failed: false,
      scheduledAt: { lte: lookAhead },
    },
    include: {
      appointment: {
        include: {
          patient: { select: { email: true, phone: true } },
          appointmentType: { select: { name: true, durationMinutes: true } },
          clinician: {
            include: {
              member: { select: { firstName: true, lastName: true } },
            },
          },
          practice: { select: { name: true, timezone: true } },
        },
      },
    },
    take: 50, // batch limit
  });

  let sent = 0;
  let failed = 0;

  for (const reminder of due) {
    const { appointment } = reminder;
    const isEmail = reminder.type.startsWith("EMAIL");
    const isSMS = reminder.type.startsWith("SMS");
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
      ? `Reminder: Your TeleMD appointment is tomorrow`
      : `Reminder: Your TeleMD appointment is in 1 hour`;

    const body = `Your ${appointment.appointmentType.name} appointment with ${clinicianName} at ${appointment.practice.name} is scheduled for ${slotStr}. Visit your patient portal to complete your intake call if you haven't already.`;

    try {
      if (isEmail && appointment.patient.email) {
        await sendEmail(appointment.patient.email, subject, body);
      }
      if (isSMS && appointment.patient.phone) {
        await sendSMS(appointment.patient.phone, `TeleMD: ${body}`);
      }

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { sentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(`[reminders] Failed to send ${reminder.type} for ${reminder.id}:`, err);
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { failed: true },
      });
      failed++;
    }
  }

  if (sent + failed > 0) {
    console.log(`[reminders] Sent: ${sent}, Failed: ${failed}`);
  }

  return { sent, failed };
}

async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (!POSTMARK_TOKEN) return;
  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": POSTMARK_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      From: POSTMARK_FROM,
      To: to,
      Subject: subject,
      TextBody: text,
      MessageStream: "outbound",
    }),
  });
  if (!res.ok) throw new Error(`Postmark error: ${res.status}`);
}

async function sendSMS(to: string, body: string): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: TWILIO_PHONE, Body: body }),
  });
  if (!res.ok) throw new Error(`Twilio error: ${res.status}`);
}

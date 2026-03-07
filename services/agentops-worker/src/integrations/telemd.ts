import { PrismaClient } from "../generated/prisma";
import type { TeleMDEvent } from "@telemd/shared";

const prisma = new PrismaClient();
const POLL_INTERVAL_MS = 30 * 1000; // 30 seconds

export function setupTeleMDEventConsumer() {
  console.log("[telemd] Starting event consumer...");
  processTeleMDEvents();
  setInterval(processTeleMDEvents, POLL_INTERVAL_MS);
}

async function processTeleMDEvents() {
  try {
    const events = await prisma.teleMDEventLog.findMany({
      where: { processed: false },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    for (const event of events) {
      await handleTeleMDEvent(event as { id: string; eventType: string; payload: object });
    }
  } catch (err) {
    console.error("[telemd] Event processing error:", err);
  }
}

async function handleTeleMDEvent(event: {
  id: string;
  eventType: string;
  payload: object;
}) {
  const payload = event.payload as TeleMDEvent["payload"];

  // Generate tasks based on TeleMD events
  let taskTitle: string | null = null;
  let taskDescription: string | null = null;
  let priority = 3;

  switch (event.eventType) {
    case "seat.deactivated":
      taskTitle = "Clinician seat deactivated — follow up";
      taskDescription = `A clinician seat subscription was deactivated. Practice: ${payload.practiceId}. Review if action needed.`;
      priority = 6;
      break;

    case "payment.failed":
      taskTitle = "Patient payment failed — retention opportunity";
      taskDescription = `A patient payment failed. Consider support outreach. Practice: ${payload.practiceId}.`;
      priority = 7;
      break;

    case "intake.completed":
      // Low priority — just for tracking
      taskTitle = null;
      break;

    case "note.signed":
      // Low priority
      taskTitle = null;
      break;

    case "appointment.created":
      // Track for analytics (COO/Finance)
      taskTitle = null;
      break;

    default:
      taskTitle = null;
  }

  if (taskTitle) {
    const task = await prisma.queuedTask.create({
      data: {
        title: taskTitle,
        description: taskDescription ?? taskTitle,
        source: "telemd_event",
        sourceId: event.id,
        labels: [event.eventType],
        priority,
        metadata: payload,
      },
    });
    console.log(`[telemd] Created task from event ${event.eventType}: ${task.id}`);
  }

  // Mark as processed
  await prisma.teleMDEventLog.update({
    where: { id: event.id },
    data: { processed: true, processedAt: new Date() },
  });
}

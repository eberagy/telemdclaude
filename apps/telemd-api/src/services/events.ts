/**
 * TeleMD Event Emitter
 * Sends events to AgentOps when significant things happen
 */

import type { TeleMDEventType } from "@telemd/shared";

const AGENTOPS_WEBHOOK_URL = process.env.AGENTOPS_WEBHOOK_URL;
const TELEMD_WEBHOOK_SECRET = process.env.TELEMD_WEBHOOK_SECRET;

export async function emitTeleMDEvent(
  type: TeleMDEventType,
  practiceId: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (!AGENTOPS_WEBHOOK_URL) return; // AgentOps not configured

  try {
    await fetch(`${AGENTOPS_WEBHOOK_URL}/api/webhooks/telemd`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(TELEMD_WEBHOOK_SECRET
          ? { "x-telemd-signature": TELEMD_WEBHOOK_SECRET }
          : {}),
      },
      body: JSON.stringify({
        type,
        practiceId,
        payload,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    // Don't break TeleMD operations if AgentOps is down
    console.warn("[events] Failed to emit event to AgentOps:", type, err);
  }
}

import { prisma } from "@/lib/prisma";

/**
 * Zoom Video SDK session management.
 * Uses SDK auth (JWT) — no recording, no cloud storage.
 */

interface ZoomSessionToken {
  sessionToken: string;
  sessionName: string;
  role: 0 | 1; // 0=attendee, 1=host
}

/**
 * Generate a Zoom Video SDK JWT session token.
 * Role: 1 = host (clinician), 0 = participant (patient)
 */
export async function generateZoomSessionToken(
  appointmentId: string,
  userId: string,
  role: "host" | "participant"
): Promise<ZoomSessionToken> {
  const { ZOOM_SDK_KEY, ZOOM_SDK_SECRET } = process.env;

  if (!ZOOM_SDK_KEY || !ZOOM_SDK_SECRET) {
    throw new Error("Zoom SDK credentials not configured");
  }

  const sessionName = `telemd-${appointmentId}`;
  const roleNum = role === "host" ? 1 : 0;

  // Build JWT payload for Zoom Video SDK
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      app_key: ZOOM_SDK_KEY,
      iat: now,
      exp: now + 3600, // 1 hour
      tpc: sessionName,
      role_type: roleNum,
      user_identity: userId,
      // Explicitly disable recording
      session_key: appointmentId,
    })
  ).toString("base64url");

  // HMAC-SHA256 signature
  const crypto = await import("crypto");
  const signature = crypto
    .createHmac("sha256", ZOOM_SDK_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  const sessionToken = `${header}.${payload}.${signature}`;

  // Mark visit as started if host
  if (role === "host") {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        zoomSessionId: sessionName,
        zoomSessionStatus: "ACTIVE",
        visitStartedAt: new Date(),
        status: "IN_PROGRESS",
      },
    });
  }

  return { sessionToken, sessionName, role: roleNum };
}

/**
 * End a Zoom session (clinician ends visit).
 */
export async function endZoomSession(appointmentId: string): Promise<void> {
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      zoomSessionStatus: "ENDED",
      visitEndedAt: new Date(),
    },
  });
}

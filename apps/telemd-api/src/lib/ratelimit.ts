/**
 * Simple in-memory rate limiter for expensive endpoints (intake, SOAP, Zoom).
 * In production replace with Redis-based limiter (Upstash is free tier).
 * Protects against accidental/malicious spend.
 */

const store = new Map<string, { count: number; resetAt: number }>();

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit. Returns allowed=false if exceeded.
 * @param key     unique key (e.g. userId + endpoint)
 * @param limit   max requests per window
 * @param windowMs window size in ms
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// Preset limits for expensive operations
export const LIMITS = {
  // Intake call: max 3 per user per hour (Retell costs ~$0.05/min)
  intakeStart: (userId: string) =>
    checkRateLimit(`intake:${userId}`, 3, 60 * 60 * 1000),

  // SOAP regen: max 5 per appointment
  soapRegen: (appointmentId: string) =>
    checkRateLimit(`soap:${appointmentId}`, 5, 24 * 60 * 60 * 1000),

  // Zoom session: max 10 tokens per appointment per day
  zoomSession: (appointmentId: string) =>
    checkRateLimit(`zoom:${appointmentId}`, 10, 24 * 60 * 60 * 1000),

  // Booking: max 10 attempts per user per hour
  booking: (userId: string) =>
    checkRateLimit(`booking:${userId}`, 10, 60 * 60 * 1000),
} as const;

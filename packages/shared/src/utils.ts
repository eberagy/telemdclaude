// ============================================================
// SHARED UTILITIES
// ============================================================

/**
 * Scrub PHI from error/log objects before sending to Sentry/analytics.
 * Remove known PHI fields recursively.
 */
const PHI_FIELDS = new Set([
  "ssn",
  "dob",
  "dateOfBirth",
  "phone",
  "phoneNumber",
  "email",
  "address",
  "firstName",
  "lastName",
  "fullName",
  "patientName",
  "transcript",
  "soapSummary",
  "redFlags",
  "medicalHistory",
  "medications",
  "allergies",
  "chiefComplaint",
  "notes",
  "clinicianNotes",
]);

export function scrubPHI(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(scrubPHI);
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (PHI_FIELDS.has(key)) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = scrubPHI(val);
    }
  }
  return result;
}

/**
 * Format price from cents to display string
 */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/**
 * Generate a slot key for dedup/locking purposes
 */
export function slotKey(clinicianId: string, start: Date): string {
  return `${clinicianId}::${start.toISOString()}`;
}

/**
 * Check if a slot start time is within the join window (10 min before)
 */
export function isWithinJoinWindow(
  slotStart: Date,
  nowMs: number = Date.now()
): boolean {
  const tenMinBefore = slotStart.getTime() - 10 * 60 * 1000;
  const endOfVisit = slotStart.getTime() + 2 * 60 * 60 * 1000; // 2h max
  return nowMs >= tenMinBefore && nowMs <= endOfVisit;
}

/**
 * Generate cryptographically strong token
 */
export function generateToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  if (typeof globalThis.crypto !== "undefined") {
    globalThis.crypto.getRandomValues(arr);
  }
  return Buffer.from(arr).toString("hex");
}

/**
 * Mask email for logging (safe for non-PHI contexts)
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***.***";
  return `${local[0]}***@${domain}`;
}

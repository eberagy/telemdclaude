/**
 * Environment variable validation — runs at startup.
 * Add all required env vars here so we fail fast with a clear error.
 */

const required = [
  "DATABASE_URL",
  "CLERK_SECRET_KEY",
  "CLERK_WEBHOOK_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RETELL_API_KEY",
  "ANTHROPIC_API_KEY",
  "ZOOM_ACCOUNT_ID",
  "ZOOM_CLIENT_ID",
  "ZOOM_CLIENT_SECRET",
  "AWS_S3_BUCKET",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_REGION",
] as const;

const optional = [
  "POSTMARK_API_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_NUMBER",
  "SENTRY_DSN",
  "REDIS_URL",
  "NEXT_PUBLIC_APP_URL",
  "RETELL_WEBHOOK_SECRET",
  "DEMO_REQUEST_EMAIL",
] as const;

let validated = false;

export function validateEnv(): void {
  if (validated || process.env.NODE_ENV === "test") return;
  validated = true;

  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(
      `\n[telemd-api] FATAL: Missing required environment variables:\n  ${missing.join("\n  ")}\n\nSee .env.example for all required variables.\n`
    );
    // In production, throw — in dev, warn
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }
  }

  const missingOptional = optional.filter((k) => !process.env[k]);
  if (missingOptional.length > 0) {
    console.warn(`[telemd-api] Optional env vars not set (some features may be disabled): ${missingOptional.join(", ")}`);
  }
}

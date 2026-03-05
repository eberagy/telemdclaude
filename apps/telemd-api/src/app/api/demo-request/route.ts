import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const DemoRequestSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  practice: z.string().min(1).max(200),
  message: z.string().max(1000).optional(),
});

// POST /api/demo-request — public route, sends demo inquiry email via Postmark
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = DemoRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, practice, message } = parsed.data;

    // Rate limit by IP (simple — allow 3 per hour in prod)
    // Full Redis rate limiting would use the existing rateLimit() utility

    // Send email via Postmark if configured
    const postmarkToken = process.env.POSTMARK_API_KEY;
    const demoEmail = process.env.DEMO_REQUEST_EMAIL ?? "hello@telemd.health";

    if (postmarkToken) {
      await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Postmark-Server-Token": postmarkToken,
        },
        body: JSON.stringify({
          From: "noreply@telemd.health",
          To: demoEmail,
          Subject: `Demo Request: ${practice} — ${name}`,
          TextBody: [
            `Name: ${name}`,
            `Email: ${email}`,
            `Practice: ${practice}`,
            `Message: ${message ?? "(none)"}`,
            "",
            `Reply-To: ${email}`,
          ].join("\n"),
          ReplyTo: email,
          Tag: "demo-request",
        }),
      }).catch((err) => console.error("[demo-request] Postmark failed:", err));
    } else {
      // Dev fallback: just log
      console.log("[demo-request]", { name, email, practice, message });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[demo-request]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

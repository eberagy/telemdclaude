import type { EmailOptions, ToolResult } from "./types.js";

const POSTMARK_API_URL = "https://api.postmarkapp.com/email";

export async function sendEmail(opts: EmailOptions): Promise<ToolResult> {
  try {
    const token = process.env.POSTMARK_API_TOKEN;
    if (!token) throw new Error("POSTMARK_API_TOKEN not set");

    const res = await fetch(POSTMARK_API_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": token,
      },
      body: JSON.stringify({
        From: opts.from ?? process.env.POSTMARK_FROM_EMAIL ?? "noreply@telemd.health",
        To: opts.to,
        Subject: opts.subject,
        TextBody: opts.textBody,
        ...(opts.htmlBody ? { HtmlBody: opts.htmlBody } : {}),
        MessageStream: "outbound",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `Postmark error: ${err}` };
    }

    const data = await res.json() as { MessageID: string };
    return { ok: true, data: { messageId: data.MessageID } };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

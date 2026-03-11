import { ServerClient } from "postmark";

let _client: ServerClient | null = null;

function getClient(): ServerClient | null {
  if (!process.env.POSTMARK_TOKEN) return null;
  if (!_client) _client = new ServerClient(process.env.POSTMARK_TOKEN);
  return _client;
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string
): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn("[email] POSTMARK_TOKEN not configured — skipping email to", to);
    return;
  }
  await client.sendEmail({
    From: process.env.POSTMARK_FROM ?? "noreply@telemd.app",
    To: to,
    Subject: subject,
    TextBody: text,
    MessageStream: "outbound",
  });
}

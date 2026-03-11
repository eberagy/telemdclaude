import { Twilio } from "twilio";

let _client: Twilio | null = null;

function getClient(): Twilio | null {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN)
    return null;
  if (!_client)
    _client = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  return _client;
}

export async function sendSMS(to: string, body: string): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn("[sms] Twilio credentials not configured — skipping SMS to", to);
    return;
  }
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) throw new Error("TWILIO_PHONE_NUMBER not configured");
  await client.messages.create({ from, to, body });
}

import { WebClient } from "@slack/web-api";
import type { SlackMessageOptions, ToolResult } from "./types.js";

let _client: WebClient | null = null;

function getClient(): WebClient {
  if (!_client) {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) throw new Error("SLACK_BOT_TOKEN not set");
    _client = new WebClient(token);
  }
  return _client;
}

export async function sendSlackMessage(opts: SlackMessageOptions): Promise<ToolResult> {
  try {
    const client = getClient();
    const res = await client.chat.postMessage({
      channel: opts.channel,
      text: opts.text,
      ...(opts.blocks ? { blocks: opts.blocks as never } : {}),
    });
    return { ok: true, data: { ts: res.ts, channel: res.channel } };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

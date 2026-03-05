// Re-export from shared slack service module for worker use
// This avoids circular dependency with the API layer

import { WebClient } from "@slack/web-api";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const APPROVAL_CHANNEL = process.env.SLACK_CHANNEL_ID ?? "#general";
const AGENTOPS_URL = process.env.AGENTOPS_PUBLIC_URL ?? "http://localhost:4001";

const RISK_EMOJI: Record<string, string> = {
  LOW: ":white_circle:",
  MEDIUM: ":large_yellow_circle:",
  HIGH: ":large_orange_circle:",
  CRITICAL: ":red_circle:",
};

export async function sendApprovalRequest(approval: {
  id: string;
  token: string;
  agentName: string;
  summary: string;
  action: string;
  risk: string;
  rollbackPlan?: string | null;
  whySafe?: string | null;
  expiresAt: Date;
}): Promise<void> {
  const approvalUrl = `${AGENTOPS_URL}/approvals/${approval.token}`;
  const riskEmoji = RISK_EMOJI[approval.risk] ?? ":white_circle:";

  try {
    await slack.chat.postMessage({
      channel: APPROVAL_CHANNEL,
      text: `${riskEmoji} Agent Approval Required: ${approval.summary}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${riskEmoji} Agent Approval Required`,
          },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Agent:* ${approval.agentName}` },
            { type: "mrkdwn", text: `*Risk:* ${approval.risk}` },
            { type: "mrkdwn", text: `*Summary:* ${approval.summary}` },
            {
              type: "mrkdwn",
              text: `*Expires:* ${approval.expiresAt.toLocaleString()}`,
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Proposed Action:*\n\`\`\`${approval.action.substring(0, 800)}\`\`\``,
          },
        },
        ...(approval.rollbackPlan
          ? [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*Rollback:* ${approval.rollbackPlan}`,
                },
              },
            ]
          : []),
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Approve ✅" },
              style: "primary",
              value: JSON.stringify({ token: approval.token, decision: "APPROVED" }),
              action_id: "approve_action",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "Deny ❌" },
              style: "danger",
              value: JSON.stringify({ token: approval.token, decision: "DENIED" }),
              action_id: "deny_action",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "Request Changes ✍️" },
              value: JSON.stringify({
                token: approval.token,
                decision: "CHANGES_REQUESTED",
              }),
              action_id: "changes_action",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "View in Portal" },
              url: approvalUrl,
              action_id: "view_action",
            },
          ],
        },
      ],
    });
    console.log(`[slack] Approval request sent for token ${approval.token}`);
  } catch (err) {
    console.error("[slack] Failed to send approval request:", err);
  }
}

export async function sendDailyBrief(data: {
  runsCompleted: number;
  approvalsPending: number;
  costToday: number;
  alertsCount: number;
}): Promise<void> {
  try {
    await slack.chat.postMessage({
      channel: APPROVAL_CHANNEL,
      text: `:sunny: AgentOps Daily Brief — ${new Date().toLocaleDateString()}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `:sunny: AgentOps Daily Brief — ${new Date().toLocaleDateString()}`,
          },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Runs Completed:* ${data.runsCompleted}` },
            { type: "mrkdwn", text: `*Pending Approvals:* ${data.approvalsPending}` },
            {
              type: "mrkdwn",
              text: `*Cost Today:* $${(data.costToday / 100).toFixed(2)}`,
            },
            { type: "mrkdwn", text: `*Alerts:* ${data.alertsCount}` },
          ],
        },
      ],
    });
  } catch (err) {
    console.error("[slack] Daily brief failed:", err);
  }
}

export async function sendOpsAlert(
  title: string,
  message: string,
  level: "info" | "warning" | "critical" = "warning"
): Promise<void> {
  const ALERTS_CHANNEL = process.env.SLACK_ALERTS_CHANNEL_ID ?? APPROVAL_CHANNEL;
  const emoji =
    level === "critical" ? ":red_circle:" : level === "warning" ? ":warning:" : ":information_source:";

  try {
    await slack.chat.postMessage({
      channel: ALERTS_CHANNEL,
      text: `${emoji} *${title}*\n${message}`,
    });
  } catch (err) {
    console.error("[slack] Alert failed:", err);
  }
}

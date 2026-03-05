import { WebClient } from "@slack/web-api";
import type { ApprovalRequest } from "@prisma/client";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

const APPROVAL_CHANNEL = process.env.SLACK_CHANNEL_ID ?? "#general";
const ALERTS_CHANNEL = process.env.SLACK_ALERTS_CHANNEL_ID ?? APPROVAL_CHANNEL;
const AGENTOPS_URL = process.env.AGENTOPS_PUBLIC_URL ?? "http://localhost:4001";

const RISK_EMOJI: Record<string, string> = {
  LOW: ":white_circle:",
  MEDIUM: ":large_yellow_circle:",
  HIGH: ":large_orange_circle:",
  CRITICAL: ":red_circle:",
};

/**
 * Send an approval request to Slack with interactive buttons.
 */
export async function sendApprovalRequest(
  approval: ApprovalRequest
): Promise<void> {
  const approvalUrl = `${AGENTOPS_URL}/approvals/${approval.token}`;
  const riskEmoji = RISK_EMOJI[approval.risk] ?? ":white_circle:";

  try {
    await slack.chat.postMessage({
      channel: APPROVAL_CHANNEL,
      text: `[Agent Approval Required] ${approval.summary}`,
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
        ...(approval.action
          ? [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*Action:*\n\`\`\`${approval.action.substring(0, 500)}\`\`\``,
                },
              },
            ]
          : []),
        ...(approval.rollbackPlan
          ? [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*Rollback Plan:* ${approval.rollbackPlan}`,
                },
              },
            ]
          : []),
        ...(approval.whySafe
          ? [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*Why Safe:* ${approval.whySafe}`,
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
              text: { type: "plain_text", text: "View Details" },
              url: approvalUrl,
              action_id: "view_action",
            },
          ],
        },
      ],
    });
  } catch (err) {
    console.error("[slack] Failed to send approval request:", err);
    // Don't throw — approval system continues via web inbox
  }
}

/**
 * Notify Slack of an approval decision.
 */
export async function notifyApprovalResult(
  approval: ApprovalRequest
): Promise<void> {
  const emoji =
    approval.status === "APPROVED"
      ? "✅"
      : approval.status === "DENIED"
      ? "❌"
      : "✍️";

  try {
    await slack.chat.postMessage({
      channel: APPROVAL_CHANNEL,
      text: `${emoji} Approval ${approval.status} by ${approval.decidedBy ?? "admin"}: ${approval.summary}`,
    });
  } catch (err) {
    console.error("[slack] Failed to notify approval result:", err);
  }
}

/**
 * Send an ops alert to the alerts channel.
 */
export async function sendOpsAlert(
  title: string,
  message: string,
  level: "info" | "warning" | "critical" = "warning"
): Promise<void> {
  const emoji =
    level === "critical" ? ":red_circle:" : level === "warning" ? ":warning:" : ":information_source:";

  try {
    await slack.chat.postMessage({
      channel: ALERTS_CHANNEL,
      text: `${emoji} *${title}*\n${message}`,
    });
  } catch (err) {
    console.error("[slack] Failed to send alert:", err);
  }
}

/**
 * Handle Slack interactive action callback (approve/deny buttons).
 */
export async function handleSlackAction(payload: {
  actions: Array<{ action_id: string; value: string }>;
  user: { id: string; name: string };
}): Promise<void> {
  const action = payload.actions[0];
  if (!action) return;

  const { token, decision } = JSON.parse(action.value) as {
    token: string;
    decision: "APPROVED" | "DENIED" | "CHANGES_REQUESTED";
  };

  // Import prisma lazily to avoid circular deps
  const { prisma } = await import("@/lib/prisma");

  const approval = await prisma.approvalRequest.findUnique({ where: { token } });
  if (!approval || approval.status !== "PENDING") return;

  await prisma.approvalRequest.update({
    where: { id: approval.id },
    data: {
      status: decision,
      decidedAt: new Date(),
      decidedBy: `slack:${payload.user.name}`,
    },
  });

  await notifyApprovalResult({ ...approval, status: decision, decidedBy: payload.user.name });
}

/**
 * Send daily brief to #general.
 */
export async function sendDailyBrief(data: {
  runsCompleted: number;
  approvalsPending: number;
  costToday: number;
  alertsCount: number;
}): Promise<void> {
  try {
    await slack.chat.postMessage({
      channel: APPROVAL_CHANNEL,
      text: `:morning: AgentOps Daily Brief`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: ":morning: AgentOps Daily Brief" },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Runs Completed:* ${data.runsCompleted}` },
            {
              type: "mrkdwn",
              text: `*Pending Approvals:* ${data.approvalsPending}`,
            },
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
    console.error("[slack] Failed to send daily brief:", err);
  }
}

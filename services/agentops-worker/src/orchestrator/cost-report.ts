/**
 * Weekly cost report — emails spend summary to admin.
 * Runs every Monday 9 AM ET via scheduler.
 * Cost: 1 Postmark email/week ≈ free.
 */

import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

export async function sendWeeklyCostReport(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const postmarkToken = process.env.POSTMARK_TOKEN;
  if (!adminEmail || !postmarkToken) return;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalSpend, byAgent, runStats] = await Promise.all([
    prisma.budgetEntry.aggregate({
      _sum: { costCents: true, tokens: true },
      where: { createdAt: { gte: weekAgo } },
    }),
    prisma.budgetEntry.groupBy({
      by: ["agentId"],
      _sum: { costCents: true, tokens: true },
      where: { createdAt: { gte: weekAgo } },
      orderBy: { _sum: { costCents: "desc" } },
    }),
    prisma.agentRun.groupBy({
      by: ["status"],
      _count: true,
      where: { createdAt: { gte: weekAgo } },
    }),
  ]);

  const agentNames = await prisma.agent.findMany({ select: { id: true, name: true } });
  const agentNameMap = Object.fromEntries(agentNames.map((a) => [a.id, a.name]));

  const totalDollars = ((totalSpend._sum.costCents ?? 0) / 100).toFixed(2);
  const totalTokens = (totalSpend._sum.tokens ?? 0).toLocaleString();

  const agentRows = byAgent
    .map((a) => {
      const name = agentNameMap[a.agentId] ?? a.agentId;
      const cost = ((a._sum.costCents ?? 0) / 100).toFixed(2);
      const tokens = (a._sum.tokens ?? 0).toLocaleString();
      return `  - ${name}: $${cost} (${tokens} tokens)`;
    })
    .join("\n");

  const runRows = runStats
    .map((r) => `  - ${r.status}: ${r._count}`)
    .join("\n");

  const body = `AgentOps Weekly Cost Report
===========================
Week ending: ${new Date().toLocaleDateString()}

TOTAL SPEND: $${totalDollars}
TOTAL TOKENS: ${totalTokens}

BY AGENT:
${agentRows || "  No spend this week"}

RUN STATUS:
${runRows || "  No runs this week"}

---
Manage budgets: ${process.env.AGENTOPS_PUBLIC_URL ?? "http://localhost:4001"}/budgets
`;

  await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": postmarkToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      From: process.env.POSTMARK_FROM ?? "noreply@telemd.app",
      To: adminEmail,
      Subject: `AgentOps Weekly Report — $${totalDollars} spend`,
      TextBody: body,
      MessageStream: "outbound",
    }),
  }).catch((err) => console.error("[cost-report] Email failed:", err));

  console.log(`[cost-report] Sent weekly report to ${adminEmail}: $${totalDollars}`);
}

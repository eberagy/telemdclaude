import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { sendDailyBrief } from "../integrations/slack.js";
import { sendWeeklyCostReport } from "./cost-report.js";

const prisma = new PrismaClient();

export function setupScheduledJobs() {
  // Daily brief at 9 AM Eastern
  cron.schedule(
    "0 9 * * *",
    async () => {
      console.log("[scheduler] Sending daily brief...");
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [runsCompleted, approvalsPending, budgetEntries] = await Promise.all([
        prisma.agentRun.count({
          where: { status: "COMPLETED", completedAt: { gte: today } },
        }),
        prisma.approvalRequest.count({ where: { status: "PENDING" } }),
        prisma.budgetEntry.aggregate({
          _sum: { costCents: true },
          where: { createdAt: { gte: today } },
        }),
      ]);

      await sendDailyBrief({
        runsCompleted,
        approvalsPending,
        costToday: budgetEntries._sum.costCents ?? 0,
        alertsCount: 0,
      });
    },
    { timezone: "America/New_York" }
  );

  // Reset daily budgets at midnight
  cron.schedule(
    "0 0 * * *",
    async () => {
      console.log("[scheduler] Resetting daily budgets...");
      await prisma.agent.updateMany({
        data: { spentTodayCents: 0, lastResetAt: new Date() },
      });
    },
    { timezone: "America/New_York" }
  );

  // Expire old pending approvals every hour
  cron.schedule("0 * * * *", async () => {
    const expired = await prisma.approvalRequest.updateMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });
    if (expired.count > 0) {
      console.log(`[scheduler] Expired ${expired.count} approval requests`);
    }
  });

  // Weekly cost report every Monday at 9 AM Eastern
  cron.schedule(
    "0 9 * * 1",
    async () => {
      console.log("[scheduler] Sending weekly cost report...");
      await sendWeeklyCostReport();
    },
    { timezone: "America/New_York" }
  );

  console.log("[scheduler] Scheduled jobs configured");
}

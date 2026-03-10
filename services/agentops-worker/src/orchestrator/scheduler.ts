import cron from "node-cron";
import { PrismaClient } from "../../generated/prisma";
import { sendDailyBrief, sendOpsAlert } from "../integrations/slack.js";
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

  // Expire old pending approvals every hour, fail their runs, and re-queue tasks
  cron.schedule("0 * * * *", async () => {
    const now = new Date();

    // Find approvals that are about to be expired (get ids before updating)
    const expiredApprovals = await prisma.approvalRequest.findMany({
      where: { status: "PENDING", expiresAt: { lt: now } },
      select: { id: true, runId: true },
    });

    if (expiredApprovals.length === 0) return;

    // Mark approvals as EXPIRED
    await prisma.approvalRequest.updateMany({
      where: { id: { in: expiredApprovals.map((a: { id: string; runId: string }) => a.id) } },
      data: { status: "EXPIRED" },
    });

    const runIds = expiredApprovals.map((a: { id: string; runId: string }) => a.runId);

    // Fail the associated agent runs
    await prisma.agentRun.updateMany({
      where: { id: { in: runIds } },
      data: {
        status: "FAILED",
        error: "Approval expired — task re-queued",
        completedAt: now,
      },
    });

    // Re-queue the original tasks
    const runs = await prisma.agentRun.findMany({
      where: { id: { in: runIds } },
      select: { taskId: true },
    });
    const taskIds = runs
      .map((r: { taskId: string | null }) => r.taskId)
      .filter((id: string | null): id is string => id !== null);

    if (taskIds.length > 0) {
      await prisma.queuedTask.updateMany({
        where: { id: { in: taskIds } },
        data: { status: "PENDING", assignedTo: null },
      });
    }

    await sendOpsAlert(
      "Approval Expiry",
      `${expiredApprovals.length} approval(s) expired. Runs marked FAILED and ${taskIds.length} task(s) re-queued.`,
      "warning"
    );
    console.log(
      `[scheduler] Expired ${expiredApprovals.length} approvals, re-queued ${taskIds.length} tasks`
    );
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

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [agentsActive, queuePending, approvalsPending, runsToday, costToday] =
      await Promise.all([
        prisma.agent.count({ where: { isActive: true, isPaused: false } }),
        prisma.queuedTask.count({ where: { status: "PENDING" } }),
        prisma.approvalRequest.count({ where: { status: "PENDING" } }),
        prisma.agentRun.count({ where: { status: "COMPLETED", completedAt: { gte: today } } }),
        prisma.budgetEntry.aggregate({
          _sum: { costCents: true },
          where: { createdAt: { gte: today } },
        }),
      ]);

    return NextResponse.json({
      agentsActive,
      queuePending,
      approvalsPending,
      runsToday,
      costToday: costToday._sum.costCents ?? 0,
    });
  } catch (err) {
    console.error("[dashboard]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

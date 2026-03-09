import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/budgets/summary — per-agent budget summaries
export async function GET(_req: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        budgetCentsPerDay: true,
        spentTodayCents: true,
      },
      orderBy: { name: "asc" },
    });

    const weeklyTotals = await prisma.budgetEntry.groupBy({
      by: ["agentId"],
      _sum: { costCents: true },
      where: { createdAt: { gte: weekAgo } },
    });

    const totalTotals = await prisma.budgetEntry.groupBy({
      by: ["agentId"],
      _sum: { costCents: true },
    });

    const weeklyMap = Object.fromEntries(weeklyTotals.map((w) => [w.agentId, w._sum.costCents ?? 0]));
    const totalMap = Object.fromEntries(totalTotals.map((t) => [t.agentId, t._sum.costCents ?? 0]));

    const summaries = agents.map((a) => ({
      agentId: a.id,
      agentName: a.name,
      agentDisplayName: a.displayName,
      budgetCentsPerDay: a.budgetCentsPerDay,
      spentTodayCents: a.spentTodayCents,
      spentThisWeekCents: weeklyMap[a.id] ?? 0,
      spentTotalCents: totalMap[a.id] ?? 0,
    }));

    return NextResponse.json({ summaries });
  } catch (err) {
    console.error("[budgets/summary GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

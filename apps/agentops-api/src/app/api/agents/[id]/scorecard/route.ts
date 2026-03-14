import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/agents/[id]/scorecard — aggregate performance stats for an agent.
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const agent = await prisma.agent.findUnique({
      where: { id },
      select: { id: true, name: true, displayName: true },
    });

    if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [totals, ratingAgg] = await Promise.all([
      prisma.agentRun.groupBy({
        by: ["status"],
        where: { agentId: id },
        _count: { id: true },
        _avg: { costCents: true, tokenUsed: true },
      }),
      prisma.agentRun.aggregate({
        where: { agentId: id, ratingScore: { not: null } },
        _avg: { ratingScore: true },
        _count: { ratingScore: true },
      }),
    ]);

    const statusMap = Object.fromEntries(
      totals.map((row) => [row.status, row._count.id])
    );

    const totalRuns = totals.reduce((sum, row) => sum + row._count.id, 0);
    const completedRuns = statusMap["COMPLETED"] ?? 0;
    const failedRuns = statusMap["FAILED"] ?? 0;

    // Compute weighted averages across all status groups
    let totalCostCents = 0;
    let totalTokens = 0;
    for (const row of totals) {
      totalCostCents += (row._avg.costCents ?? 0) * row._count.id;
      totalTokens += (row._avg.tokenUsed ?? 0) * row._count.id;
    }

    return NextResponse.json({
      agentId: id,
      agentName: agent.name,
      displayName: agent.displayName,
      totalRuns,
      completedRuns,
      failedRuns,
      successRate: totalRuns > 0 ? completedRuns / totalRuns : null,
      avgCostCents: totalRuns > 0 ? Math.round(totalCostCents / totalRuns) : null,
      avgTokens: totalRuns > 0 ? Math.round(totalTokens / totalRuns) : null,
      avgRating: ratingAgg._avg.ratingScore,
      ratedRunsCount: ratingAgg._count.ratingScore,
    });
  } catch (err) {
    console.error("[agents/:id/scorecard GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/budgets/history - last 20 BudgetEntry rows (internal service, no auth)
export async function GET() {
  try {
    const rows = await prisma.budgetEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        agentId: true,
        provider: true,
        model: true,
        tokens: true,
        costCents: true,
        createdAt: true,
        runId: true,
      },
    });

    const entries = rows.map((r) => ({
      id: r.id,
      agentId: r.agentId,
      provider: r.provider,
      model: r.model,
      tokens: r.tokens,
      costCents: r.costCents,
      createdAt: r.createdAt,
      run: r.runId ? { id: r.runId } : null,
    }));

    return NextResponse.json({ entries });
  } catch (err) {
    console.error("[budgets/history GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

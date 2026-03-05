import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/budgets/entries?limit=50&agentId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const agentId = searchParams.get("agentId");

    const entries = await prisma.budgetEntry.findMany({
      where: agentId ? { agentId } : {},
      include: {
        agent: { select: { name: true, displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ entries });
  } catch (err) {
    console.error("[budgets/entries GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

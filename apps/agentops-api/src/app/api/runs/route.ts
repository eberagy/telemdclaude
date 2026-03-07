import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/runs?status=COMPLETED&limit=50
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") ?? "50");

    const runs = await prisma.agentRun.findMany({
      where: status ? { status: status as import("../../../generated/prisma").AgentRunStatus } : undefined,
      include: {
        agent: { select: { name: true, displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ runs });
  } catch (err) {
    console.error("[runs GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

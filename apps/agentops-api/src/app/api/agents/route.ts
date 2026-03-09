import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/agents — list all agents
export async function GET(_req: NextRequest) {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ agents });
  } catch (err) {
    console.error("[agents GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

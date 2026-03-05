import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/queue?status=PENDING&limit=50
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "PENDING";
    const limit = parseInt(searchParams.get("limit") ?? "50");

    const tasks = await prisma.queuedTask.findMany({
      where: status === "ALL" ? {} : { status },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: limit,
    });

    return NextResponse.json({ tasks });
  } catch (err) {
    console.error("[queue GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

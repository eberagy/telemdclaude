import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      service: "agentops-api",
      db: "ok",
      latencyMs: Date.now() - start,
      ts: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "error", service: "agentops-api", db: "unreachable" },
      { status: 503 }
    );
  }
}

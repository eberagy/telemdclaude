/**
 * GET /api/internal/stats/appointments — Aggregate appointment counts for agents.
 * Internal only — guarded by x-internal-secret header. Returns NO PHI.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function requireInternalSecret(req: NextRequest): boolean {
  const secret = process.env.AGENTOPS_INTERNAL_SECRET;
  if (!secret) return false; // disabled if not configured
  return req.headers.get("x-internal-secret") === secret;
}

export async function GET(req: NextRequest) {
  if (!requireInternalSecret(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [total, today_, thisWeek, thisMonth, byStatus] = await Promise.all([
    prisma.appointment.count(),
    prisma.appointment.count({ where: { createdAt: { gte: today } } }),
    prisma.appointment.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.appointment.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.appointment.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  return NextResponse.json({
    total,
    today: today_,
    thisWeek,
    thisMonth,
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count.status])),
  });
}

/**
 * GET /api/internal/stats/seats — Active clinician seat count for billing oversight.
 * Internal only — guarded by x-internal-secret header. Returns NO PHI.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function requireInternalSecret(req: NextRequest): boolean {
  const secret = process.env.AGENTOPS_INTERNAL_SECRET;
  if (!secret) return false;
  return req.headers.get("x-internal-secret") === secret;
}

export async function GET(req: NextRequest) {
  if (!requireInternalSecret(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [total, active, pending, inactive, byPractice] = await Promise.all([
    prisma.practiceMember.count({ where: { role: "Clinician" } }),
    prisma.practiceMember.count({ where: { role: "Clinician", seatStatus: "ACTIVE" } }),
    prisma.practiceMember.count({ where: { role: "Clinician", seatStatus: "PENDING" } }),
    prisma.practiceMember.count({ where: { role: "Clinician", seatStatus: "INACTIVE" } }),
    prisma.practiceMember.groupBy({
      by: ["practiceId"],
      _count: { id: true },
      where: { role: "Clinician", seatStatus: "ACTIVE" },
    }),
  ]);

  return NextResponse.json({
    total,
    active,
    pending,
    inactive,
    practiceCount: byPractice.length,
  });
}

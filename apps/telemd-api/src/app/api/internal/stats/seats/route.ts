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

  // seatStatus lives on ClinicianProfile (1-1 with PracticeMember via memberId)
  const [total, active, pending, inactive] = await Promise.all([
    prisma.clinicianProfile.count(),
    prisma.clinicianProfile.count({ where: { seatStatus: "ACTIVE" } }),
    prisma.clinicianProfile.count({ where: { seatStatus: "PENDING" } }),
    prisma.clinicianProfile.count({ where: { seatStatus: "INACTIVE" } }),
  ]);

  // Count distinct practices with at least one active clinician seat
  const activeClinicians = await prisma.practiceMember.findMany({
    where: { role: "Clinician", clinician: { seatStatus: "ACTIVE" } },
    select: { practiceId: true },
    distinct: ["practiceId"],
  });

  return NextResponse.json({
    total,
    active,
    pending,
    inactive,
    practiceCount: activeClinicians.length,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requirePHIAccess, AuthorizationError } from "@/lib/rbac";

interface RouteParams {
  params: Promise<{ id: string }>; // patientId
}

// GET /api/patients/[id]/vitals — clinician or owner views patient's vitals
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: patientId } = await params;
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Find any appointment to resolve practiceId for PHI check
    const recentAppt = await prisma.appointment.findFirst({
      where: { patientId },
      select: { id: true, practiceId: true },
      orderBy: { createdAt: "desc" },
    });

    if (!recentAppt) return NextResponse.json({ error: "No appointments found for this patient" }, { status: 404 });

    await requirePHIAccess(recentAppt.practiceId, recentAppt.id);

    const type = req.nextUrl.searchParams.get("type");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50");

    const vitals = await prisma.patientVital.findMany({
      where: {
        patientId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(type ? { type: type as any } : {}),
      },
      orderBy: { recordedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ vitals });
  } catch (err) {
    if (err instanceof AuthorizationError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("[patients/:id/vitals GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

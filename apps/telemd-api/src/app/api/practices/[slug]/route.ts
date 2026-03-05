import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/practices/[slug] — public practice info for booking page
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const practice = await prisma.practice.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        serviceState: true,
        patientAttestationText: true,
        notTriageBannerText: true,
        appointmentTypes: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            durationMinutes: true,
            priceInCents: true,
          },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!practice) {
      return NextResponse.json({ error: "Practice not found" }, { status: 404 });
    }

    // PA-only gate: only serve booking info for PA practices
    if (practice.serviceState !== "PA") {
      return NextResponse.json(
        { error: "This practice is not available in your region." },
        { status: 403 }
      );
    }

    return NextResponse.json({ practice });
  } catch (err) {
    console.error("[practices GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

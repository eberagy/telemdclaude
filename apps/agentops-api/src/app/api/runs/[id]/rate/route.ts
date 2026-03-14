import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const RateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/runs/[id]/rate — submit a 1-5 operator rating for a completed run.
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const body = await req.json();
    const parsed = RateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "rating (1-5) is required" },
        { status: 400 }
      );
    }

    const run = await prisma.agentRun.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (run.status !== "COMPLETED" && run.status !== "FAILED") {
      return NextResponse.json(
        { error: "Only completed or failed runs can be rated." },
        { status: 400 }
      );
    }

    const updated = await prisma.agentRun.update({
      where: { id },
      data: {
        ratingScore: parsed.data.rating,
        ratingFeedback: parsed.data.feedback ?? null,
      },
      select: { id: true, ratingScore: true, ratingFeedback: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[runs/:id/rate POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

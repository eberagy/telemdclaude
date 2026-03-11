import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/runs/[id]/question — returns the pending question if run is AWAITING_INPUT
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const run = await prisma.agentRun.findUnique({
      where: { id },
      select: { status: true, question: true, questionAskedAt: true },
    });

    if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (run.status !== "AWAITING_INPUT") {
      return NextResponse.json(
        { error: "Run is not awaiting input." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      question: run.question,
      questionAskedAt: run.questionAskedAt,
    });
  } catch (err) {
    console.error("[runs/:id/question GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

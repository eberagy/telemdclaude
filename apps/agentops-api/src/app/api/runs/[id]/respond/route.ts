import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const RespondSchema = z.object({
  answer: z.string().min(1),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/runs/[id]/respond — submit a human answer to an AWAITING_INPUT run.
// Appends the answer to the result field and sets status back to RUNNING so the
// worker picks it up on the next poll cycle.
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const body = await req.json();
    const parsed = RespondSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "answer is required" }, { status: 400 });
    }

    const run = await prisma.agentRun.findUnique({
      where: { id },
      select: { id: true, status: true, result: true },
    });

    if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (run.status !== "AWAITING_INPUT") {
      return NextResponse.json(
        { error: "Run is not awaiting input." },
        { status: 400 }
      );
    }

    const updatedResult = (run.result ?? "") + `\nHUMAN_ANSWER: ${parsed.data.answer}`;

    await prisma.agentRun.update({
      where: { id },
      data: {
        status: "RUNNING",
        result: updatedResult,
        question: null,
        questionAskedAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[runs/:id/respond POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

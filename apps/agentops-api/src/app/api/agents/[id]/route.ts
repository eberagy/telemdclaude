import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ActionSchema = z.object({
  action: z.enum(["pause", "resume", "disable", "enable"]).optional(),
  autonomyLevel: z.enum(["DRAFT_ONLY", "NORMAL", "AGGRESSIVE"]).optional(),
  budgetCentsPerDay: z.number().int().min(0).optional(),
});

// POST /api/agents/[id] — control actions (pause, resume, disable, enable)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = ActionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { action } = parsed.data;
    if (!action) return NextResponse.json({ error: "action required" }, { status: 400 });

    const update = {
      pause: { isPaused: true },
      resume: { isPaused: false },
      disable: { isActive: false },
      enable: { isActive: true },
    }[action];

    const agent = await prisma.agent.update({ where: { id }, data: update });
    return NextResponse.json({ agent });
  } catch (err) {
    console.error("[agents/[id] POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/agents/[id] — update autonomy level, budget
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = ActionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { autonomyLevel, budgetCentsPerDay } = parsed.data;

    const agent = await prisma.agent.update({
      where: { id },
      data: {
        ...(autonomyLevel ? { autonomyLevel } : {}),
        ...(budgetCentsPerDay !== undefined ? { budgetCentsPerDay } : {}),
      },
    });

    return NextResponse.json({ agent });
  } catch (err) {
    console.error("[agents/[id] PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

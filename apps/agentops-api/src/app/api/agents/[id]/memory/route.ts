import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const CreateMemorySchema = z.object({
  key: z.string().min(1).max(255),
  value: z.string().min(1),
  importance: z.number().int().min(1).max(5).optional(),
});

// GET /api/agents/[id]/memory — list all memories for an agent
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const memories = await prisma.agentMemory.findMany({
      where: { agentId: id },
      orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
    });
    return NextResponse.json({ memories });
  } catch (err) {
    console.error("[agents/[id]/memory GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/agents/[id]/memory — create a new memory entry
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = CreateMemorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
    }

    const memory = await prisma.agentMemory.create({
      data: {
        agentId: id,
        key: parsed.data.key,
        value: parsed.data.value,
        importance: parsed.data.importance ?? 1,
      },
    });

    return NextResponse.json({ memory }, { status: 201 });
  } catch (err) {
    console.error("[agents/[id]/memory POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

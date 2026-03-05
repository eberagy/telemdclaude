import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const UpdateSchema = z.object({
  status: z.enum(["PENDING", "ASSIGNED", "COMPLETED", "CANCELLED"]).optional(),
  priority: z.number().int().min(1).max(10).optional(),
  assignedTo: z.string().optional().nullable(),
});

// PATCH /api/queue/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const task = await prisma.queuedTask.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return NextResponse.json({ task });
  } catch (err) {
    console.error("[queue/[id] PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

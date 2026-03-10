import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/agents/[id]/memory/[memoryId] — remove a single memory entry
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; memoryId: string }> }
) {
  try {
    const { id, memoryId } = await params;
    await prisma.agentMemory.delete({
      where: { id: memoryId, agentId: id },
    });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[agents/[id]/memory/[memoryId] DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

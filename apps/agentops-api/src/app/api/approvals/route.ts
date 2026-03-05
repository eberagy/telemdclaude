import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";
import { z } from "zod";

// GET /api/approvals — List pending approvals
export async function GET(req: NextRequest) {
  await requireAdminAuth(req);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "PENDING";

  const approvals = await prisma.approvalRequest.findMany({
    where: { status: status as "PENDING" | "APPROVED" | "DENIED" | "CHANGES_REQUESTED" | "EXPIRED" },
    include: {
      run: {
        select: { id: true, agentId: true, prompt: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ approvals });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyApprovalResult } from "@/services/slack";
import { ApprovalDecisionSchema } from "@telemd/shared";

interface RouteParams {
  params: Promise<{ token: string }>;
}

// GET /api/approvals/[token] — Get approval details (public, token-auth)
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  const approval = await prisma.approvalRequest.findUnique({
    where: { token },
    include: {
      run: { select: { id: true, agentId: true } },
    },
  });

  if (!approval) {
    return NextResponse.json({ error: "Approval not found" }, { status: 404 });
  }

  // Check expiry
  if (approval.expiresAt < new Date() && approval.status === "PENDING") {
    await prisma.approvalRequest.update({
      where: { id: approval.id },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json({ error: "Approval has expired" }, { status: 410 });
  }

  return NextResponse.json({ approval });
}

// POST /api/approvals/[token] — Decide on approval (Approve/Deny/Changes)
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  const body = await req.json();
  const parsed = ApprovalDecisionSchema.safeParse({ token, ...body });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { decision, note } = parsed.data;

  const approval = await prisma.approvalRequest.findUnique({
    where: { token },
  });

  if (!approval) {
    return NextResponse.json({ error: "Approval not found" }, { status: 404 });
  }

  if (approval.status !== "PENDING") {
    return NextResponse.json(
      { error: `Approval already ${approval.status}` },
      { status: 409 }
    );
  }

  if (approval.expiresAt < new Date()) {
    await prisma.approvalRequest.update({
      where: { id: approval.id },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json({ error: "Approval has expired" }, { status: 410 });
  }

  // Record decision
  const updated = await prisma.approvalRequest.update({
    where: { id: approval.id },
    data: {
      status: decision,
      decisionNote: note,
      decidedAt: new Date(),
      decidedBy: req.headers.get("x-admin-user") ?? "web-inbox",
    },
  });

  // Notify Slack of the decision
  await notifyApprovalResult(updated).catch((err) => {
    console.error("[approvals] Slack notification failed:", err);
  });

  return NextResponse.json({ success: true, status: updated.status });
}

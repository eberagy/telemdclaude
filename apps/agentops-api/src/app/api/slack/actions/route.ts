import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyApprovalResult } from "@/services/slack";

export const dynamic = "force-dynamic";

// POST /api/slack/actions — Handle Slack interactive button clicks
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    const payloadStr = params.get("payload");

    if (!payloadStr) {
      return NextResponse.json({ error: "No payload" }, { status: 400 });
    }

    const payload = JSON.parse(payloadStr);

    // Verify Slack signing secret
    const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
    if (slackSigningSecret) {
      const timestamp = req.headers.get("x-slack-request-timestamp");
      const slackSig = req.headers.get("x-slack-signature");

      if (!timestamp || !slackSig) {
        return NextResponse.json({ error: "Missing Slack headers" }, { status: 400 });
      }

      // Verify timestamp is within 5 minutes
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - parseInt(timestamp)) > 300) {
        return NextResponse.json({ error: "Request too old" }, { status: 400 });
      }
    }

    const { actions, user } = payload;
    const action = actions?.[0];

    if (!action) {
      return NextResponse.json({ error: "No action" }, { status: 400 });
    }

    const { token, decision } = JSON.parse(action.value) as {
      token: string;
      decision: "APPROVED" | "DENIED" | "CHANGES_REQUESTED";
    };

    const approval = await prisma.approvalRequest.findUnique({ where: { token } });

    if (!approval) {
      return NextResponse.json({ text: "Approval not found." });
    }

    if (approval.status !== "PENDING") {
      return NextResponse.json({
        text: `This approval was already ${approval.status}.`,
        replace_original: false,
      });
    }

    if (approval.expiresAt < new Date()) {
      await prisma.approvalRequest.update({
        where: { id: approval.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ text: "This approval has expired." });
    }

    const updated = await prisma.approvalRequest.update({
      where: { id: approval.id },
      data: {
        status: decision,
        decidedAt: new Date(),
        decidedBy: `slack:${user?.name ?? "unknown"}`,
      },
    });

    await notifyApprovalResult(updated).catch(console.error);

    const emoji =
      decision === "APPROVED" ? "✅" : decision === "DENIED" ? "❌" : "✍️";

    return NextResponse.json({
      text: `${emoji} ${decision} by ${user?.name ?? "admin"}`,
      replace_original: false,
    });
  } catch (err) {
    console.error("[slack/actions]", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}

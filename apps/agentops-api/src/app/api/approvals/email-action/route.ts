import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const EMAIL_SECRET = process.env.AGENTOPS_EMAIL_SECRET ?? "";

/**
 * Verify HMAC-SHA256(token + decision, AGENTOPS_EMAIL_SECRET) in constant time.
 */
function verifySignature(token: string, decision: string, sig: string): boolean {
  if (!EMAIL_SECRET) return false;
  const expected = createHmac("sha256", EMAIL_SECRET)
    .update(token + decision)
    .digest("hex");
  // Lengths must match before timingSafeEqual to avoid Buffer length mismatch error
  if (sig.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

function htmlPage(title: string, heading: string, message: string, color: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; align-items: center;
           justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
    .card { background: white; border-radius: 8px; padding: 2.5rem 3rem;
            text-align: center; box-shadow: 0 2px 16px rgba(0,0,0,.08); max-width: 420px; }
    h2 { color: ${color}; margin: 0 0 .75rem; font-size: 1.5rem; }
    p  { color: #555; margin: 0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <h2>${heading}</h2>
    <p>${message}</p>
  </div>
</body>
</html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// GET /api/approvals/email-action?token=...&decision=APPROVED|DENIED&sig=...
// Called when an operator clicks an approve/deny link in a notification email.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token    = searchParams.get("token")    ?? "";
  const decision = searchParams.get("decision") ?? "";
  const sig      = searchParams.get("sig")      ?? "";

  // Only APPROVED and DENIED are valid one-click decisions
  if (decision !== "APPROVED" && decision !== "DENIED") {
    return new Response("Invalid decision parameter.", { status: 400 });
  }

  // Constant-time HMAC verification — prevents timing attacks and link forgery
  if (!verifySignature(token, decision, sig)) {
    return new Response("Invalid signature.", { status: 400 });
  }

  const approval = await prisma.approvalRequest.findUnique({ where: { token } });

  if (!approval) {
    return htmlPage(
      "Not Found",
      "❌ Not Found",
      "This approval link is invalid or has already been removed.",
      "#dc2626"
    );
  }

  if (approval.status !== "PENDING") {
    return htmlPage(
      "Already Decided",
      "ℹ️ Already Decided",
      `This approval was already <strong>${approval.status.toLowerCase().replace("_", " ")}</strong>. No further action needed.`,
      "#6b7280"
    );
  }

  if (approval.expiresAt < new Date()) {
    await prisma.approvalRequest.update({
      where: { id: approval.id },
      data: { status: "EXPIRED" },
    });
    return htmlPage(
      "Expired",
      "⏰ Link Expired",
      "This approval link has expired. Please use the AgentOps portal to respond.",
      "#f59e0b"
    );
  }

  await prisma.approvalRequest.update({
    where: { id: approval.id },
    data: {
      status: decision as "APPROVED" | "DENIED",
      decidedAt: new Date(),
      decidedBy: "email-link",
    },
  });

  if (decision === "APPROVED") {
    return htmlPage(
      "Approved",
      "✅ Approved",
      "Decision recorded. The agent will proceed with the action. You can close this tab.",
      "#16a34a"
    );
  }

  return htmlPage(
    "Denied",
    "❌ Denied",
    "Decision recorded. The agent action has been blocked. You can close this tab.",
    "#dc2626"
  );
}

import { NextRequest } from "next/server";

const ADMIN_SECRET = process.env.AGENTOPS_ADMIN_SECRET ?? "";

/**
 * Require admin authentication via X-Admin-Secret header.
 * Used for AgentOps API routes.
 */
export async function requireAdminAuth(req: NextRequest): Promise<void> {
  if (!ADMIN_SECRET) {
    throw new Error("AGENTOPS_ADMIN_SECRET not configured");
  }

  const secret = req.headers.get("x-admin-secret");

  if (!secret || secret !== ADMIN_SECRET) {
    throw new UnauthorizedError("Invalid or missing admin secret");
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * TeleMD internal query tools for agents.
 * Allows agents to fetch non-PHI operational data from TeleMD API.
 * Never returns PHI — only aggregate/operational data.
 */
import type { ToolResult } from "./types.js";

const TELEMD_API_URL = process.env.TELEMD_API_URL ?? "http://localhost:3001";
const INTERNAL_SECRET = process.env.AGENTOPS_INTERNAL_SECRET ?? "";

async function internalFetch(path: string): Promise<ToolResult> {
  try {
    const res = await fetch(`${TELEMD_API_URL}${path}`, {
      headers: { "x-internal-secret": INTERNAL_SECRET },
    });
    if (!res.ok) return { ok: false, error: `TeleMD API ${res.status}: ${await res.text()}` };
    return { ok: true, data: await res.json() };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/** Get aggregate appointment stats — no PHI, counts only */
export async function getAppointmentStats(practiceId?: string): Promise<ToolResult> {
  const q = practiceId ? `?practiceId=${practiceId}` : "";
  return internalFetch(`/api/internal/stats/appointments${q}`);
}

/** Get system health status */
export async function getTeleMDHealth(): Promise<ToolResult> {
  return internalFetch("/api/health");
}

/** Get active seat count for billing oversight */
export async function getActiveSeatCount(): Promise<ToolResult> {
  return internalFetch("/api/internal/stats/seats");
}

/** Get evidence items for compliance review — no PHI */
export async function getEvidenceItems(practiceId: string): Promise<ToolResult> {
  return internalFetch(`/api/evidence?practiceId=${practiceId}`);
}

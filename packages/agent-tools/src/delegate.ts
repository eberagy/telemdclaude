/**
 * Agent-to-agent delegation tool.
 * Creates a sub-task in the AgentOps queue assigned to a specific agent,
 * tracked as a child of the parent run for budget + audit purposes.
 */
import type { DelegateOptions, ToolResult } from "./types.js";

const AGENTOPS_API_URL = process.env.AGENTOPS_API_URL ?? "http://localhost:4000";

export async function delegateToAgent(
  opts: DelegateOptions,
  parentRunId?: string
): Promise<ToolResult> {
  try {
    const res = await fetch(`${AGENTOPS_API_URL}/api/queue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.AGENTOPS_INTERNAL_SECRET ?? "",
      },
      body: JSON.stringify({
        title: opts.taskTitle,
        description: opts.taskDescription,
        source: "agent_delegation",
        priority: opts.priority ?? 5,
        labels: [...(opts.labels ?? []), `delegated-to:${opts.toAgent}`, ...(parentRunId ? [`parent-run:${parentRunId}`] : [])],
        assignedTo: opts.toAgent,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `Queue API error: ${err}` };
    }

    const data = await res.json() as { task: { id: string } };
    return { ok: true, data: { taskId: data.task.id, assignedTo: opts.toAgent } };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * Orchestrator — The COO Agent
 * Routes tasks to specialized agents, manages approvals, monitors budgets
 */

import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "../../generated/prisma";
import { sendApprovalRequest, sendOpsAlert } from "../integrations/slack.js";
import type { AgentName } from "@telemd/shared";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const prisma = new PrismaClient();

const AGENT_SPECIALIZATIONS: Record<AgentName, string> = {
  orchestrator: "COO — routes tasks, manages approvals, monitors system health",
  ceo: "CEO — strategic decisions, investor updates, business pivots",
  cto: "CTO — technical architecture, tech debt, infrastructure decisions",
  eng: "Engineering — code changes, bug fixes, feature implementation",
  qa: "QA — testing, code review, quality assurance",
  marketing: "Marketing — content, social media, SEO, campaigns",
  sales: "Sales/BD — outreach, partnerships, customer success",
  finance: "Finance/Cost — budget analysis, vendor negotiation, cost optimization",
  compliance: "Compliance — HIPAA, legal, policy, regulatory",
  ops: "Ops/SRE — deployment, monitoring, incident response",
};

// Actions that ALWAYS require approval regardless of autonomy level
const HIGH_RISK_ACTIONS = [
  "merge to main",
  "deploy to production",
  "send external message",
  "publish content",
  "spend money",
  "modify infrastructure",
  "change secrets",
  "modify permissions",
  "delete data",
  "send email",
  "send sms",
  "create pull request",
  "push to github",
];

class Orchestrator {
  private isRunning = false;

  async initialize() {
    this.isRunning = true;
    console.log("[orchestrator] Initialized");

    // Ensure all agents exist in DB
    for (const [name, description] of Object.entries(AGENT_SPECIALIZATIONS)) {
      await prisma.agent.upsert({
        where: { name },
        update: {},
        create: {
          name,
          displayName: name.charAt(0).toUpperCase() + name.slice(1),
          description,
          autonomyLevel: "NORMAL",
          allowedTools: getDefaultTools(name as AgentName),
        },
      });
    }

    // Start processing loop
    this.processLoop();
  }

  private async processLoop() {
    while (this.isRunning) {
      try {
        await this.processPendingTasks();
      } catch (err) {
        console.error("[orchestrator] Process loop error:", err);
      }
      await sleep(10000); // Poll every 10 seconds
    }
  }

  async processPendingTasks() {
    const tasks = await prisma.queuedTask.findMany({
      where: { status: "PENDING" },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: 5,
    });

    for (const task of tasks) {
      await this.routeTask(task.id);
    }
  }

  async routeTask(taskId: string) {
    const task = await prisma.queuedTask.findUnique({ where: { id: taskId } });
    if (!task || task.status !== "PENDING") return;

    console.log(`[orchestrator] Routing task: ${task.title}`);

    // Use small model for routing
    const routingResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: `You are a task router. Given a task, identify the best agent to handle it.
Available agents: ${Object.keys(AGENT_SPECIALIZATIONS).join(", ")}
Respond with ONLY the agent name (no explanation).`,
      messages: [
        {
          role: "user",
          content: `Task: ${task.title}\nDescription: ${task.description}\nLabels: ${task.labels.join(", ")}`,
        },
      ],
    });

    const assignedAgent = (
      routingResponse.content[0].type === "text"
        ? routingResponse.content[0].text.trim().toLowerCase()
        : "eng"
    ) as AgentName;

    const agent = await prisma.agent.findUnique({
      where: { name: assignedAgent in AGENT_SPECIALIZATIONS ? assignedAgent : "eng" },
    });

    if (!agent || agent.isPaused || !agent.isActive) {
      console.log(`[orchestrator] Agent ${assignedAgent} unavailable, skipping task`);
      return;
    }

    // Check budget
    if (agent.spentTodayCents >= agent.budgetCentsPerDay) {
      console.warn(`[orchestrator] Agent ${assignedAgent} over budget, skipping`);
      await sendOpsAlert(
        "Agent Over Budget",
        `Agent ${assignedAgent} has exceeded daily budget. Task: ${task.title}`,
        "warning"
      );
      return;
    }

    // Assign and create run
    await prisma.queuedTask.update({
      where: { id: task.id },
      data: { status: "ASSIGNED", assignedTo: assignedAgent },
    });

    const run = await prisma.agentRun.create({
      data: {
        taskId: task.id,
        agentId: agent.id,
        status: "QUEUED",
        prompt: `Task: ${task.title}\n\n${task.description}`,
      },
    });

    // Execute agent
    await this.executeAgent(run.id, agent.name as AgentName);
  }

  async executeAgent(runId: string, agentName: AgentName) {
    const run = await prisma.agentRun.findUnique({
      where: { id: runId },
      include: { agent: true, task: true },
    });

    if (!run) return;

    await prisma.agentRun.update({
      where: { id: runId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    try {
      const systemPrompt = buildAgentSystemPrompt(agentName, run.agent);

      // Use larger model for execution
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: run.prompt,
          },
        ],
      });

      const result = response.content[0].type === "text" ? response.content[0].text : "";
      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
      const costCents = Math.ceil(tokensUsed * 0.003); // ~$0.003/1K tokens estimate

      // Check if action requires approval
      const requiresApproval =
        run.agent.autonomyLevel === "DRAFT_ONLY" ||
        HIGH_RISK_ACTIONS.some((action) =>
          result.toLowerCase().includes(action)
        );

      if (requiresApproval) {
        await this.requestApproval(runId, agentName, result, run.task?.title ?? "Task");
        await prisma.agentRun.update({
          where: { id: runId },
          data: {
            status: "AWAITING_APPROVAL",
            result,
            tokenUsed: tokensUsed,
            costCents,
          },
        });
      } else {
        await prisma.agentRun.update({
          where: { id: runId },
          data: {
            status: "COMPLETED",
            result,
            completedAt: new Date(),
            tokenUsed: tokensUsed,
            costCents,
          },
        });

        // Update task
        if (run.taskId) {
          await prisma.queuedTask.update({
            where: { id: run.taskId },
            data: { status: "COMPLETED" },
          });
        }
      }

      // Record budget usage
      await prisma.budgetEntry.create({
        data: {
          agentId: run.agent.id,
          provider: "anthropic",
          model: "claude-sonnet-4-6",
          tokens: tokensUsed,
          costCents,
          runId,
        },
      });

      // Update agent budget
      await prisma.agent.update({
        where: { id: run.agent.id },
        data: {
          spentTodayCents: { increment: costCents },
        },
      });
    } catch (err) {
      console.error(`[orchestrator] Agent ${agentName} run ${runId} failed:`, err);
      await prisma.agentRun.update({
        where: { id: runId },
        data: {
          status: "FAILED",
          error: err instanceof Error ? err.message : String(err),
          completedAt: new Date(),
        },
      });
    }
  }

  async requestApproval(
    runId: string,
    agentName: AgentName,
    result: string,
    taskTitle: string
  ) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const approval = await prisma.approvalRequest.create({
      data: {
        runId,
        agentName,
        summary: `${agentName.toUpperCase()} wants to: ${taskTitle}`,
        action: result.substring(0, 2000),
        risk: determineRisk(result),
        rollbackPlan: "Revert the change or undo the action manually.",
        whySafe: "Agent output reviewed before execution. No irreversible action taken yet.",
        expiresAt,
      },
    });

    await sendApprovalRequest(approval).catch(console.error);

    console.log(`[orchestrator] Approval requested for run ${runId}: ${approval.id}`);
  }

  async shutdown() {
    this.isRunning = false;
    await prisma.$disconnect();
  }
}

function determineRisk(result: string): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  const lower = result.toLowerCase();
  if (
    lower.includes("delete") ||
    lower.includes("drop") ||
    lower.includes("production") ||
    lower.includes("deploy")
  )
    return "CRITICAL";
  if (
    lower.includes("merge") ||
    lower.includes("push") ||
    lower.includes("external") ||
    lower.includes("send email")
  )
    return "HIGH";
  if (lower.includes("modify") || lower.includes("update")) return "MEDIUM";
  return "LOW";
}

function getDefaultTools(agentName: AgentName): string[] {
  const common = ["read_file", "search_web", "query_db"];
  const perAgent: Record<AgentName, string[]> = {
    orchestrator: [...common, "route_task", "send_approval", "read_queue"],
    ceo: [...common, "read_github_issues", "read_metrics"],
    cto: [...common, "read_github_issues", "read_codebase"],
    eng: [...common, "read_codebase", "write_file", "run_tests", "create_pr"],
    qa: [...common, "read_codebase", "run_tests", "create_issue"],
    marketing: [...common, "read_analytics", "draft_content"],
    sales: [...common, "read_crm", "draft_email"],
    finance: [...common, "read_costs", "generate_report"],
    compliance: [...common, "read_policies", "generate_report"],
    ops: [...common, "read_logs", "check_health", "deploy"],
  };
  return perAgent[agentName] ?? common;
}

function buildAgentSystemPrompt(
  agentName: AgentName,
  agent: { description: string; autonomyLevel: string; allowedTools: string[] }
): string {
  const AUTONOMY_INSTRUCTIONS: Record<string, string> = {
    DRAFT_ONLY: "DRAFT ONLY MODE: You must NOT execute any actions. Only draft plans and outputs for human approval.",
    NORMAL: "NORMAL MODE: You may execute low-risk actions. For any significant action (merging, deploying, sending messages), clearly mark as REQUIRES_APPROVAL.",
    AGGRESSIVE: "AGGRESSIVE MODE: You may execute most actions. Still flag CRITICAL risk actions for approval.",
  };

  return `You are the ${agentName.toUpperCase()} agent for TeleMD, an AI-powered telehealth platform.

Role: ${agent.description}

Autonomy Level: ${AUTONOMY_INSTRUCTIONS[agent.autonomyLevel] ?? AUTONOMY_INSTRUCTIONS.NORMAL}

Allowed Tools: ${agent.allowedTools.join(", ")}

IMPORTANT RULES:
1. Never access or log PHI (patient health information)
2. Always mark high-risk actions with "REQUIRES_APPROVAL: [action]"
3. Be specific about what you would do — include exact diffs, commands, or content
4. Include a rollback plan for any significant action
5. Budget-conscious: use efficient approaches, cache when possible
6. You are operating on behalf of TeleMD, a HIPAA-conscious telehealth startup in Pennsylvania

When outputting a plan that requires approval, structure it as:
SUMMARY: <one line>
ACTION: <exact action to take>
RISK: <LOW|MEDIUM|HIGH|CRITICAL>
ROLLBACK: <how to undo>
WHY_SAFE: <brief justification>`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const orchestrator = new Orchestrator();

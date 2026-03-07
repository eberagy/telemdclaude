import { Octokit } from "@octokit/rest";
import { PrismaClient } from "../generated/prisma";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const prisma = new PrismaClient();

const GITHUB_OWNER = process.env.GITHUB_OWNER ?? "";
const GITHUB_REPO = process.env.GITHUB_REPO ?? "telemd-monorepo";
const AGENTOPS_LABELS = ["agentops", "bug", "feature", "marketing", "sales", "infra"];
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function setupGitHubPoller() {
  if (!GITHUB_OWNER || !process.env.GITHUB_TOKEN) {
    console.warn("[github] GITHUB_OWNER or GITHUB_TOKEN not set — GitHub poller disabled");
    return;
  }

  console.log(`[github] Starting poller for ${GITHUB_OWNER}/${GITHUB_REPO}`);
  pollGitHubIssues();
  setInterval(pollGitHubIssues, POLL_INTERVAL_MS);
}

async function pollGitHubIssues() {
  try {
    for (const label of AGENTOPS_LABELS) {
      const { data: issues } = await octokit.issues.listForRepo({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        labels: label,
        state: "open",
        per_page: 20,
      });

      for (const issue of issues) {
        // Check if already processed
        const cached = await prisma.gitHubIssueCache.findUnique({
          where: {
            owner_repo_issueNumber: {
              owner: GITHUB_OWNER,
              repo: GITHUB_REPO,
              issueNumber: issue.number,
            },
          },
        });

        if (cached?.taskId) continue; // Already has a task

        // Upsert cache
        await prisma.gitHubIssueCache.upsert({
          where: {
            owner_repo_issueNumber: {
              owner: GITHUB_OWNER,
              repo: GITHUB_REPO,
              issueNumber: issue.number,
            },
          },
          update: {
            title: issue.title,
            body: issue.body ?? "",
            labels: issue.labels.map((l) => (typeof l === "string" ? l : l.name ?? "")),
            state: issue.state,
            cachedAt: new Date(),
          },
          create: {
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            issueNumber: issue.number,
            title: issue.title,
            body: issue.body ?? "",
            labels: issue.labels.map((l) => (typeof l === "string" ? l : l.name ?? "")),
            state: issue.state,
          },
        });

        // Create a task for this issue
        const task = await prisma.queuedTask.create({
          data: {
            title: `GitHub #${issue.number}: ${issue.title}`,
            description: issue.body ?? issue.title,
            source: "github",
            sourceId: String(issue.number),
            labels: issue.labels.map((l) => (typeof l === "string" ? l : l.name ?? "")),
            priority: label === "bug" ? 8 : label === "infra" ? 7 : 5,
          },
        });

        // Link back to cache
        await prisma.gitHubIssueCache.update({
          where: {
            owner_repo_issueNumber: {
              owner: GITHUB_OWNER,
              repo: GITHUB_REPO,
              issueNumber: issue.number,
            },
          },
          data: { taskId: task.id },
        });

        console.log(`[github] Created task for issue #${issue.number}: ${issue.title}`);
      }
    }
  } catch (err) {
    console.error("[github] Polling error:", err);
  }
}

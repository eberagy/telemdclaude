/**
 * AgentOps Worker — Main Entry Point
 * 24/7 multi-agent orchestration system
 */

import { orchestrator } from "./orchestrator/index.js";
import { setupScheduledJobs } from "./orchestrator/scheduler.js";
import { setupGitHubPoller } from "./integrations/github.js";
import { setupTeleMDEventConsumer } from "./integrations/telemd.js";

async function main() {
  console.log("[agentops-worker] Starting...");

  // Initialize orchestrator
  await orchestrator.initialize();

  // Setup scheduled jobs (daily brief, budget reset, etc.)
  setupScheduledJobs();

  // Start GitHub issue polling
  setupGitHubPoller();

  // Start TeleMD event stream consumer
  setupTeleMDEventConsumer();

  console.log("[agentops-worker] All systems operational.");

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("[agentops-worker] Shutting down gracefully...");
    await orchestrator.shutdown();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("[agentops-worker] Shutting down gracefully...");
    await orchestrator.shutdown();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[agentops-worker] Fatal error:", err);
  process.exit(1);
});

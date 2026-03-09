#!/usr/bin/env bash
# ============================================================
# setup_local.sh — Bootstrap local development environment
# ============================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo ""
echo "============================================"
echo " TeleMD + AgentOps — Local Dev Setup"
echo "============================================"
echo ""

# Check prerequisites
check_command() {
  if ! command -v "$1" &>/dev/null; then
    echo "ERROR: $1 is required but not installed."
    echo "Install it and re-run this script."
    exit 1
  fi
}

check_command node
check_command pnpm
check_command docker
check_command docker-compose || check_command "docker compose"

echo "✓ Prerequisites OK"
echo ""

# Check for .env files
if [[ ! -f "${REPO_ROOT}/apps/telemd-api/.env" ]]; then
  echo "WARNING: apps/telemd-api/.env not found."
  echo "Run scripts/create_secrets.sh first, or copy .env.example files."
  echo ""
  read -r -p "Continue without secrets? (y/N): " cont
  if [[ "$cont" != "y" && "$cont" != "Y" ]]; then
    echo "Exiting. Run scripts/create_secrets.sh first."
    exit 1
  fi
fi

echo "1. Installing dependencies..."
pnpm install

echo ""
echo "2. Generating Prisma clients..."
# telemd-api uses default @prisma/client output
(cd apps/telemd-api && pnpm db:generate) && echo "   ✓ telemd-api Prisma client generated"
# agentops-api outputs to ./src/generated/prisma
(cd apps/agentops-api && pnpm db:generate) && echo "   ✓ agentops-api Prisma client generated"
# agentops-worker shares the same schema, generates its own client
(cd services/agentops-worker && pnpm db:generate) && echo "   ✓ agentops-worker Prisma client generated"

echo ""
echo "3. Starting Postgres + Redis via Docker..."
docker compose -f infra/compose/docker-compose.yml up -d postgres redis

echo "   Waiting for Postgres to be healthy..."
for i in {1..30}; do
  if docker compose -f infra/compose/docker-compose.yml exec postgres pg_isready -U telemd &>/dev/null; then
    echo "   ✓ Postgres ready"
    break
  fi
  sleep 2
done

echo ""
echo "4. Running TeleMD migrations..."
(cd apps/telemd-api && pnpm db:migrate) || echo "   (Migration may need env vars — run after configuring secrets)"

echo ""
echo "5. Seeding TeleMD database..."
(cd apps/telemd-api && pnpm db:seed) || echo "   (Seed may need env vars — run after configuring secrets)"

echo ""
echo "6. Running AgentOps migrations..."
(cd apps/agentops-api && pnpm db:migrate) || echo "   (Skipped — configure AGENTOPS_DATABASE_URL first)"

echo ""
echo "============================================"
echo " Local dev setup complete!"
echo ""
echo " To start all services:"
echo "   pnpm dev"
echo ""
echo " Or start individually:"
echo "   pnpm --filter telemd-web dev   (port 3000)"
echo "   pnpm --filter telemd-api dev   (port 3001)"
echo "   pnpm --filter agentops-api dev (port 4000)"
echo "   pnpm --filter agentops-ui dev  (port 4001)"
echo "   pnpm --filter agentops-worker dev"
echo ""
echo " Prisma Studio:"
echo "   pnpm db:studio"
echo "============================================"

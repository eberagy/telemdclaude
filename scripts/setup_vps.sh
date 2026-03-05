#!/usr/bin/env bash
# ============================================================
# setup_vps.sh — Deploy AgentOps to Hostinger VPS
# VPS: ragy@187.77.21.138
# ============================================================
set -euo pipefail

VPS_HOST="ragy@187.77.21.138"
DEPLOY_DIR="/opt/agentops"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo ""
echo "============================================"
echo " AgentOps VPS Deployment"
echo " Target: ${VPS_HOST}"
echo "============================================"
echo ""

# 1. Install Docker on VPS if needed
echo "1. Checking Docker installation on VPS..."
ssh "$VPS_HOST" '
  if ! command -v docker &>/dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    newgrp docker
    echo "Docker installed."
  else
    echo "Docker already installed: $(docker --version)"
  fi

  if ! docker compose version &>/dev/null; then
    echo "Installing Docker Compose plugin..."
    sudo apt-get update -q
    sudo apt-get install -y docker-compose-plugin
  fi
  echo "Docker Compose: $(docker compose version)"
'

# 2. Create deployment directory
echo ""
echo "2. Setting up deployment directory..."
ssh "$VPS_HOST" "sudo mkdir -p ${DEPLOY_DIR} && sudo chown \$USER:\$USER ${DEPLOY_DIR}"

# 3. Copy infra files
echo ""
echo "3. Copying docker-compose and config files..."
scp -r "${REPO_ROOT}/infra/compose/." "${VPS_HOST}:${DEPLOY_DIR}/"

# 4. Copy .env (if it exists)
if [[ -f "${REPO_ROOT}/.env" ]]; then
  echo ""
  echo "4. Copying environment file..."
  scp "${REPO_ROOT}/.env" "${VPS_HOST}:${DEPLOY_DIR}/.env"
  echo "   ✓ .env uploaded"
else
  echo ""
  echo "4. WARNING: No root .env file found."
  echo "   Run scripts/create_secrets.sh first, then re-run this script."
  echo "   You will need to manually create ${DEPLOY_DIR}/.env on the VPS."
fi

# 5. Pull images and deploy
echo ""
echo "5. Deploying AgentOps services..."
ssh "$VPS_HOST" "
  cd ${DEPLOY_DIR}
  docker compose --profile agentops pull 2>/dev/null || true
  docker compose --profile agentops up -d --build
  echo 'Services started:'
  docker compose --profile agentops ps
"

# 6. Run AgentOps migrations on VPS
echo ""
echo "6. Running AgentOps database migrations..."
ssh "$VPS_HOST" "
  cd ${DEPLOY_DIR}
  docker compose --profile agentops exec agentops-api npx prisma migrate deploy || echo 'Migration failed — check logs'
"

# 7. Caddy domain setup
echo ""
echo "7. Domain configuration..."
read -r -p "Do you have a domain to configure? (y/N): " has_domain
if [[ "$has_domain" == "y" || "$has_domain" == "Y" ]]; then
  read -r -p "Enter your domain (e.g., agents.yourdomain.com): " domain
  ssh "$VPS_HOST" "
    cd ${DEPLOY_DIR}
    echo 'DOMAIN=${domain}' >> .env
    docker compose --profile agentops restart caddy
    echo 'Caddy restarted with domain: ${domain}'
  "
else
  echo ""
  echo "   Running without domain — accessible at http://187.77.21.138"
  echo "   AgentOps UI: http://187.77.21.138:4001"
  echo "   AgentOps API: http://187.77.21.138:4000"
fi

echo ""
echo "============================================"
echo " VPS Deployment Complete!"
echo ""
echo " Verify services:"
echo "   ssh ${VPS_HOST} 'docker compose --profile agentops -f ${DEPLOY_DIR}/docker-compose.yml ps'"
echo ""
echo " View logs:"
echo "   ssh ${VPS_HOST} 'docker compose --profile agentops -f ${DEPLOY_DIR}/docker-compose.yml logs -f'"
echo "============================================"

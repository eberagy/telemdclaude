#!/usr/bin/env bash
# ============================================================
# create_secrets.sh — Prompt for all secrets, write .env files safely
# NEVER prints secrets to stdout after collection
# ============================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo ""
echo "=========================================="
echo " TeleMD + AgentOps Secret Configuration"
echo "=========================================="
echo "This script will prompt for all required secrets and write"
echo ".env files. Secrets are NEVER printed to stdout."
echo ""

read_secret() {
  local prompt="$1"
  local varname="$2"
  local default="${3:-}"

  if [[ -n "$default" ]]; then
    read -r -p "$prompt [$default]: " value
    value="${value:-$default}"
  else
    read -r -s -p "$prompt: " value
    echo "" # newline after silent read
  fi

  eval "$varname='$value'"
}

read_plain() {
  local prompt="$1"
  local varname="$2"
  local default="${3:-}"

  if [[ -n "$default" ]]; then
    read -r -p "$prompt [$default]: " value
    value="${value:-$default}"
  else
    read -r -p "$prompt: " value
  fi

  eval "$varname='$value'"
}

echo "--- Clerk (Auth) ---"
read_plain "Clerk Publishable Key (pk_...)" CLERK_PUBLISHABLE_KEY
read_secret "Clerk Secret Key (sk_...)" CLERK_SECRET_KEY
read_plain "Clerk Webhook Secret" CLERK_WEBHOOK_SECRET

echo ""
echo "--- Stripe ---"
read_secret "Stripe Secret Key (sk_...)" STRIPE_SECRET_KEY
read_plain "Stripe Publishable Key (pk_...)" STRIPE_PUBLISHABLE_KEY
read_secret "Stripe Webhook Secret (whsec_...)" STRIPE_WEBHOOK_SECRET

echo ""
echo "--- Retell AI ---"
read_secret "Retell API Key" RETELL_API_KEY
read_plain "Retell Agent ID" RETELL_AGENT_ID
read_secret "Retell Webhook Secret" RETELL_WEBHOOK_SECRET

echo ""
echo "--- Zoom Video SDK ---"
read_plain "Zoom SDK Key" ZOOM_SDK_KEY
read_secret "Zoom SDK Secret" ZOOM_SDK_SECRET

echo ""
echo "--- AI (Anthropic) ---"
read_secret "Anthropic API Key (sk-ant-...)" ANTHROPIC_API_KEY

echo ""
echo "--- Communications ---"
read_secret "Postmark Server Token" POSTMARK_TOKEN
read_plain "Postmark From Email" POSTMARK_FROM "noreply@yourdomain.com"
read_plain "Twilio Account SID" TWILIO_ACCOUNT_SID
read_secret "Twilio Auth Token" TWILIO_AUTH_TOKEN
read_plain "Twilio Phone Number" TWILIO_PHONE_NUMBER "+1xxxxxxxxxx"

echo ""
echo "--- Storage (S3-compatible) ---"
read_plain "S3 Bucket Name" S3_BUCKET "telemd-files"
read_plain "S3 Region" S3_REGION "us-east-1"
read_plain "S3 Endpoint (leave empty for AWS)" S3_ENDPOINT ""
read_plain "S3 Access Key ID" S3_ACCESS_KEY_ID
read_secret "S3 Secret Access Key" S3_SECRET_ACCESS_KEY

echo ""
echo "--- Observability ---"
read_plain "Sentry DSN (telemd-web)" SENTRY_DSN_WEB ""
read_plain "Sentry DSN (telemd-api)" SENTRY_DSN_API ""
read_plain "PostHog API Key" POSTHOG_KEY ""
read_plain "PostHog Host" POSTHOG_HOST "https://app.posthog.com"

echo ""
echo "--- Slack (AgentOps) ---"
read_secret "Slack Bot Token (xoxb-...)" SLACK_BOT_TOKEN
read_plain "Slack Channel ID for Approvals (#general)" SLACK_CHANNEL_ID
read_plain "Slack Alerts Channel ID (leave empty = same as above)" SLACK_ALERTS_CHANNEL_ID ""

echo ""
echo "--- GitHub (AgentOps) ---"
read_secret "GitHub Personal Access Token" GITHUB_TOKEN
read_plain "GitHub Owner/Org" GITHUB_OWNER
read_plain "GitHub Repo" GITHUB_REPO "telemd-monorepo"

echo ""
echo "--- Database ---"
read_secret "Postgres Password" POSTGRES_PASSWORD "changeme_$(openssl rand -hex 8)"
read_plain "TeleMD DB URL" DATABASE_URL "postgresql://telemd:${POSTGRES_PASSWORD}@localhost:5432/telemd"
read_plain "AgentOps DB URL" AGENTOPS_DATABASE_URL "postgresql://telemd:${POSTGRES_PASSWORD}@localhost:5432/agentops"

echo ""
echo "--- AgentOps ---"
AGENTOPS_ADMIN_SECRET="$(openssl rand -hex 32)"
echo "(Auto-generated AgentOps admin secret)"
read_plain "AgentOps Public URL" AGENTOPS_PUBLIC_URL "http://localhost:4001"
read_plain "TeleMD API URL (for AgentOps)" TELEMD_API_URL "http://localhost:3001"

# ---- Write telemd-api .env ----
cat > "${REPO_ROOT}/apps/telemd-api/.env" << ENVEOF
DATABASE_URL="${DATABASE_URL}"
CLERK_SECRET_KEY="${CLERK_SECRET_KEY}"
CLERK_WEBHOOK_SECRET="${CLERK_WEBHOOK_SECRET}"
STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY}"
STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET}"
RETELL_API_KEY="${RETELL_API_KEY}"
RETELL_AGENT_ID="${RETELL_AGENT_ID}"
RETELL_WEBHOOK_SECRET="${RETELL_WEBHOOK_SECRET}"
ZOOM_SDK_KEY="${ZOOM_SDK_KEY}"
ZOOM_SDK_SECRET="${ZOOM_SDK_SECRET}"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"
POSTMARK_TOKEN="${POSTMARK_TOKEN}"
POSTMARK_FROM="${POSTMARK_FROM}"
TWILIO_ACCOUNT_SID="${TWILIO_ACCOUNT_SID}"
TWILIO_AUTH_TOKEN="${TWILIO_AUTH_TOKEN}"
TWILIO_PHONE_NUMBER="${TWILIO_PHONE_NUMBER}"
S3_BUCKET="${S3_BUCKET}"
S3_REGION="${S3_REGION}"
S3_ENDPOINT="${S3_ENDPOINT}"
S3_ACCESS_KEY_ID="${S3_ACCESS_KEY_ID}"
S3_SECRET_ACCESS_KEY="${S3_SECRET_ACCESS_KEY}"
SENTRY_DSN="${SENTRY_DSN_API}"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
ENVEOF

# ---- Write telemd-web .env.local ----
cat > "${REPO_ROOT}/apps/telemd-web/.env.local" << ENVEOF
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="${CLERK_PUBLISHABLE_KEY}"
CLERK_SECRET_KEY="${CLERK_SECRET_KEY}"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_POSTHOG_KEY="${POSTHOG_KEY}"
NEXT_PUBLIC_POSTHOG_HOST="${POSTHOG_HOST}"
SENTRY_DSN="${SENTRY_DSN_WEB}"
ENVEOF

# ---- Write agentops-api .env ----
cat > "${REPO_ROOT}/apps/agentops-api/.env" << ENVEOF
AGENTOPS_DATABASE_URL="${AGENTOPS_DATABASE_URL}"
REDIS_URL="redis://localhost:6379"
SLACK_BOT_TOKEN="${SLACK_BOT_TOKEN}"
SLACK_CHANNEL_ID="${SLACK_CHANNEL_ID}"
SLACK_ALERTS_CHANNEL_ID="${SLACK_ALERTS_CHANNEL_ID}"
AGENTOPS_ADMIN_SECRET="${AGENTOPS_ADMIN_SECRET}"
AGENTOPS_PUBLIC_URL="${AGENTOPS_PUBLIC_URL}"
ENVEOF

# ---- Write agentops-worker .env ----
cat > "${REPO_ROOT}/services/agentops-worker/.env" << ENVEOF
AGENTOPS_DATABASE_URL="${AGENTOPS_DATABASE_URL}"
REDIS_URL="redis://localhost:6379"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"
SLACK_BOT_TOKEN="${SLACK_BOT_TOKEN}"
SLACK_CHANNEL_ID="${SLACK_CHANNEL_ID}"
SLACK_ALERTS_CHANNEL_ID="${SLACK_ALERTS_CHANNEL_ID}"
AGENTOPS_PUBLIC_URL="${AGENTOPS_PUBLIC_URL}"
GITHUB_TOKEN="${GITHUB_TOKEN}"
GITHUB_OWNER="${GITHUB_OWNER}"
GITHUB_REPO="${GITHUB_REPO}"
TELEMD_API_URL="${TELEMD_API_URL}"
ENVEOF

# ---- Write root .env (for docker-compose) ----
cat > "${REPO_ROOT}/.env" << ENVEOF
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"
SLACK_BOT_TOKEN="${SLACK_BOT_TOKEN}"
SLACK_CHANNEL_ID="${SLACK_CHANNEL_ID}"
SLACK_ALERTS_CHANNEL_ID="${SLACK_ALERTS_CHANNEL_ID}"
AGENTOPS_ADMIN_SECRET="${AGENTOPS_ADMIN_SECRET}"
AGENTOPS_PUBLIC_URL="${AGENTOPS_PUBLIC_URL}"
GITHUB_TOKEN="${GITHUB_TOKEN}"
GITHUB_OWNER="${GITHUB_OWNER}"
GITHUB_REPO="${GITHUB_REPO}"
TELEMD_API_URL="${TELEMD_API_URL}"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="${CLERK_PUBLISHABLE_KEY}"
CLERK_SECRET_KEY="${CLERK_SECRET_KEY}"
STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY}"
STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET}"
STRIPE_PUBLISHABLE_KEY="${STRIPE_PUBLISHABLE_KEY}"
ENVEOF

echo ""
echo "=========================================="
echo " Secrets written successfully!"
echo " Files created:"
echo "   apps/telemd-api/.env"
echo "   apps/telemd-web/.env.local"
echo "   apps/agentops-api/.env"
echo "   services/agentops-worker/.env"
echo "   .env (root, for docker-compose)"
echo ""
echo " AgentOps admin secret (save this!):"
echo " ${AGENTOPS_ADMIN_SECRET}" | sed 's/./*/g' # print stars
echo " (Check .env files for the actual value)"
echo "=========================================="

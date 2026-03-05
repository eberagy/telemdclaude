#!/usr/bin/env bash
# backup_vps.sh — Daily Postgres backup to S3
# Install on VPS as a cron: 0 3 * * * /opt/agentops/backup.sh
set -euo pipefail

BACKUP_DIR="/opt/agentops/backups"
DATE=$(date +%Y%m%d_%H%M%S)
S3_BUCKET="${S3_BUCKET:-telemd-backups}"
RETAIN_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "[backup] Starting backup at $DATE"

# Dump AgentOps DB
docker compose --profile agentops -f /opt/agentops/docker-compose.yml exec -T postgres \
  pg_dump -U telemd agentops | gzip > "${BACKUP_DIR}/agentops_${DATE}.sql.gz"

echo "[backup] AgentOps DB dumped"

# Upload to S3 if configured
if command -v aws &>/dev/null && [ -n "${S3_BUCKET:-}" ]; then
  aws s3 cp "${BACKUP_DIR}/agentops_${DATE}.sql.gz" \
    "s3://${S3_BUCKET}/backups/agentops_${DATE}.sql.gz" \
    --storage-class STANDARD_IA
  echo "[backup] Uploaded to s3://${S3_BUCKET}/backups/agentops_${DATE}.sql.gz"
fi

# Prune local backups older than RETAIN_DAYS
find "$BACKUP_DIR" -name "*.sql.gz" -mtime "+${RETAIN_DAYS}" -delete
echo "[backup] Pruned backups older than ${RETAIN_DAYS} days"
echo "[backup] Done"

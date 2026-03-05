# Deployment Guide

## TeleMD (Vercel)

### Prerequisites
- Vercel account
- All secrets configured (run `scripts/create_secrets.sh`)
- Managed Postgres (Vercel Postgres, Supabase, or Neon)
- Vercel Blob or S3 for file storage

### Deploy Steps

1. **Link to Vercel**:
   ```bash
   cd apps/telemd-web
   vercel link
   vercel env pull
   ```

2. **Deploy telemd-api** (as separate Vercel project):
   ```bash
   cd apps/telemd-api
   vercel link
   vercel env pull
   vercel --prod
   ```

3. **Deploy telemd-web**:
   ```bash
   cd apps/telemd-web
   vercel --prod
   ```

4. **Configure webhooks** in external services:
   - Stripe: `https://your-api.vercel.app/api/webhooks/stripe`
   - Retell: `https://your-api.vercel.app/api/webhooks/retell`
   - Clerk: `https://your-api.vercel.app/api/webhooks/clerk`

5. **Run migrations on prod DB**:
   ```bash
   DATABASE_URL="prod_db_url" npx prisma migrate deploy
   ```

## AgentOps (VPS)

### Automated Deployment
```bash
# First time setup:
bash scripts/setup_vps.sh

# Update deployment:
ssh ragy@187.77.21.138 "cd /opt/agentops && docker compose --profile agentops pull && docker compose --profile agentops up -d"
```

### Manual Steps

1. SSH to VPS:
   ```bash
   ssh ragy@187.77.21.138
   ```

2. Create deployment directory:
   ```bash
   sudo mkdir -p /opt/agentops
   sudo chown $USER:$USER /opt/agentops
   ```

3. Copy files:
   ```bash
   scp -r infra/compose/. ragy@187.77.21.138:/opt/agentops/
   scp .env ragy@187.77.21.138:/opt/agentops/.env
   ```

4. Start services:
   ```bash
   cd /opt/agentops
   docker compose --profile agentops up -d
   ```

5. Run migrations:
   ```bash
   docker compose --profile agentops exec agentops-api npx prisma migrate deploy
   ```

6. Verify:
   ```bash
   docker compose --profile agentops ps
   docker compose --profile agentops logs agentops-worker
   ```

## Monitoring

- AgentOps logs: `docker compose --profile agentops logs -f`
- Sentry (TeleMD): Dashboard at sentry.io
- Uptime: Monitor `http://187.77.21.138:4001` or configured domain
- Daily brief: Sent to Slack #general at 9 AM ET

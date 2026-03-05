# TeleMD + AgentOps Runbook

## Common Operations

### Check System Health
```bash
# TeleMD (Vercel) — check recent deploys
vercel ls

# AgentOps (VPS)
ssh ragy@187.77.21.138 "docker compose --profile agentops -f /opt/agentops/docker-compose.yml ps"
```

### View Logs
```bash
# AgentOps worker (orchestrator + agents)
ssh ragy@187.77.21.138 "docker compose --profile agentops -f /opt/agentops/docker-compose.yml logs -f agentops-worker"

# AgentOps API
ssh ragy@187.77.21.138 "docker compose --profile agentops -f /opt/agentops/docker-compose.yml logs -f agentops-api"
```

### Restart Services
```bash
ssh ragy@187.77.21.138 "cd /opt/agentops && docker compose --profile agentops restart agentops-worker"
```

### Pause All Agents (emergency)
Via AgentOps UI: Go to Agents page → pause all agents.
Or directly via API:
```bash
curl -X PATCH http://localhost:4000/api/agents/all/pause \
  -H "X-Admin-Secret: YOUR_ADMIN_SECRET"
```

### Clear Approval Backlog
```bash
# Expire all old pending approvals
curl -X POST http://localhost:4000/api/approvals/expire-all \
  -H "X-Admin-Secret: YOUR_ADMIN_SECRET"
```

### Database Backup
```bash
# TeleMD DB (if self-hosted)
pg_dump telemd > telemd_backup_$(date +%Y%m%d).sql

# AgentOps DB
ssh ragy@187.77.21.138 "docker compose -f /opt/agentops/docker-compose.yml exec postgres pg_dump -U telemd agentops > /opt/agentops/backups/agentops_$(date +%Y%m%d).sql"
```

## Incident Response

### Clinician Seat Not Activating
1. Check Stripe dashboard for subscription status
2. Check webhook delivery logs in Stripe
3. Manually update: `UPDATE clinician_profiles SET seat_status = 'ACTIVE' WHERE id = '...'`

### Patient Payment Stuck
1. Check Stripe Checkout session status
2. If expired: patient must rebook
3. If completed but not reflected: replay Stripe webhook from dashboard

### Intake Call Failing
1. Check Retell dashboard for call logs
2. Check `/api/intake/start` logs
3. If RETELL_API_KEY expired: rotate key and restart telemd-api

### SOAP Summary Not Generating
1. Check `ANTHROPIC_API_KEY` is valid
2. Check transcript was stored (`transcriptRaw` in appointment)
3. Manually trigger: `POST /api/intake/regenerate-soap` with appointmentId

### Agent Over Budget
1. Go to AgentOps UI → Budgets
2. Increase daily budget limit or reset manually
3. Agent will auto-resume next poll cycle

### AgentOps Worker Crashed
```bash
ssh ragy@187.77.21.138 "cd /opt/agentops && docker compose --profile agentops up -d agentops-worker"
```

## Slot Locking / Double Booking Issues
- Slot locks expire in 10 minutes if checkout not completed
- Check `slot_locks` table for stale locks: `SELECT * FROM slot_locks WHERE expires_at < NOW()`
- Clear stale locks: `DELETE FROM slot_locks WHERE expires_at < NOW()`

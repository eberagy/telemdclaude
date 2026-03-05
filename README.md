# TeleMD Monorepo

Production-ready cash-pay telehealth platform + 24/7 AgentOps system.

## Quick Start

```bash
# 1. Configure secrets (run once)
bash scripts/create_secrets.sh

# 2. Start local dev environment
bash scripts/setup_local.sh

# 3. Run all apps in dev mode
pnpm dev
```

## Apps

| App | Port | Description |
|-----|------|-------------|
| `telemd-web` | 3000 | Patient/Clinician/Staff/Owner portals (Next.js) |
| `telemd-api` | 3001 | Core API + webhooks (Next.js App Router) |
| `agentops-api` | 4000 | AgentOps control plane API |
| `agentops-ui` | 4001 | Agent Portal dashboard |
| `agentops-worker` | — | Orchestrator + agents (background service) |

## Portals

- **Public**: `/`, `/pricing`, `/demo`, `/book/[practiceSlug]`
- **Patient**: `/patient/appointments`, `/patient/appointments/[id]`, `/patient/messages`
- **Clinician**: `/clinician/schedule`, `/clinician/appointments/[id]`, `/clinician/patients/[id]`
- **Staff**: `/staff/schedule`, `/staff/patients`, `/staff/messages`
- **Owner**: `/owner/settings`, `/owner/team`, `/owner/billing`, `/owner/risk-controls`, `/owner/audit-logs`

## Key Features

- **PA-only gating**: Practice state enforcement + patient location attestation stored at booking
- **RBAC**: Clerk-based auth with server-side role enforcement; staff cannot access clinical data
- **Payments**: Stripe Checkout pre-payment, seat subscriptions at $299/clinician/week
- **AI Intake**: Retell AI voice calls → transcript → Claude-generated SOAP summary
- **Video**: Zoom Video SDK sessions (no recording, ever)
- **AgentOps**: GitHub issues → agent tasks → Slack interactive approvals → web approval inbox

## Deployment

- **TeleMD**: Deploy `telemd-web` + `telemd-api` to Vercel
- **AgentOps**: Deploy to VPS via `bash scripts/setup_vps.sh`

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Security](docs/SECURITY.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Runbook](docs/RUNBOOK.md)

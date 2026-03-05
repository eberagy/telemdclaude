# TeleMD + AgentOps — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    TeleMD Platform                       │
│                                                          │
│  telemd-web (Vercel)         telemd-api (Vercel)        │
│  ┌─────────────────┐         ┌─────────────────┐        │
│  │ Patient Portal  │◄───────►│ Route Handlers  │        │
│  │ Clinician Portal│         │ Server Actions  │        │
│  │ Staff Portal    │         │ Prisma ORM      │        │
│  │ Owner Portal    │         │ Webhooks        │        │
│  └─────────────────┘         └────────┬────────┘        │
│                                       │                  │
│  Auth: Clerk  Payments: Stripe        │ Managed Postgres  │
│  Video: Zoom SDK  Intake: Retell      │                  │
│  AI: Anthropic Claude  SMS: Twilio   │                  │
└───────────────────────────────────────┼──────────────────┘
                                        │ TeleMD Events
┌───────────────────────────────────────▼──────────────────┐
│                   AgentOps (VPS)                          │
│                                                           │
│  agentops-ui (4001)    agentops-api (4000)               │
│  ┌──────────────┐      ┌──────────────────┐              │
│  │ Dashboard    │◄────►│ Approvals API    │              │
│  │ Approvals   │      │ Queue API        │              │
│  │ Agents       │      │ Runs API         │              │
│  │ Runs         │      │ Webhooks         │              │
│  └──────────────┘      └────────┬─────────┘              │
│                                  │                        │
│  agentops-worker                 │                        │
│  ┌──────────────────────────┐   │                        │
│  │ Orchestrator (COO)       │   │                        │
│  │ ├── CEO Agent            │   │                        │
│  │ ├── CTO Agent            │   │                        │
│  │ ├── Engineering Agent    │   │                        │
│  │ ├── QA Agent             │   │                        │
│  │ ├── Marketing Agent      │   │                        │
│  │ ├── Sales Agent          │   │                        │
│  │ ├── Finance Agent        │   │                        │
│  │ ├── Compliance Agent     │   │                        │
│  │ └── Ops/SRE Agent        │   │                        │
│  └──────────────────────────┘   │                        │
│          │                       │                        │
│  Inputs: GitHub Issues           │ Postgres (AgentOps DB) │
│          TeleMD Events           │ Redis (queues/cache)   │
│          Manual tasks            │                        │
│          Scheduled jobs          │                        │
│                                  │                        │
│  Approvals: Slack + Web Inbox    │                        │
└──────────────────────────────────┴────────────────────────┘
```

## Data Flow

### Patient Booking Flow
1. Patient visits `/book/[practiceSlug]`
2. Selects appointment type + clinician + time slot
3. Attests to PA location (stored with timestamp)
4. Slot locked in DB transaction
5. Stripe Checkout → payment
6. Stripe webhook → appointment confirmed
7. Reminders scheduled (24h + 1h, email + SMS)

### Intake Flow
1. Patient clicks "Start Intake Call" on appointment page
2. `POST /api/intake/start` → creates Retell web call
3. Retell conducts voice intake
4. Retell webhook → transcript stored
5. Claude (Haiku) generates SOAP summary
6. Clinician sees SOAP + red flags on appointment page

### Visit Flow
1. Both parties within 10-min window → "Join/Start" button appears
2. `POST /api/zoom/session` → JWT token generated
3. Zoom Video SDK session (host/participant)
4. **No recording** at any point
5. Visit ended → clinician writes note → signs → PDF exportable

### AgentOps Approval Flow
1. Agent generates action requiring approval
2. Approval record created in DB with crypto token
3. Slack message sent with interactive buttons
4. Admin clicks Approve/Deny in Slack OR visits `/approvals/[token]`
5. Decision recorded → agent notified
6. If expired (24h): auto-expired, agent must re-request

## Security

- All PHI routes: auth → role → practice scope → assignment check
- Staff cannot access clinical notes, transcripts, or AI summaries
- Audit log for every PHI access
- Sentry scrubs PHI fields before reporting
- Slot locking via DB transaction + unique constraint (no double-booking)
- Stripe webhook signature verification
- Retell webhook secret verification
- AgentOps approval tokens are cryptographically random (32 bytes)

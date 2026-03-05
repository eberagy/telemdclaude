# TeleMD Security & Compliance

## HIPAA Posture

TeleMD is designed with HIPAA considerations:

### PHI Handling
- PHI is never logged to Sentry, analytics, or console logs
- All PHI fields are scrubbed before sending to observability tools
- Transcript raw text stored in Postgres with field-level encryption posture
- SOAP summaries stored in DB (not S3) to avoid accidental exposure

### BAA Status
| Vendor | BAA Available | Notes |
|--------|--------------|-------|
| Clerk | Yes | Auth only, no PHI |
| Stripe | Yes | Payment data, no PHI |
| Postmark | Yes | Email delivery |
| Twilio | Yes | SMS delivery |
| AWS S3 | Yes | File storage |
| Sentry | Yes | PHI scrubbed before sending |
| Anthropic | Contact | Claude API — review ToS |
| Retell AI | Contact | Intake transcripts — review ToS |
| Zoom | Yes | Video SDK, no recording |

### Access Controls
- **PlatformAdmin**: Full access
- **PracticeOwner**: Practice-wide data, no other practices
- **Clinician**: Only assigned patients/appointments; requires active seat
- **Staff**: Logistics only — no clinical notes, no transcripts, no SOAP
- **Patient**: Only their own data

### Audit Log Events
Every PHI access is logged:
- `VIEW_PATIENT_RECORD`
- `VIEW_TRANSCRIPT`
- `VIEW_AI_SUMMARY`
- `GENERATE_AI_SUMMARY`
- `EDIT_NOTE`
- `SIGN_NOTE`
- `EXPORT_PDF`
- `UPLOAD_FILE` / `DOWNLOAD_FILE`
- `START_VISIT` / `JOIN_VISIT`
- `MESSAGE_SENT`
- `PATIENT_ATTESTATION`

### PA State Gating
- Practice `service_state` must be `"PA"` (default)
- Clinician `licensedStates` must include `"PA"` to be schedulable
- Patient must attest: "I am located in Pennsylvania at the time of the visit."
- Attestation timestamp stored at booking

### Network Security
- TeleMD: Deployed to Vercel (TLS, edge network)
- AgentOps: Caddy reverse proxy with automatic HTTPS
- Security headers on all responses:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Content-Security-Policy` restricts scripts/frames

### Secrets Management
- Secrets stored in environment variables only
- Never committed to Git (`.gitignore` enforces)
- `scripts/create_secrets.sh` writes safely without printing to stdout
- Separate `.env` files per service

## Risk Controls

Configurable per practice via `/owner/risk-controls`:
- Emergency disclaimer text (shown on all patient screens)
- Not-triage banner text
- Messaging disclaimer
- After-visit summary visibility (default OFF)
- Intake field minimization (default ON — minimum necessary)
- Cancel/reschedule policy text
- Patient attestation text (editable but must satisfy PA requirement)

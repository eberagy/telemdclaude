// ============================================================
// SHARED TYPES — TeleMD + AgentOps
// ============================================================

// ---- Roles ----
export type UserRole =
  | "PlatformAdmin"
  | "PracticeOwner"
  | "Clinician"
  | "Staff"
  | "Patient";

// ---- PA State Gating ----
export const SUPPORTED_STATES = ["PA"] as const;
export type SupportedState = (typeof SUPPORTED_STATES)[number];

// ---- Appointment Status ----
export type AppointmentStatus =
  | "PENDING_PAYMENT"
  | "PAYMENT_FAILED"
  | "CONFIRMED"
  | "INTAKE_PENDING"
  | "INTAKE_COMPLETED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED"
  | "NO_SHOW";

// ---- Intake Status ----
export type IntakeStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED";

// ---- Clinician Seat Status ----
export type SeatStatus = "ACTIVE" | "INACTIVE" | "PENDING";

// ---- Practice Service State ----
export const DEFAULT_SERVICE_STATE = "PA";

// ---- Audit Event Types ----
export type AuditEventType =
  | "VIEW_PATIENT_RECORD"
  | "VIEW_TRANSCRIPT"
  | "VIEW_AI_SUMMARY"
  | "GENERATE_AI_SUMMARY"
  | "EDIT_NOTE"
  | "SIGN_NOTE"
  | "EXPORT_PDF"
  | "UPLOAD_FILE"
  | "DOWNLOAD_FILE"
  | "START_VISIT"
  | "JOIN_VISIT"
  | "MESSAGE_SENT"
  | "PATIENT_ATTESTATION"
  | "LOGIN"
  | "INVITE_SENT"
  | "SEAT_ACTIVATED"
  | "SEAT_DEACTIVATED";

// ---- Zoom Session Status ----
export type ZoomSessionStatus = "NOT_STARTED" | "ACTIVE" | "ENDED";

// ---- Message Types ----
export type MessageSenderRole = "Patient" | "Staff" | "Clinician" | "System";

// ---- TeleMD Events (for AgentOps integration) ----
export type TeleMDEventType =
  | "appointment.created"
  | "appointment.confirmed"
  | "appointment.cancelled"
  | "payment.succeeded"
  | "payment.failed"
  | "intake.completed"
  | "note.signed"
  | "message.received"
  | "seat.activated"
  | "seat.deactivated"
  | "visit.started"
  | "visit.ended";

export interface TeleMDEvent {
  type: TeleMDEventType;
  practiceId: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

// ---- AgentOps Types ----
export type AgentName =
  | "orchestrator"
  | "ceo"
  | "cto"
  | "eng"
  | "qa"
  | "marketing"
  | "sales"
  | "finance"
  | "compliance"
  | "ops";

export type AgentRunStatus =
  | "QUEUED"
  | "RUNNING"
  | "AWAITING_APPROVAL"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type ApprovalStatus = "PENDING" | "APPROVED" | "DENIED" | "CHANGES_REQUESTED";

export type AutonomyLevel = "DRAFT_ONLY" | "NORMAL" | "AGGRESSIVE";

// ---- Risk Level ----
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

// ---- ApprovalRequest ----
export interface ApprovalRequest {
  id: string;
  token: string;
  agentName: AgentName;
  summary: string;
  action: string;
  risk: RiskLevel;
  preview?: string;
  rollbackPlan?: string;
  whySafe?: string;
  status: ApprovalStatus;
  createdAt: string;
  expiresAt: string;
}

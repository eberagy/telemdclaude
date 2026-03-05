import { z } from "zod";

// ---- Auth / RBAC ----
export const UserRoleSchema = z.enum([
  "PlatformAdmin",
  "PracticeOwner",
  "Clinician",
  "Staff",
  "Patient",
]);

// ---- PA Attestation ----
export const PAAttestationSchema = z.object({
  attest: z.literal(true, {
    errorMap: () => ({
      message: "You must confirm you are located in Pennsylvania.",
    }),
  }),
  timestamp: z.string().datetime().optional(),
});

// ---- Appointment Type ----
export const AppointmentTypeSchema = z.object({
  name: z.string().min(1).max(100),
  durationMinutes: z.number().int().min(15).max(120),
  priceInCents: z.number().int().min(0),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  intakeTemplateId: z.string().optional(),
});

// ---- Availability Block ----
export const AvailabilityBlockSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  clinicianId: z.string(),
});

// ---- Booking ----
export const BookingRequestSchema = z.object({
  appointmentTypeId: z.string(),
  clinicianId: z.string(),
  slotStart: z.string().datetime(),
  practiceSlug: z.string(),
  patientNotes: z.string().max(1000).optional(),
  paAttestation: z.literal(true),
});

// ---- SOAP Summary ----
export const SOAPSummarySchema = z.object({
  subjective: z.string(),
  objective: z.string(),
  assessment: z.string(),
  plan: z.string(),
  missingInfo: z.array(z.string()),
  redFlags: z.array(z.string()),
  disclaimer: z
    .string()
    .default(
      "AI-generated summary. Clinician must verify all information before acting."
    ),
});

// ---- Practice Settings ----
export const PracticeRiskControlsSchema = z.object({
  emergencyDisclaimerText: z.string().min(1),
  notTriageBannerText: z.string().min(1),
  messagingDisclaimerText: z.string().min(1),
  afterVisitSummaryVisible: z.boolean().default(false),
  intakeFieldMinimization: z.boolean().default(true),
  reschedulePolicyText: z.string(),
  cancelPolicyText: z.string(),
  patientAttestationText: z.string(),
});

// ---- Clinician Profile ----
export const ClinicianProfileSchema = z.object({
  npi: z.string().regex(/^\d{10}$/).optional(),
  licensedStates: z.array(z.string()).refine((states) => states.includes("PA"), {
    message: "Clinician must be licensed in PA to be schedulable.",
  }),
  specialty: z.string().optional(),
  bio: z.string().max(1000).optional(),
});

// ---- Message ----
export const MessageSchema = z.object({
  content: z.string().min(1).max(5000),
  appointmentId: z.string().optional(),
});

// ---- AgentOps Approval ----
export const ApprovalDecisionSchema = z.object({
  token: z.string(),
  decision: z.enum(["APPROVED", "DENIED", "CHANGES_REQUESTED"]),
  note: z.string().max(1000).optional(),
});

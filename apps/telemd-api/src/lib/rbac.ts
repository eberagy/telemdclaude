import { auth } from "@clerk/nextjs/server";
import { prisma } from "./prisma";
import type { UserRole } from "@telemd/shared";
import type { PracticeMember } from "@prisma/client";

export class AuthorizationError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Require an authenticated user. Returns clerkUserId.
 */
export async function requireAuth(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new AuthorizationError("Not authenticated");
  return userId;
}

/**
 * Get the practice member record for the authenticated user in a given practice.
 * Throws if not found or inactive.
 */
export async function requireMember(
  clerkUserId: string,
  practiceId: string,
  allowedRoles?: UserRole[]
): Promise<PracticeMember> {
  const member = await prisma.practiceMember.findFirst({
    where: { clerkUserId, practiceId, isActive: true },
  });

  if (!member) {
    throw new AuthorizationError("Not a member of this practice");
  }

  if (allowedRoles && !allowedRoles.includes(member.role as UserRole)) {
    throw new AuthorizationError(
      `Role '${member.role}' not authorized for this action`
    );
  }

  return member;
}

/**
 * Full PHI access guard:
 * 1. Auth
 * 2. Role check
 * 3. Practice scope
 * 4. Assignment check (if clinician, must be assigned)
 */
export async function requirePHIAccess(
  practiceId: string,
  appointmentId?: string
): Promise<{ clerkUserId: string; member: PracticeMember }> {
  const clerkUserId = await requireAuth();

  const member = await prisma.practiceMember.findFirst({
    where: { clerkUserId, practiceId, isActive: true },
    include: { clinician: true },
  });

  if (!member) {
    throw new AuthorizationError("Access denied: not a practice member");
  }

  // Staff NEVER gets PHI access (clinical notes, transcripts, AI summaries)
  if (member.role === "Staff") {
    throw new AuthorizationError(
      "Staff members cannot access clinical information"
    );
  }

  // Clinician must be assigned to the appointment
  if (
    member.role === "Clinician" &&
    appointmentId &&
    (member as PracticeMember & { clinician?: { id: string } | null }).clinician
  ) {
    const clinicianProfile = (
      member as PracticeMember & { clinician?: { id: string } | null }
    ).clinician;

    if (clinicianProfile) {
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          practiceId,
          clinicianId: clinicianProfile.id,
        },
      });
      if (!appointment) {
        throw new AuthorizationError(
          "Clinician is not assigned to this appointment"
        );
      }
    }
  }

  return { clerkUserId, member };
}

/**
 * Require an active clinician seat subscription.
 * Throws if seat is inactive.
 */
export async function requireActiveSeat(clinicianId: string): Promise<void> {
  const profile = await prisma.clinicianProfile.findUnique({
    where: { id: clinicianId },
    select: { seatStatus: true },
  });

  if (!profile || profile.seatStatus !== "ACTIVE") {
    throw new AuthorizationError(
      "Clinician seat subscription is inactive. Contact your practice owner."
    );
  }
}

/**
 * Check if a clinician is PA-licensed and schedulable.
 */
export async function requirePALicensure(clinicianId: string): Promise<void> {
  const profile = await prisma.clinicianProfile.findUnique({
    where: { id: clinicianId },
    select: { licensedStates: true, seatStatus: true },
  });

  if (!profile) throw new NotFoundError("Clinician not found");

  if (!profile.licensedStates.includes("PA")) {
    throw new AuthorizationError(
      "Clinician is not licensed in Pennsylvania and cannot be scheduled."
    );
  }

  if (profile.seatStatus !== "ACTIVE") {
    throw new AuthorizationError("Clinician seat is not active.");
  }
}

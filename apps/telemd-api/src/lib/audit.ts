import { Prisma, type AuditEventType } from "@prisma/client";
import { prisma } from "./prisma";

interface AuditParams {
  practiceId: string;
  clerkUserId: string;
  memberId?: string;
  eventType: AuditEventType;
  resourceId?: string;
  resourceType?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write an audit log entry.
 * Never include PHI in metadata — only IDs and non-clinical context.
 */
export async function writeAuditLog(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        practiceId: params.practiceId,
        clerkUserId: params.clerkUserId,
        memberId: params.memberId,
        eventType: params.eventType,
        resourceId: params.resourceId,
        resourceType: params.resourceType,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    // Audit failures must not break the primary operation — log to stderr only
    console.error("[AUDIT_FAIL]", params.eventType, err);
  }
}

/**
 * Extract client IP from request headers (behind proxy).
 */
export function getClientIP(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/rbac";

// GET /api/audit-logs — Practice owner views audit logs
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const practiceId = searchParams.get("practiceId");
    const page = parseInt(searchParams.get("page") ?? "1");
    const search = searchParams.get("search") ?? "";
    const limit = 50;
    const offset = (page - 1) * limit;

    if (!practiceId) {
      // Auto-detect practice from member
      const member = await prisma.practiceMember.findFirst({
        where: { clerkUserId: userId, role: { in: ["PracticeOwner", "PlatformAdmin"] } },
      });
      if (!member) {
        return NextResponse.json({ error: "No practice found" }, { status: 404 });
      }
      return getAuditLogs(member.practiceId, search, limit, offset);
    }

    await requireMember(userId, practiceId, ["PracticeOwner", "PlatformAdmin"]);
    return getAuditLogs(practiceId, search, limit, offset);
  } catch (err) {
    console.error("[audit-logs]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function getAuditLogs(
  practiceId: string,
  search: string,
  limit: number,
  offset: number
) {
  const where = {
    practiceId,
    ...(search
      ? {
          OR: [
            { eventType: { contains: search.toUpperCase() } as { contains: string } },
            { clerkUserId: { contains: search } as { contains: string } },
          ],
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        member: { select: { firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMember, AuthorizationError } from "@/lib/rbac";

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(3).max(20).regex(/^[A-Z0-9_-]+$/, "Code must be uppercase alphanumeric"),
  description: z.string().max(300).optional(),
  coveredVisitsCap: z.number().int().positive().optional(),
  discountPercent: z.number().int().min(1).max(100).default(100),
});

// GET /api/employer-groups?practiceId=... — list for owner/staff
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const practiceId = req.nextUrl.searchParams.get("practiceId");
    if (!practiceId) return NextResponse.json({ error: "practiceId required" }, { status: 400 });

    await requireMember(userId, practiceId, ["PracticeOwner", "Staff"]);

    const groups = await prisma.employerGroup.findMany({
      where: { practiceId },
      include: { _count: { select: { patients: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ groups });
  } catch (err) {
    if (err instanceof AuthorizationError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("[employer-groups GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/employer-groups — create (owner only)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const pid = (body as { practiceId?: string }).practiceId;
    if (!pid) return NextResponse.json({ error: "practiceId required" }, { status: 400 });

    await requireMember(userId, pid, ["PracticeOwner"]);

    const { name, code, description, coveredVisitsCap, discountPercent } = parsed.data;

    const group = await prisma.employerGroup.create({
      data: { practiceId: pid, name, code: code.toUpperCase(), description, coveredVisitsCap, discountPercent },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthorizationError) return NextResponse.json({ error: err.message }, { status: 403 });
    if ((err as { code?: string }).code === "P2002") return NextResponse.json({ error: "That code is already taken." }, { status: 409 });
    console.error("[employer-groups POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

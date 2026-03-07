import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const IntakeFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "textarea", "select", "checkbox", "date", "phone"]),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
});

const IntakeTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  fields: z.array(IntakeFieldSchema).min(1),
});

// GET /api/owner/intake-templates
export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const owner = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, role: "PracticeOwner", isActive: true },
    });
    if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const templates = await prisma.intakeTemplate.findMany({
      where: { practiceId: owner.practiceId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ templates });
  } catch (err) {
    console.error("[owner/intake-templates GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/owner/intake-templates
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const owner = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, role: "PracticeOwner", isActive: true },
    });
    if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const parsed = IntakeTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const template = await prisma.intakeTemplate.create({
      data: {
        practiceId: owner.practiceId,
        name: parsed.data.name,
        fields: parsed.data.fields,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (err) {
    console.error("[owner/intake-templates POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

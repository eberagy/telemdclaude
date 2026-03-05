import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  fields: z.array(z.object({
    key: z.string(),
    label: z.string(),
    type: z.enum(["text", "textarea", "select", "checkbox", "date", "phone"]),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(),
    placeholder: z.string().optional(),
  })).optional(),
});

// PATCH /api/owner/intake-templates/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const owner = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, role: "PracticeOwner", isActive: true },
    });
    if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const existing = await prisma.intakeTemplate.findFirst({
      where: { id: params.id, practiceId: owner.practiceId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.intakeTemplate.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return NextResponse.json({ template: updated });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/owner/intake-templates/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const owner = await prisma.practiceMember.findFirst({
      where: { clerkUserId: userId, role: "PracticeOwner", isActive: true },
    });
    if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const existing = await prisma.intakeTemplate.findFirst({
      where: { id: params.id, practiceId: owner.practiceId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.intakeTemplate.delete({ where: { id: params.id } });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

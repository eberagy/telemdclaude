import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).default(""),
  priority: z.number().int().min(1).max(10).default(5),
  labels: z.array(z.string()).default([]),
});

// POST /api/queue — Submit a manual task
export async function POST(req: NextRequest) {
  try {
    await requireAdminAuth(req);
    const body = await req.json();
    const parsed = CreateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const task = await prisma.queuedTask.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        source: "manual",
        priority: parsed.data.priority,
        labels: parsed.data.labels,
        status: "PENDING",
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    console.error("[queue POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/queue?status=PENDING&limit=50
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "PENDING";
    const limit = parseInt(searchParams.get("limit") ?? "50");

    const tasks = await prisma.queuedTask.findMany({
      where: status === "ALL" ? {} : { status },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: limit,
    });

    return NextResponse.json({ tasks });
  } catch (err) {
    console.error("[queue GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

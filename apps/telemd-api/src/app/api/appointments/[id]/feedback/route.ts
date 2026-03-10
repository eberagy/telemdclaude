/**
 * POST /api/appointments/[id]/feedback — Patient submits post-visit star rating
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const FeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional().default(""),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { id } = await params;

    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: { select: { clerkUserId: true } } },
    });

    if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (appt.patient.clerkUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (appt.status !== "COMPLETED") {
      return NextResponse.json({ error: "Feedback only allowed after appointment is completed" }, { status: 400 });
    }

    if (appt.feedbackAt) {
      return NextResponse.json({ error: "Feedback already submitted" }, { status: 409 });
    }

    const body = await req.json();
    const parsed = FeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    await prisma.appointment.update({
      where: { id },
      data: {
        feedbackRating: parsed.data.rating,
        feedbackComment: parsed.data.comment,
        feedbackAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[appointments/feedback POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requirePHIAccess } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

// GET /api/notes/[id]/export — export a clinician note as PDF (HTML response for browser print)
// Using HTML/CSS approach for simplicity and no Chromium dependency.
// The client-side will trigger window.print() on the returned HTML.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appointmentId } = await params;
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Load note with appointment and practice
    const note = await prisma.clinicianNote.findUnique({
      where: { appointmentId: appointmentId },
      include: {
        appointment: {
          include: {
            practice: { select: { id: true, name: true } },
            appointmentType: { select: { name: true } },
            patient: { select: { email: true } },
            soapSummary: true,
          },
        },
      },
    });

    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Verify PHI access for this practice + appointment
    await requirePHIAccess(note.appointment.practice.id, note.appointmentId);

    await writeAuditLog({
      practiceId: note.appointment.practice.id,
      clerkUserId: userId,
      eventType: "EXPORT_PDF",
      resourceType: "ClinicianNote",
      resourceId: note.id,
    });

    const a = note.appointment;
    const visitDate = new Date(a.slotStart).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const visitTime = new Date(a.slotStart).toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit",
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Visit Note — ${visitDate}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; background: white; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px; }
    header { border-bottom: 2px solid #1d4ed8; padding-bottom: 20px; margin-bottom: 24px; }
    .practice-name { font-size: 22px; font-weight: 700; color: #1d4ed8; }
    .disclaimer { font-size: 10px; color: #6b7280; margin-top: 4px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 24px; font-size: 13px; }
    .meta-item { }
    .meta-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
    .meta-value { font-weight: 500; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 10px; }
    .section-content { font-size: 13px; line-height: 1.6; white-space: pre-wrap; color: #1f2937; }
    .section-content:empty::after { content: "Not documented"; color: #9ca3af; font-style: italic; }
    footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 11px; color: #6b7280; }
    .signature-line { margin-top: 40px; border-bottom: 1px solid #374151; width: 300px; }
    .signature-label { font-size: 11px; color: #6b7280; margin-top: 4px; }
    .watermark { position: fixed; bottom: 20px; right: 20px; font-size: 10px; color: #d1d5db; }
    @media print {
      body { font-size: 12pt; }
      .page { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <header>
      <div class="practice-name">${a.practice.name}</div>
      <div style="font-size:13px; color:#374151; margin-top:4px;">Clinical Visit Note</div>
      <div class="disclaimer">
        CONFIDENTIAL — This document contains protected health information (PHI) governed by HIPAA.
        Unauthorized disclosure is prohibited.
      </div>
    </header>

    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-label">Patient</div>
        <div class="meta-value">${a.patient.email}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Visit Type</div>
        <div class="meta-value">${a.appointmentType.name}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Visit Date</div>
        <div class="meta-value">${visitDate}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Visit Time</div>
        <div class="meta-value">${visitTime} ET</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Note Status</div>
        <div class="meta-value">${note.status}</div>
      </div>
      ${note.signedAt ? `<div class="meta-item"><div class="meta-label">Signed</div><div class="meta-value">${new Date(note.signedAt).toLocaleDateString()}</div></div>` : ""}
    </div>

    <div class="section">
      <div class="section-title">Subjective</div>
      <div class="section-content">${note.subjective ?? ""}</div>
    </div>

    <div class="section">
      <div class="section-title">Objective</div>
      <div class="section-content">${note.objective ?? ""}</div>
    </div>

    <div class="section">
      <div class="section-title">Assessment</div>
      <div class="section-content">${note.assessment ?? ""}</div>
    </div>

    <div class="section">
      <div class="section-title">Plan</div>
      <div class="section-content">${note.plan ?? ""}</div>
    </div>

    ${note.freeText ? `<div class="section"><div class="section-title">Additional Notes</div><div class="section-content">${note.freeText}</div></div>` : ""}

    ${a.soapSummary ? `
    <div class="section" style="background:#f0f9ff; padding:12px; border-radius:6px; border:1px solid #bae6fd;">
      <div class="section-title" style="color:#0369a1;">AI-Assisted Summary (Clinician Review Required)</div>
      <div class="section-content">${a.soapSummary.disclaimer}</div>
    </div>` : ""}

    <div style="margin-top:48px;">
      <div class="signature-line"></div>
      <div class="signature-label">Clinician Signature / Date</div>
    </div>

    <footer>
      <p>${a.practice.name} · Telehealth Visit · Pennsylvania · Generated ${new Date().toLocaleString("en-US")}</p>
      <p style="margin-top:4px;">This note was generated by TeleMD. It should be reviewed and co-signed by the treating clinician before use as a medical record.</p>
    </footer>
  </div>

  <script>
    window.addEventListener('load', () => window.print());
  </script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="visit-note-${appointmentId}.html"`,
      },
    });
  } catch (err) {
    console.error("[notes/[id]/export GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

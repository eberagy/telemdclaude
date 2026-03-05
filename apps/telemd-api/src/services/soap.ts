import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const SOAP_SYSTEM_PROMPT = `You are a clinical documentation assistant helping physicians with intake call transcripts.

IMPORTANT RULES:
1. You are NOT providing medical advice or diagnoses
2. Your output is for clinician review only — never shown directly to patients
3. Mark all "Assessment" items as suggestions only — the clinician decides
4. Flag any missing critical information clearly
5. Flag red flags for clinician attention — these are shown ONLY to clinicians, never patients
6. Always include the disclaimer

Output strict JSON matching this schema:
{
  "subjective": "string — patient's reported symptoms, history, chief complaint",
  "objective": "string — patient-reported vitals, observations (no exam performed)",
  "assessment": "string — possible considerations for clinician review (NOT diagnoses)",
  "plan": "string — suggested next steps for clinician consideration (NOT prescriptive)",
  "missingInfo": ["string array — critical info not captured in intake"],
  "redFlags": ["string array — clinician-only flags: suicide risk, abuse, emergency symptoms, etc."],
  "disclaimer": "AI-generated summary. Clinician must verify all information before acting."
}`;

export async function generateSOAPSummary(
  appointmentId: string,
  transcript: string
): Promise<void> {
  if (!transcript || transcript.trim().length < 10) {
    console.warn(`[soap] Skipping SOAP for ${appointmentId} — empty transcript`);
    return;
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001", // Use efficient model for summaries
      max_tokens: 2048,
      system: SOAP_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generate a SOAP summary from this patient intake transcript:\n\n${transcript}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from LLM");
    }

    // Parse JSON response
    let parsed: {
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
      missingInfo: string[];
      redFlags: string[];
      disclaimer: string;
    };

    try {
      // Extract JSON from response (may have markdown code blocks)
      const jsonMatch =
        content.text.match(/```json\n?([\s\S]*?)\n?```/) ||
        content.text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content.text;
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error(`Failed to parse SOAP JSON: ${content.text.substring(0, 200)}`);
    }

    // Validate required fields
    if (!parsed.subjective || !parsed.assessment) {
      throw new Error("Invalid SOAP structure from LLM");
    }

    // Save SOAP summary
    const soap = await prisma.sOAPSummary.create({
      data: {
        subjective: parsed.subjective,
        objective: parsed.objective ?? "",
        assessment: parsed.assessment,
        plan: parsed.plan ?? "",
        missingInfo: parsed.missingInfo ?? [],
        redFlags: parsed.redFlags ?? [],
        disclaimer:
          parsed.disclaimer ??
          "AI-generated summary. Clinician must verify all information before acting.",
        modelUsed: "claude-haiku-4-5-20251001",
      },
    });

    // Link to appointment
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        soapSummaryId: soap.id,
        status: "INTAKE_COMPLETED",
      },
    });

    console.log(`[soap] Generated SOAP summary ${soap.id} for appointment ${appointmentId}`);
  } catch (err) {
    console.error(`[soap] Failed to generate SOAP for ${appointmentId}:`, err);
    // Don't rethrow — we don't want to break the intake flow
  }
}

/**
 * Unit tests for SOAP summary formatting.
 */

import { describe, it, expect } from "vitest";

interface SOAPSummary {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  missingInfo: string[];
  redFlags: string[];
  disclaimer: string;
}

function formatSOAPForNote(soap: SOAPSummary): string {
  const sections = [
    `S: ${soap.subjective}`,
    `O: ${soap.objective}`,
    `A: ${soap.assessment}`,
    `P: ${soap.plan}`,
  ];
  if (soap.missingInfo.length > 0) {
    sections.push(`Missing: ${soap.missingInfo.join("; ")}`);
  }
  return sections.join("\n\n");
}

function stripRedFlagsForPatient(soap: SOAPSummary): Omit<SOAPSummary, "redFlags"> {
  const { redFlags: _, ...safe } = soap;
  return safe;
}

function validateSOAPCompleteness(soap: Partial<SOAPSummary>): string[] {
  const errors: string[] = [];
  if (!soap.subjective?.trim()) errors.push("Subjective is required");
  if (!soap.objective?.trim()) errors.push("Objective is required");
  if (!soap.assessment?.trim()) errors.push("Assessment is required");
  if (!soap.plan?.trim()) errors.push("Plan is required");
  return errors;
}

describe("formatSOAPForNote", () => {
  it("produces all four SOAP sections", () => {
    const soap: SOAPSummary = {
      subjective: "Patient reports headache",
      objective: "BP 120/80",
      assessment: "Tension headache",
      plan: "Rest and hydration",
      missingInfo: [],
      redFlags: [],
      disclaimer: "AI-generated",
    };
    const result = formatSOAPForNote(soap);
    expect(result).toContain("S: Patient reports headache");
    expect(result).toContain("O: BP 120/80");
    expect(result).toContain("A: Tension headache");
    expect(result).toContain("P: Rest and hydration");
  });

  it("includes missing info when present", () => {
    const soap: SOAPSummary = {
      subjective: "Cough",
      objective: "Clear lungs",
      assessment: "URI",
      plan: "Rest",
      missingInfo: ["Duration of symptoms", "Fever history"],
      redFlags: [],
      disclaimer: "AI-generated",
    };
    const result = formatSOAPForNote(soap);
    expect(result).toContain("Missing:");
    expect(result).toContain("Duration of symptoms");
  });
});

describe("stripRedFlagsForPatient", () => {
  it("removes red flags from patient-facing summary", () => {
    const soap: SOAPSummary = {
      subjective: "Chest pain",
      objective: "EKG pending",
      assessment: "Possible angina",
      plan: "Cardiology referral",
      missingInfo: [],
      redFlags: ["Possible cardiac event — urgent referral needed"],
      disclaimer: "AI-generated",
    };
    const safe = stripRedFlagsForPatient(soap);
    expect("redFlags" in safe).toBe(false);
    expect(safe.assessment).toBe("Possible angina");
  });
});

describe("validateSOAPCompleteness", () => {
  it("returns errors for empty fields", () => {
    const errors = validateSOAPCompleteness({ subjective: "", objective: "OK" });
    expect(errors).toContain("Subjective is required");
    expect(errors).toContain("Assessment is required");
    expect(errors).toContain("Plan is required");
  });

  it("returns no errors for complete SOAP", () => {
    const errors = validateSOAPCompleteness({
      subjective: "S", objective: "O", assessment: "A", plan: "P",
    });
    expect(errors).toHaveLength(0);
  });
});

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding TeleMD database...");

  // Create demo practice
  const practice = await prisma.practice.upsert({
    where: { slug: "demo-practice" },
    update: {},
    create: {
      name: "Demo Family Medicine",
      slug: "demo-practice",
      serviceState: "PA",
      timezone: "America/New_York",
    },
  });

  console.log(`Practice created: ${practice.name} (${practice.id})`);

  // Create default intake template
  const intakeTemplate = await prisma.intakeTemplate.upsert({
    where: { id: "default-template" },
    update: {},
    create: {
      id: "default-template",
      practiceId: practice.id,
      name: "Standard Intake",
      fields: [
        { name: "chiefComplaint", label: "Chief Complaint", type: "text", required: true },
        { name: "symptoms", label: "Current Symptoms", type: "textarea", required: true },
        { name: "duration", label: "Duration of Symptoms", type: "text", required: true },
        { name: "medications", label: "Current Medications", type: "textarea", required: false },
        { name: "allergies", label: "Known Allergies", type: "text", required: false },
        { name: "medicalHistory", label: "Relevant Medical History", type: "textarea", required: false },
      ],
    },
  });

  // Create appointment types
  await prisma.appointmentType.upsert({
    where: { id: "appt-type-general" },
    update: {},
    create: {
      id: "appt-type-general",
      practiceId: practice.id,
      name: "General Consultation",
      description: "30-minute general medical consultation",
      durationMinutes: 30,
      priceInCents: 14900, // $149
      intakeTemplateId: intakeTemplate.id,
    },
  });

  await prisma.appointmentType.upsert({
    where: { id: "appt-type-follow-up" },
    update: {},
    create: {
      id: "appt-type-follow-up",
      practiceId: practice.id,
      name: "Follow-Up Visit",
      description: "15-minute follow-up consultation",
      durationMinutes: 15,
      priceInCents: 7900, // $79
      intakeTemplateId: intakeTemplate.id,
    },
  });

  // Create default evidence links
  await prisma.evidenceLink.createMany({
    skipDuplicates: true,
    data: [
      {
        practiceId: practice.id,
        title: "UpToDate — Clinical Decision Support",
        url: "https://www.uptodate.com",
        snippet: "Evidence-based clinical decision support",
        tags: ["reference", "clinical"],
      },
      {
        practiceId: practice.id,
        title: "CDC Guidelines",
        url: "https://www.cdc.gov/guidelines",
        snippet: "CDC clinical practice guidelines",
        tags: ["guidelines", "cdc"],
      },
    ],
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

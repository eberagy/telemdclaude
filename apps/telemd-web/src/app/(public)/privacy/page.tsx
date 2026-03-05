import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy | TeleMD" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-white sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="font-bold text-xl">TeleMD</Link>
          <Link href="/sign-in"><Button size="sm" variant="outline">Sign In</Button></Link>
        </div>
      </nav>

      <div className="container py-16 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Effective: January 1, 2026 · Last updated: March 1, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Who We Are</h2>
            <p>TeleMD, LLC (&quot;TeleMD,&quot; &quot;we,&quot; &quot;us&quot;) operates a telehealth platform for Pennsylvania-based healthcare practices. This Privacy Policy explains how we collect, use, and protect information — including Protected Health Information (PHI) — when you use our Platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. HIPAA Compliance</h2>
            <p>TeleMD functions as a Business Associate under HIPAA when processing PHI on behalf of covered entity Practices. We maintain a Business Associate Agreement (BAA) with each Practice. PHI is encrypted at rest and in transit. Access to PHI is role-restricted and fully audit-logged per HIPAA requirements.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. Information We Collect</h2>
            <div className="space-y-3">
              <div>
                <p className="font-medium">Account Information:</p>
                <p className="text-muted-foreground">Name, email address, and authentication credentials (managed by Clerk, a SOC 2 Type II compliant provider).</p>
              </div>
              <div>
                <p className="font-medium">Patient Health Information (PHI):</p>
                <p className="text-muted-foreground">Date of birth, location attestation, intake responses (collected via AI voice call), visit transcripts, SOAP summaries, clinical notes, and appointment history. This information is shared only with authorized Practice members.</p>
              </div>
              <div>
                <p className="font-medium">Payment Information:</p>
                <p className="text-muted-foreground">Payment processing is handled by Stripe. TeleMD does not store full card numbers or bank details.</p>
              </div>
              <div>
                <p className="font-medium">Usage &amp; Technical Data:</p>
                <p className="text-muted-foreground">Log data, PHI access audit events, session metadata (no video is recorded or stored).</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. How We Use Information</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Providing and operating the telehealth Platform</li>
              <li>Facilitating appointments, intake, and clinical documentation</li>
              <li>Processing payments via Stripe</li>
              <li>Sending appointment reminders via email/SMS (Postmark + Twilio)</li>
              <li>Maintaining HIPAA-required audit logs of PHI access</li>
              <li>Improving platform reliability and security (Sentry, PostHog — no PHI)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Video Sessions</h2>
            <p>Video visits use the Zoom Video SDK. <strong>Sessions are never recorded.</strong> No video or audio is stored by TeleMD. Cloud recording is disabled at the SDK level. Session metadata (duration, participant IDs) is retained for billing and audit purposes only.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. AI Processing</h2>
            <p>Voice intake is conducted by Retell AI. Intake transcripts and SOAP summaries are generated using Anthropic Claude and are stored securely in our database. AI outputs are labeled as AI-generated and are visible only to authorized clinicians (red flags are never shown to patients). AI providers operate under data processing agreements that prohibit training on your data.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Data Sharing</h2>
            <p>We do not sell PHI. We share data only with: (a) the Practice that provides your care; (b) sub-processors necessary to operate the Platform (Clerk, Stripe, Zoom, Retell, Anthropic, Postmark, Twilio, AWS S3, Sentry, PostHog) — all under appropriate data agreements; (c) as required by law.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">8. Data Retention</h2>
            <p>Clinical records are retained for a minimum of 7 years in accordance with Pennsylvania medical records law. Account data is retained for as long as your account is active. Audit logs are retained for 6 years. You may request deletion of non-PHI account data at any time.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">9. Your Rights</h2>
            <p>Under HIPAA, patients have the right to access, amend, and receive an accounting of disclosures of their PHI. To exercise these rights, contact your healthcare Practice directly. For account-level privacy requests: privacy@telemd.health</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">10. Security</h2>
            <p>We use industry-standard security measures including TLS encryption in transit, AES-256 encryption at rest (AWS), role-based access control, and full audit logging of PHI access. We conduct regular security reviews and maintain a vulnerability disclosure policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">11. Changes</h2>
            <p>We may update this Policy. Material changes will be communicated to Practice Owners by email at least 30 days in advance.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">12. Contact</h2>
            <p>Privacy Officer: privacy@telemd.health · TeleMD, LLC · Philadelphia, PA</p>
          </section>
        </div>
      </div>

      <footer className="border-t py-6 mt-16 bg-white">
        <div className="container flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
          <span>© 2026 TeleMD, LLC</span>
        </div>
      </footer>
    </div>
  );
}

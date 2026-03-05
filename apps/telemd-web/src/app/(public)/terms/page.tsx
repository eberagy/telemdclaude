import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service | TeleMD" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-white sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="font-bold text-xl">TeleMD</Link>
          <Link href="/sign-in"><Button size="sm" variant="outline">Sign In</Button></Link>
        </div>
      </nav>

      <div className="container py-16 max-w-3xl prose prose-sm">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-8">Effective: January 1, 2026 · Last updated: March 1, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Acceptance of Terms</h2>
            <p>By creating an account or using TeleMD (&quot;the Platform&quot;), you agree to these Terms of Service. If you do not agree, do not use the Platform. TeleMD is operated by TeleMD, LLC and is available only to users located in the Commonwealth of Pennsylvania.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. Eligibility &amp; Geographic Restrictions</h2>
            <p>The Platform is currently restricted to Pennsylvania-licensed healthcare practices and patients located in Pennsylvania at the time of each visit. You must attest to your Pennsylvania location at booking. Misrepresenting your location is grounds for immediate account termination.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. Not for Emergencies</h2>
            <p className="font-medium text-red-700">TeleMD is not an emergency service. If you are experiencing a medical emergency, call 911 immediately. The Platform does not provide emergency triage, crisis intervention, or urgent care services.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Practice Accounts</h2>
            <p>Healthcare practices (&quot;Practices&quot;) subscribe to the Platform at $299 per active clinician seat per week. The Practice Owner is responsible for ensuring all clinicians hold valid Pennsylvania licensure and maintain compliance with applicable state and federal regulations including HIPAA.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Patient Accounts</h2>
            <p>Patients create accounts to book and attend telehealth appointments. Payment is required prior to appointment confirmation. Refund eligibility is governed by the individual practice&apos;s cancellation policy, which is displayed at booking.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. AI-Generated Content</h2>
            <p>The Platform uses AI systems (including voice intake and SOAP summary generation) to assist clinicians. AI-generated content is provided as a clinical aid only and does not constitute medical advice. All clinical decisions remain the sole responsibility of the licensed clinician. AI summaries are labeled accordingly and must be reviewed before use.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Privacy &amp; HIPAA</h2>
            <p>Protected Health Information (PHI) is handled in accordance with our <Link href="/privacy" className="text-primary underline">Privacy Policy</Link> and applicable HIPAA regulations. Video sessions use Zoom Video SDK with no cloud recording. PHI access is logged in our audit system.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">8. Payments</h2>
            <p>All payments are processed by Stripe. TeleMD does not store full payment card details. Practice subscription fees are charged weekly. Patient appointment fees are set by the Practice and paid directly at booking.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">9. Prohibited Uses</h2>
            <p>You may not: (a) use the Platform for any purpose other than legitimate telehealth services; (b) attempt to access another user&apos;s account; (c) reverse-engineer the Platform; (d) submit false or misleading information; (e) use the Platform outside Pennsylvania.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">10. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, TeleMD&apos;s liability is limited to the amount paid by you in the twelve months preceding the claim. TeleMD is not liable for any clinical outcomes, missed diagnoses, or treatment decisions made by clinicians using the Platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">11. Termination</h2>
            <p>Either party may terminate at any time. TeleMD may suspend or terminate accounts for violation of these Terms. Upon termination, your access to the Platform will cease. Practices should export any clinical documentation they require before terminating.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">12. Changes to Terms</h2>
            <p>We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance. We will notify Practice Owners of material changes by email.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">13. Governing Law</h2>
            <p>These Terms are governed by the laws of the Commonwealth of Pennsylvania. Any disputes shall be resolved in the courts of Philadelphia County, Pennsylvania.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">14. Contact</h2>
            <p>For legal notices: legal@telemd.health · TeleMD, LLC · Philadelphia, PA</p>
          </section>
        </div>
      </div>

      <footer className="border-t py-6 mt-16 bg-white">
        <div className="container flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <span>© 2026 TeleMD, LLC</span>
        </div>
      </footer>
    </div>
  );
}

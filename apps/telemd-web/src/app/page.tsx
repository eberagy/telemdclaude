import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Shield,
  Video,
  Brain,
  Calendar,
  CreditCard,
  Users,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-white sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-bold text-xl text-foreground">TeleMD</span>
            <Badge variant="secondary" className="text-xs">PA Only</Badge>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="/demo">
              <Button variant="outline" size="sm">Request Demo</Button>
            </Link>
            <Link href="/sign-in">
              <Button size="sm">Sign In</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Emergency Banner */}
      <div className="bg-red-50 border-b border-red-200">
        <div className="container py-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">
            <strong>Not for emergencies.</strong> If you are experiencing a medical emergency, call 911 immediately. TeleMD does not provide emergency triage.
          </p>
        </div>
      </div>

      {/* Hero */}
      <section className="py-20 bg-gradient-to-b from-background to-blue-50">
        <div className="container text-center">
          <Badge className="mb-4" variant="outline">
            Pennsylvania Telehealth Platform
          </Badge>
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Cash-Pay Telehealth for<br />
            <span className="text-primary">Independent Practices</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Streamlined telehealth with AI-powered intake, Zoom video visits,
            and complete clinical documentation. Purpose-built for Pennsylvania practices.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/demo">
              <Button size="lg" className="text-base px-8">Request a Demo</Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="text-base px-8">View Pricing</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-4">
            Everything Your Practice Needs
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            From booking to clinical notes, TeleMD handles the entire telehealth workflow.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: "AI Voice Intake",
                desc: "Retell AI conducts structured intake calls before visits. SOAP summaries auto-generated for clinicians.",
              },
              {
                icon: Video,
                title: "Secure Video Visits",
                desc: "Zoom Video SDK sessions — no recording, no storage of video. HIPAA-conscious design.",
              },
              {
                icon: Calendar,
                title: "Smart Scheduling",
                desc: "Clinician-specific availability, buffer times, configurable cancel/reschedule policies.",
              },
              {
                icon: CreditCard,
                title: "Integrated Payments",
                desc: "Stripe Checkout collects payment before confirming appointments. Refund policies configurable.",
              },
              {
                icon: Shield,
                title: "RBAC + Audit Logs",
                desc: "Role-based access control. Staff cannot view clinical notes. Every PHI access is logged.",
              },
              {
                icon: Users,
                title: "Multi-Role Portals",
                desc: "Separate portals for patients, clinicians, staff, and owners. Each sees only what they need.",
              },
            ].map((feature) => (
              <Card key={feature.title} className="border-2 hover:border-primary/30 transition-colors">
                <CardHeader>
                  <feature.icon className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.desc}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PA Gating Notice */}
      <section className="py-16 bg-blue-50">
        <div className="container max-w-3xl text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Pennsylvania Only — By Design</h2>
          <p className="text-muted-foreground mb-6">
            TeleMD is currently authorized for Pennsylvania practices and patients only.
            Clinicians must hold active PA licensure. Patients must attest to their
            Pennsylvania location at the time of each visit.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {[
              "PA clinician licensure verification",
              "Patient location attestation",
              "Practice state gating",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full text-sm border">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Launch Your Telehealth Practice?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Get your practice set up in minutes. $299/clinician/week subscription, no setup fees.
          </p>
          <Link href="/demo">
            <Button size="lg" className="text-base px-10">Schedule a Demo</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-white">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">T</span>
            </div>
            <span className="font-semibold">TeleMD</span>
            <span className="text-muted-foreground text-sm">— Pennsylvania Only</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link href="/demo" className="hover:text-foreground">Demo</Link>
            <span>© 2026 TeleMD</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

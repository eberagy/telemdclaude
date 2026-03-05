import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-white">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="font-bold text-xl">TeleMD</Link>
          <Link href="/sign-in"><Button size="sm">Sign In</Button></Link>
        </div>
      </nav>

      <div className="container py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-muted-foreground text-lg">
            No setup fees. No contracts. Pay per clinician seat.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Practice Subscription */}
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle>Clinician Seat</CardTitle>
              <div className="text-4xl font-bold">$299<span className="text-lg font-normal text-muted-foreground">/week</span></div>
              <p className="text-sm text-muted-foreground">Per active clinician</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "Unlimited patient visits",
                "AI voice intake (Retell)",
                "SOAP summary generation",
                "Zoom video sessions",
                "Clinical note editor + PDF export",
                "Messaging system",
                "Audit logs",
                "PA state gating enforced",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  {f}
                </div>
              ))}
              <Link href="/demo" className="block pt-4">
                <Button className="w-full">Get Started</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Patient Payments */}
          <Card>
            <CardHeader>
              <CardTitle>Patient Payments</CardTitle>
              <div className="text-4xl font-bold">You set<span className="text-lg font-normal text-muted-foreground"> the price</span></div>
              <p className="text-sm text-muted-foreground">Per appointment type</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "Practice sets price per visit type",
                "Stripe Checkout (secure payment)",
                "Payment required before booking confirmed",
                "Configurable refund/cancel policies",
                "Payments go directly to practice",
                "No TeleMD revenue share on patient fees",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>Currently serving Pennsylvania practices only.</p>
          <p className="mt-1">Questions? <Link href="/demo" className="text-primary underline">Talk to us</Link></p>
        </div>
      </div>
    </div>
  );
}

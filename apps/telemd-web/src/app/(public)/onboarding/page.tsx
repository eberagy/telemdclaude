"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, ArrowRight, ArrowLeft, Building2, Users, Settings, CreditCard } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { id: "practice", label: "Practice Info", icon: Building2 },
  { id: "team", label: "Invite Team", icon: Users },
  { id: "configure", label: "Configure", icon: Settings },
  { id: "billing", label: "Connect Billing", icon: CreditCard },
];

interface PracticeForm {
  name: string;
  slug: string;
  timezone: string;
}

interface InviteEntry {
  email: string;
  role: "Clinician" | "Staff";
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [practiceId, setPracticeId] = useState<string | null>(null);

  // Step 1: Practice info
  const [practice, setPractice] = useState<PracticeForm>({
    name: "",
    slug: "",
    timezone: "America/New_York",
  });

  // Step 2: Team invites
  const [invites, setInvites] = useState<InviteEntry[]>([
    { email: "", role: "Clinician" },
  ]);

  // Step 3: Configuration (use existing owner/practice API)
  const [afterVisitSummary, setAfterVisitSummary] = useState(false);
  const [cancelWindow, setCancelWindow] = useState(24);

  const progress = ((step + 1) / STEPS.length) * 100;

  const slugify = (name: string) =>
    name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  // Step 1 submit: create practice via API
  const createPractice = async () => {
    if (!practice.name || !practice.slug) {
      toast.error("Practice name and URL slug are required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/onboarding/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(practice),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to create practice");
      setSaving(false);
      return;
    }
    setPracticeId(data.practiceId);
    // Reload Clerk session so new PracticeOwner role is in the JWT immediately
    await user?.reload().catch(() => {});
    setStep(1);
    setSaving(false);
  };

  // Step 2: Send invites
  const sendInvites = async () => {
    setSaving(true);
    const validInvites = invites.filter((i) => i.email.trim());
    await Promise.all(
      validInvites.map((inv) =>
        fetch("/api/owner/team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(inv),
        })
      )
    );
    toast.success(`Sent ${validInvites.length} invite(s)`);
    setStep(2);
    setSaving(false);
  };

  // Step 3: Save config
  const saveConfig = async () => {
    setSaving(true);
    await fetch("/api/owner/practice", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ afterVisitSummaryVisible: afterVisitSummary, cancelWindowHours: cancelWindow }),
    });
    setStep(3);
    setSaving(false);
  };

  // Step 4: Connect Stripe
  const openStripe = async () => {
    setSaving(true);
    const res = await fetch("/api/stripe/billing-portal", { method: "POST" });
    const data = await res.json();
    setSaving(false);
    if (data.url) {
      window.location.href = data.url;
    } else {
      toast.info("Stripe billing not yet configured. You can do this later in Owner → Billing.");
      router.push("/owner/billing");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <h1 className="text-2xl font-bold">Set up your practice</h1>
          <p className="text-muted-foreground text-sm">You're just a few steps away from going live.</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold flex-shrink-0 ${
                i < step ? "bg-green-500 text-white" :
                i === step ? "bg-primary text-white" :
                "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${i < step ? "bg-green-500" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>
        <Progress value={progress} className="h-1" />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {(() => { const Icon = STEPS[step].icon; return <Icon className="h-5 w-5 text-primary" />; })()}
              {STEPS[step].label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Step 0: Practice Info */}
            {step === 0 && (
              <>
                <div className="space-y-1.5">
                  <Label>Practice Name *</Label>
                  <Input
                    placeholder="Sunrise Health PA"
                    value={practice.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setPractice((p) => ({ ...p, name, slug: slugify(name) }));
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>URL Slug *</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">telemd.health/book/</span>
                    <Input
                      placeholder="sunrise-health-pa"
                      value={practice.slug}
                      onChange={(e) => setPractice((p) => ({ ...p, slug: slugify(e.target.value) }))}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Patients will book at this URL. Cannot be changed later.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Timezone</Label>
                  <select
                    value={practice.timezone}
                    onChange={(e) => setPractice((p) => ({ ...p, timezone: e.target.value }))}
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  </select>
                </div>
                <Button onClick={createPractice} disabled={saving || !practice.name || !practice.slug} className="w-full">
                  {saving ? "Creating..." : "Create Practice"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}

            {/* Step 1: Invite Team */}
            {step === 1 && (
              <>
                <p className="text-sm text-muted-foreground">
                  Invite clinicians and staff. They'll receive an email with a secure sign-up link.
                </p>
                <div className="space-y-3">
                  {invites.map((inv, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        type="email"
                        placeholder="colleague@example.com"
                        value={inv.email}
                        onChange={(e) => {
                          const next = [...invites];
                          next[idx] = { ...next[idx], email: e.target.value };
                          setInvites(next);
                        }}
                        className="flex-1"
                      />
                      <select
                        value={inv.role}
                        onChange={(e) => {
                          const next = [...invites];
                          next[idx] = { ...next[idx], role: e.target.value as "Clinician" | "Staff" };
                          setInvites(next);
                        }}
                        className="border rounded px-2 py-2 text-sm bg-background"
                      >
                        <option value="Clinician">Clinician</option>
                        <option value="Staff">Staff</option>
                      </select>
                      {invites.length > 1 && (
                        <button
                          onClick={() => setInvites(invites.filter((_, i) => i !== idx))}
                          className="text-muted-foreground hover:text-red-500"
                        >×</button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInvites([...invites, { email: "", role: "Clinician" }])}
                  >
                    + Add Another
                  </Button>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep(0)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                  </Button>
                  <Button onClick={sendInvites} disabled={saving} className="flex-1">
                    {saving ? "Sending..." : invites.some((i) => i.email) ? "Send Invites & Continue" : "Skip for Now"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 2: Configure */}
            {step === 2 && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">After-Visit Summary</p>
                      <p className="text-xs text-muted-foreground">Share AI summary with patients after visit</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={afterVisitSummary}
                      onChange={(e) => setAfterVisitSummary(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cancellation Window (hours)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={168}
                      value={cancelWindow}
                      onChange={(e) => setCancelWindow(parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Patients must cancel at least this many hours before their appointment.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                  </Button>
                  <Button onClick={saveConfig} disabled={saving} className="flex-1">
                    {saving ? "Saving..." : "Save & Continue"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Billing */}
            {step === 3 && (
              <>
                <div className="text-center space-y-4 py-4">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Almost there!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Connect Stripe to activate clinician seat billing ($299/week per clinician)
                      and accept patient payments.
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground bg-muted rounded-lg p-4 text-left space-y-1">
                    <p>✓ Practice created</p>
                    <p>✓ Team invites sent</p>
                    <p>✓ Settings configured</p>
                    <p className="text-amber-600">◎ Stripe billing (optional now)</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => router.push("/owner/billing")} className="flex-1">
                    Skip for Now
                  </Button>
                  <Button onClick={openStripe} disabled={saving} className="flex-1">
                    {saving ? "Opening..." : "Connect Stripe"}
                    <CreditCard className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          You can update all settings later in the Owner Portal.
        </p>
      </div>
    </div>
  );
}

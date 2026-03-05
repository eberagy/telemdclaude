"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Save, CheckCircle } from "lucide-react";

interface Practice {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  serviceState: string;
  cancelWindowHours: number;
  rescheduleWindowHours: number;
  afterVisitSummaryVisible: boolean;
  intakeFieldMinimization: boolean;
  emergencyDisclaimerText: string;
  messagingDisclaimerText: string;
  patientAttestationText: string;
  cancelPolicyText: string;
  reschedulePolicyText: string;
}

export default function OwnerSettingsPage() {
  const [practice, setPractice] = useState<Practice | null>(null);
  const [form, setForm] = useState<Partial<Practice>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/owner/practice")
      .then((r) => r.json())
      .then((data) => {
        setPractice(data.practice);
        setForm(data.practice ?? {});
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/owner/practice", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      setPractice(data.practice);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="container py-8 max-w-2xl">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Practice Settings
        </h1>
        <Button onClick={handleSave} disabled={saving}>
          {saved ? (
            <><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Saved</>
          ) : (
            <><Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}</>
          )}
        </Button>
      </div>

      {/* General */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Practice Name</Label>
            <Input
              value={form.name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Slug (URL)</Label>
              <Input value={form.slug ?? ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Contact support to change</p>
            </div>
            <div className="space-y-1.5">
              <Label>Service State</Label>
              <Input value="Pennsylvania (PA)" disabled className="bg-muted" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Input
              value={form.timezone ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
              placeholder="America/New_York"
            />
          </div>
        </CardContent>
      </Card>

      {/* Scheduling Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheduling Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cancel Window (hours)</Label>
              <Input
                type="number"
                min={0}
                max={168}
                value={form.cancelWindowHours ?? 24}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cancelWindowHours: parseInt(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reschedule Window (hours)</Label>
              <Input
                type="number"
                min={0}
                max={168}
                value={form.rescheduleWindowHours ?? 24}
                onChange={(e) =>
                  setForm((f) => ({ ...f, rescheduleWindowHours: parseInt(e.target.value) }))
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Cancellation Policy Text</Label>
            <Textarea
              value={form.cancelPolicyText ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, cancelPolicyText: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Reschedule Policy Text</Label>
            <Textarea
              value={form.reschedulePolicyText ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, reschedulePolicyText: e.target.value }))}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Compliance & Disclaimers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance & Disclaimers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Show After-Visit Summary to Patient</p>
              <p className="text-xs text-muted-foreground">Off by default per HIPAA policy</p>
            </div>
            <Switch
              checked={form.afterVisitSummaryVisible ?? false}
              onCheckedChange={(v) => setForm((f) => ({ ...f, afterVisitSummaryVisible: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Minimize Intake Fields</p>
              <p className="text-xs text-muted-foreground">Collect only necessary PHI</p>
            </div>
            <Switch
              checked={form.intakeFieldMinimization ?? true}
              onCheckedChange={(v) => setForm((f) => ({ ...f, intakeFieldMinimization: v }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Emergency Disclaimer</Label>
            <Textarea
              value={form.emergencyDisclaimerText ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, emergencyDisclaimerText: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Messaging Disclaimer</Label>
            <Textarea
              value={form.messagingDisclaimerText ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, messagingDisclaimerText: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Patient Attestation Text (PA)</Label>
            <Textarea
              value={form.patientAttestationText ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, patientAttestationText: e.target.value }))}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

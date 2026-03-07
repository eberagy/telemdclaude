"use client";

import { useEffect, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, AlertTriangle, Save } from "lucide-react";
import { PracticeRiskControlsSchema } from "@telemd/shared";
import type { z } from "zod";

type RiskControlsForm = z.infer<typeof PracticeRiskControlsSchema>;

export default function RiskControlsPage() {
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RiskControlsForm>({
    resolver: zodResolver(PracticeRiskControlsSchema),
    defaultValues: {
      emergencyDisclaimerText:
        "If you are experiencing a medical emergency, call 911 immediately.",
      notTriageBannerText:
        "This service does not provide emergency triage. Call 911 for emergencies.",
      messagingDisclaimerText:
        "Do not use messaging for emergencies. Call 911.",
      afterVisitSummaryVisible: false,
      intakeFieldMinimization: true,
      reschedulePolicyText:
        "Reschedules allowed up to 24 hours before appointment.",
      cancelPolicyText: "Cancellations allowed up to 24 hours before appointment.",
      patientAttestationText:
        "I am located in Pennsylvania at the time of the visit.",
    },
  });

  useEffect(() => {
    fetch("/api/practice/risk-controls")
      .then((r) => r.json())
      .then((data) => {
        if (data.practice) {
          setPracticeId(data.practice.id);
          reset(data.practice);
        }
      });
  }, [reset]);

  const onSubmit = async (data: RiskControlsForm) => {
    setSaving(true);
    const res = await fetch("/api/practice/risk-controls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <div className="container py-8 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Risk Controls
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure safety disclaimers, visibility settings, and patient policy text.
          </p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1.5 rounded-md text-sm">
            <CheckCircle className="h-4 w-4" />
            Saved
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Safety Disclaimers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Safety Disclaimers
              <Badge variant="outline" className="text-xs">Enforced on all screens</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              label="Emergency Disclaimer Text"
              hint="Shown at the top of all patient-facing pages"
              error={errors.emergencyDisclaimerText?.message}
            >
              <textarea
                {...register("emergencyDisclaimerText")}
                rows={2}
                className="field-input"
              />
            </FormField>
            <FormField
              label="Not-Triage Banner Text"
              hint="Shown on booking and appointment pages"
              error={errors.notTriageBannerText?.message}
            >
              <textarea
                {...register("notTriageBannerText")}
                rows={2}
                className="field-input"
              />
            </FormField>
            <FormField
              label="Messaging Disclaimer Text"
              hint="Shown above every messaging thread"
              error={errors.messagingDisclaimerText?.message}
            >
              <textarea
                {...register("messagingDisclaimerText")}
                rows={2}
                className="field-input"
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Visibility Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visibility & Access Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleField
              label="After-Visit Summary Visible to Patients"
              hint="Default: OFF. If enabled, patients can view their visit summary."
              id="afterVisitSummaryVisible"
              registration={register("afterVisitSummaryVisible")}
            />
            <ToggleField
              label="Intake Field Minimization"
              hint="Default: ON. Collect only minimum necessary fields per appointment type."
              id="intakeFieldMinimization"
              registration={register("intakeFieldMinimization")}
            />
          </CardContent>
        </Card>

        {/* Policy Text */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cancellation & Reschedule Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              label="Reschedule Policy Text"
              hint="Shown to patients when rescheduling"
              error={errors.reschedulePolicyText?.message}
            >
              <textarea
                {...register("reschedulePolicyText")}
                rows={2}
                className="field-input"
              />
            </FormField>
            <FormField
              label="Cancellation Policy Text"
              hint="Shown to patients when cancelling"
              error={errors.cancelPolicyText?.message}
            >
              <textarea
                {...register("cancelPolicyText")}
                rows={2}
                className="field-input"
              />
            </FormField>
          </CardContent>
        </Card>

        {/* PA Attestation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              PA Location Attestation
              <Badge variant="outline" className="text-xs">Required for all bookings</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              label="Patient Attestation Text"
              hint="Text patients must confirm before completing a booking"
              error={errors.patientAttestationText?.message}
            >
              <textarea
                {...register("patientAttestationText")}
                rows={2}
                className="field-input"
              />
            </FormField>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Risk Controls"}
        </Button>
      </form>
    </div>
  );
}

function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1">{label}</label>
      {hint && <p className="text-xs text-muted-foreground mb-1.5">{hint}</p>}
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

function ToggleField({
  label,
  hint,
  id,
  registration,
}: {
  label: string;
  hint?: string;
  id: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
        <input
          type="checkbox"
          id={id}
          {...registration}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
      </label>
    </div>
  );
}

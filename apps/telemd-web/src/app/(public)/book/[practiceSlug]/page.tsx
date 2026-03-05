"use client";

import { useEffect, useState, use } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatPrice } from "@/lib/utils";
import {
  AlertTriangle,
  Calendar,
  User,
  CheckCircle,
  ChevronRight,
  Clock,
} from "lucide-react";

interface Practice {
  id: string;
  name: string;
  slug: string;
  serviceState: string;
  patientAttestationText: string;
  notTriageBannerText: string;
}

interface AppointmentType {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  priceInCents: number;
}

interface ClinicianSlot {
  clinicianId: string;
  clinicianName: string;
  specialty?: string;
  slots: string[]; // ISO datetime strings
}

const BookingSchema = z.object({
  appointmentTypeId: z.string().min(1, "Select appointment type"),
  clinicianId: z.string().min(1, "Select clinician"),
  slotStart: z.string().min(1, "Select time slot"),
  patientNotes: z.string().max(500).optional(),
  paAttestation: z.literal(true, {
    errorMap: () => ({ message: "You must confirm your Pennsylvania location." }),
  }),
});

type BookingForm = z.infer<typeof BookingSchema>;

type Step = "type" | "clinician" | "slot" | "confirm";

export default function BookingPage({
  params,
}: {
  params: Promise<{ practiceSlug: string }>;
}) {
  const { practiceSlug } = use(params);
  const [practice, setPractice] = useState<Practice | null>(null);
  const [apptTypes, setApptTypes] = useState<AppointmentType[]>([]);
  const [clinicianSlots, setClinicianSlots] = useState<ClinicianSlot[]>([]);
  const [step, setStep] = useState<Step>("type");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BookingForm>({
    resolver: zodResolver(BookingSchema),
  });

  const selectedTypeId = watch("appointmentTypeId");
  const selectedClinicianId = watch("clinicianId");
  const selectedSlot = watch("slotStart");

  useEffect(() => {
    fetch(`/api/practices/${practiceSlug}`)
      .then((r) => r.json())
      .then((data) => {
        setPractice(data.practice);
        setApptTypes(data.practice?.appointmentTypes ?? []);
        setLoading(false);
      });
  }, [practiceSlug]);

  useEffect(() => {
    if (selectedTypeId && step === "clinician") {
      fetch(
        `/api/availability?practiceSlug=${practiceSlug}&appointmentTypeId=${selectedTypeId}`
      )
        .then((r) => r.json())
        .then((data) => setClinicianSlots(data.clinicianSlots ?? []));
    }
  }, [selectedTypeId, step, practiceSlug]);

  const onSubmit = async (data: BookingForm) => {
    setSubmitting(true);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, practiceSlug }),
    });

    const result = await res.json();
    setSubmitting(false);

    if (res.status === 401) {
      // Not signed in — redirect to sign-in with return URL
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    if (res.ok) {
      // Redirect to payment
      const checkoutRes = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: result.appointmentId }),
      });
      const checkout = await checkoutRes.json();
      if (checkout.checkoutUrl) {
        window.location.href = checkout.checkoutUrl;
      }
    }
  };

  if (loading) {
    return (
      <div className="container py-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
      </div>
    );
  }

  if (!practice) {
    return (
      <div className="container py-12 text-center">
        <p className="text-muted-foreground">Practice not found.</p>
      </div>
    );
  }

  // PA-only gating
  if (practice.serviceState !== "PA") {
    return (
      <div className="container py-12 max-w-md text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Service Not Available</h2>
        <p className="text-muted-foreground">
          This practice currently serves Pennsylvania patients only.
        </p>
      </div>
    );
  }

  const selectedType = apptTypes.find((t) => t.id === selectedTypeId);
  const selectedClinician = clinicianSlots.find(
    (c) => c.clinicianId === selectedClinicianId
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container py-4">
          <h1 className="text-xl font-bold">{practice.name}</h1>
          <p className="text-sm text-muted-foreground">Book a Telehealth Appointment</p>
        </div>
      </div>

      {/* Emergency banner */}
      <div className="bg-red-50 border-b border-red-200">
        <div className="container py-2 flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span className="text-red-800">{practice.notTriageBannerText}</span>
        </div>
      </div>

      <div className="container py-8 max-w-2xl">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {(["type", "clinician", "slot", "confirm"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s
                    ? "bg-primary text-white"
                    : ["type", "clinician", "slot", "confirm"].indexOf(step) > i
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {["type", "clinician", "slot", "confirm"].indexOf(step) > i ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
          <span className="text-sm text-muted-foreground ml-2">
            {step === "type" && "Choose visit type"}
            {step === "clinician" && "Choose clinician & time"}
            {step === "slot" && "Select time"}
            {step === "confirm" && "Confirm & pay"}
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 1: Appointment Type */}
          {step === "type" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Select Visit Type</h2>
              {apptTypes.map((type) => (
                <Card
                  key={type.id}
                  className={`cursor-pointer border-2 transition-colors ${
                    selectedTypeId === type.id
                      ? "border-primary"
                      : "hover:border-primary/40"
                  }`}
                  onClick={() => setValue("appointmentTypeId", type.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{type.name}</h3>
                      {type.description && (
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {type.durationMinutes} min
                        </span>
                        <span className="font-semibold text-primary">
                          {formatPrice(type.priceInCents)}
                        </span>
                      </div>
                    </div>
                    {selectedTypeId === type.id && (
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </CardContent>
                </Card>
              ))}
              {errors.appointmentTypeId && (
                <p className="text-sm text-destructive">{errors.appointmentTypeId.message}</p>
              )}
              <Button
                type="button"
                disabled={!selectedTypeId}
                onClick={() => setStep("clinician")}
                className="w-full"
              >
                Continue
              </Button>
            </div>
          )}

          {/* Step 2: Clinician + Slots */}
          {step === "clinician" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Choose Clinician</h2>
              {clinicianSlots.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>No available clinicians for this visit type.</p>
                  </CardContent>
                </Card>
              ) : (
                clinicianSlots.map((c) => (
                  <Card
                    key={c.clinicianId}
                    className={`border-2 transition-colors ${
                      selectedClinicianId === c.clinicianId
                        ? "border-primary"
                        : "hover:border-primary/40"
                    }`}
                  >
                    <CardHeader
                      className="pb-2 cursor-pointer"
                      onClick={() => {
                        setValue("clinicianId", c.clinicianId);
                        setValue("slotStart", "");
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{c.clinicianName}</h3>
                          {c.specialty && (
                            <p className="text-sm text-muted-foreground">{c.specialty}</p>
                          )}
                        </div>
                        {selectedClinicianId === c.clinicianId && (
                          <CheckCircle className="h-5 w-5 text-primary ml-auto" />
                        )}
                      </div>
                    </CardHeader>
                    {selectedClinicianId === c.clinicianId && (
                      <CardContent className="pt-0">
                        <p className="text-sm font-medium mb-2">Available Times</p>
                        <div className="grid grid-cols-3 gap-2">
                          {c.slots.slice(0, 12).map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setValue("slotStart", slot)}
                              className={`text-sm py-2 px-3 rounded-md border text-center transition-colors ${
                                selectedSlot === slot
                                  ? "bg-primary text-white border-primary"
                                  : "hover:border-primary/40 bg-background"
                              }`}
                            >
                              {new Date(slot).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))
              )}
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep("type")}>
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={!selectedClinicianId || !selectedSlot}
                  onClick={() => setStep("confirm")}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm + PA Attestation */}
          {step === "confirm" && selectedType && selectedClinician && selectedSlot && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Confirm Appointment</h2>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Visit Type</span>
                    <span className="font-medium">{selectedType.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Clinician</span>
                    <span className="font-medium">{selectedClinician.clinicianName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date & Time</span>
                    <span className="font-medium">{formatDateTime(selectedSlot)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">{selectedType.durationMinutes} min</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-medium">Total Due</span>
                    <span className="font-bold text-primary">
                      {formatPrice(selectedType.priceInCents)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium block mb-1">
                  Notes for your clinician (optional)
                </label>
                <textarea
                  {...register("patientNotes")}
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Any context you'd like to share..."
                />
              </div>

              {/* PA Attestation */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="paAttestation"
                    {...register("paAttestation")}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="paAttestation" className="text-sm">
                    <strong>Required: </strong>
                    {practice.patientAttestationText}
                  </label>
                </div>
                {errors.paAttestation && (
                  <p className="text-xs text-destructive mt-2">
                    {errors.paAttestation.message}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("clinician")}
                >
                  Back
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? "Processing..." : `Pay & Confirm — ${formatPrice(selectedType.priceInCents)}`}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

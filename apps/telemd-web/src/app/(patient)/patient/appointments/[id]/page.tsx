"use client";

import { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatPrice } from "@/lib/utils";
import {
  AlertTriangle,
  Video,
  Phone,
  CreditCard,
  ArrowLeft,
  CheckCircle,
  Clock,
  CalendarClock,
} from "lucide-react";
import { IntakeCallPanel } from "@/components/intake/IntakeCallPanel";
import { VideoVisitPanel } from "@/components/visit/VideoVisitPanel";
import { isWithinJoinWindow } from "@telemd/shared";

const LIVE_STATUS_CONFIG: Record<string, { label: string; className: string; pulse: boolean }> = {
  CONFIRMED: {
    label: "Waiting for clinician",
    className: "border-blue-200 bg-blue-50 text-blue-700",
    pulse: false,
  },
  INTAKE_PENDING: {
    label: "Intake in progress",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    pulse: true,
  },
  IN_PROGRESS: {
    label: "Visit in progress",
    className: "border-violet-200 bg-violet-50 text-violet-700",
    pulse: true,
  },
  COMPLETED: {
    label: "Visit complete",
    className: "border-green-200 bg-green-50 text-green-700",
    pulse: false,
  },
};

interface SOAPSummary {
  id: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  disclaimer: string;
  generatedAt: string;
}

interface AppointmentDetail {
  id: string;
  status: string;
  slotStart: string;
  slotEnd: string;
  amountPaidCents: number;
  intakeStatus: string;
  paAttestationAt: string;
  patientNotes?: string;
  soapSummary?: SOAPSummary | null;
  appointmentType: {
    name: string;
    durationMinutes: number;
    priceInCents: number;
    description?: string;
  };
  clinician: {
    member: { firstName: string; lastName: string };
    specialty?: string;
  };
  practice: {
    name: string;
    slug: string;
    timezone: string;
    notTriageBannerText: string;
    messagingDisclaimerText: string;
    afterVisitSummaryVisible: boolean;
  };
}

export default function PatientAppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const actionParam = searchParams.get("action");

  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<"intake" | "visit" | null>(
    actionParam === "intake" ? "intake" : null
  );
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<{ slotStart: string; slotEnd: string }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ slotStart: string; slotEnd: string } | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/appointments/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setAppointment(data.appointment);
        setLiveStatus(data.appointment?.status ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  // SSE for live status updates
  useEffect(() => {
    const es = new EventSource(`/api/appointments/${id}/events`);
    es.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as { status?: string };
        if (data.status) {
          setLiveStatus(data.status);
          if (data.status === "COMPLETED" || data.status === "CANCELLED") {
            es.close();
          }
        }
      } catch {
        // ignore parse errors
      }
    };
    es.onerror = () => {
      es.close();
    };
    return () => {
      es.close();
    };
  }, [id]);

  const openReschedule = () => {
    setShowReschedule(true);
    setSelectedSlot(null);
    setRescheduleError(null);
    if (!appointment) return;
    const slug = appointment.practice.slug;
    // Find appointmentTypeId from the appointment — we need to re-fetch availability
    fetch(`/api/appointments/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const appt = data.appointment;
        if (!appt?.appointmentType?.id) return;
        return fetch(
          `/api/availability?practiceSlug=${slug}&appointmentTypeId=${appt.appointmentType.id}`
        );
      })
      .then((r) => (r ? r.json() : null))
      .then((data) => {
        if (data?.slots) setAvailableSlots(data.slots);
      })
      .catch(() => {});
  };

  const submitReschedule = async () => {
    if (!selectedSlot) return;
    setRescheduling(true);
    setRescheduleError(null);
    const res = await fetch(`/api/appointments/${id}/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedSlot),
    });
    const data = await res.json();
    if (!res.ok) {
      setRescheduleError(data.error ?? "Failed to reschedule.");
      setRescheduling(false);
      return;
    }
    setRescheduleSuccess(true);
    setShowReschedule(false);
    // Refresh appointment data
    fetch(`/api/appointments/${id}`)
      .then((r) => r.json())
      .then((d) => setAppointment(d.appointment));
    setRescheduling(false);
  };

  const handlePayNow = async () => {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: id }),
    });
    const data = await res.json();
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    }
  };

  const submitFeedback = async () => {
    if (!rating) return;
    setSubmittingFeedback(true);
    await fetch(`/api/appointments/${id}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    });
    setSubmittingFeedback(false);
    setFeedbackSubmitted(true);
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="container py-8">
        <p className="text-muted-foreground">Appointment not found.</p>
        <Link href="/patient/appointments">
          <Button variant="outline" className="mt-4">Back to Appointments</Button>
        </Link>
      </div>
    );
  }

  const canJoin = isWithinJoinWindow(new Date(appointment.slotStart));
  const intakeComplete = appointment.intakeStatus === "COMPLETED";

  return (
    <div className="container py-8 max-w-3xl space-y-6">
      {/* Not-triage banner */}
      <div className="banner-warning flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>{appointment.practice.notTriageBannerText}</span>
      </div>

      {/* Back */}
      <Link
        href="/patient/appointments"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Appointments
      </Link>

      {/* Live status banner */}
      {liveStatus && LIVE_STATUS_CONFIG[liveStatus] && (
        <div
          className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border text-sm font-medium ${LIVE_STATUS_CONFIG[liveStatus].className}`}
        >
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              LIVE_STATUS_CONFIG[liveStatus].pulse
                ? "animate-pulse bg-current"
                : "bg-current"
            }`}
          />
          {LIVE_STATUS_CONFIG[liveStatus].label}
          <span className="ml-auto text-xs font-normal opacity-60">Live</span>
        </div>
      )}

      {/* Main card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{appointment.appointmentType.name}</CardTitle>
            <Badge>{appointment.status.replace(/_/g, " ")}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Dr. {appointment.clinician.member.firstName}{" "}
            {appointment.clinician.member.lastName}
            {appointment.clinician.specialty ? ` · ${appointment.clinician.specialty}` : ""}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground block">Date & Time</span>
              <span className="font-medium">
                {formatDateTime(appointment.slotStart, appointment.practice.timezone)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Duration</span>
              <span className="font-medium">
                {appointment.appointmentType.durationMinutes} minutes
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Practice</span>
              <span className="font-medium">{appointment.practice.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Amount Paid</span>
              <span className="font-medium">
                {appointment.status === "PENDING_PAYMENT"
                  ? `${formatPrice(appointment.appointmentType.priceInCents)} due`
                  : formatPrice(appointment.amountPaidCents)}
              </span>
            </div>
          </div>

          {/* PA Attestation confirmation */}
          {appointment.paAttestationAt && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-md">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>
                Pennsylvania location confirmed on{" "}
                {new Date(appointment.paAttestationAt).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* Intake status */}
          <div className="flex items-center gap-2 text-sm">
            {intakeComplete ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-md w-full">
                <CheckCircle className="h-4 w-4" />
                <span>Intake completed. Your clinician has received your information.</span>
              </div>
            ) : (
              appointment.status === "CONFIRMED" && (
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-md w-full">
                  <Clock className="h-4 w-4" />
                  <span>Intake call required before your visit.</span>
                </div>
              )
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            {appointment.status === "PENDING_PAYMENT" && (
              <Button onClick={handlePayNow} className="bg-green-600 hover:bg-green-700">
                <CreditCard className="h-4 w-4 mr-2" />
                Pay {formatPrice(appointment.appointmentType.priceInCents)}
              </Button>
            )}

            {appointment.status === "CONFIRMED" && !intakeComplete && (
              <Button
                onClick={() => setActivePanel("intake")}
                variant="outline"
              >
                <Phone className="h-4 w-4 mr-2" />
                Start Intake Call
              </Button>
            )}

            {canJoin && (
              <Button onClick={() => setActivePanel("visit")}>
                <Video className="h-4 w-4 mr-2" />
                Join Video Visit
              </Button>
            )}

            {(appointment.status === "CONFIRMED" || appointment.status === "INTAKE_PENDING") && (
              <Button variant="outline" onClick={openReschedule}>
                <CalendarClock className="h-4 w-4 mr-2" />
                Reschedule
              </Button>
            )}
          </div>

          {/* Reschedule success banner */}
          {rescheduleSuccess && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 p-3 rounded-md text-sm">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              Your appointment has been rescheduled.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Intake Panel */}
      {activePanel === "intake" && (
        <IntakeCallPanel
          appointmentId={id}
          onComplete={() => {
            setActivePanel(null);
            // Refresh appointment
            fetch(`/api/appointments/${id}`)
              .then((r) => r.json())
              .then((data) => setAppointment(data.appointment));
          }}
          onClose={() => setActivePanel(null)}
        />
      )}

      {/* Video Visit Panel */}
      {activePanel === "visit" && (
        <VideoVisitPanel
          appointmentId={id}
          role="participant"
          onEnd={() => setActivePanel(null)}
        />
      )}

      {/* Reschedule panel */}
      {showReschedule && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              Pick a New Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Loading available slots…
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.slotStart}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`text-xs px-3 py-2 rounded-md border text-left transition-colors ${
                      selectedSlot?.slotStart === slot.slotStart
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {new Date(slot.slotStart).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </button>
                ))}
              </div>
            )}

            {rescheduleError && (
              <p className="text-sm text-destructive">{rescheduleError}</p>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReschedule(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!selectedSlot || rescheduling}
                onClick={submitReschedule}
              >
                {rescheduling ? "Rescheduling…" : "Confirm Reschedule"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* After-visit summary (only shown when practice enables it) */}
      {appointment.soapSummary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Visit Summary
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {appointment.soapSummary.disclaimer}
            </p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {appointment.soapSummary.subjective && (
              <div>
                <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  What you reported
                </p>
                <p className="text-foreground whitespace-pre-wrap">{appointment.soapSummary.subjective}</p>
              </div>
            )}
            {appointment.soapSummary.assessment && (
              <div>
                <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  Clinical assessment
                </p>
                <p className="text-foreground whitespace-pre-wrap">{appointment.soapSummary.assessment}</p>
              </div>
            )}
            {appointment.soapSummary.plan && (
              <div>
                <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  Plan
                </p>
                <p className="text-foreground whitespace-pre-wrap">{appointment.soapSummary.plan}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Post-visit feedback */}
      {appointment.status === "COMPLETED" && !feedbackSubmitted && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">How was your visit?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-3xl leading-none transition-colors ${
                    rating >= star ? "text-amber-400" : "text-muted-foreground hover:text-amber-300"
                  }`}
                  aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Any additional comments? (optional)"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{comment.length}/500</span>
              <Button
                onClick={submitFeedback}
                disabled={!rating || submittingFeedback}
                size="sm"
              >
                {submittingFeedback ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {appointment.status === "COMPLETED" && feedbackSubmitted && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 p-4 rounded-lg">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">Thank you for your feedback!</span>
        </div>
      )}

      {/* Messaging disclaimer */}
      <div className="banner-info text-xs">
        {appointment.practice.messagingDisclaimerText}
      </div>
    </div>
  );
}

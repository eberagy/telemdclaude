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
} from "lucide-react";
import { IntakeCallPanel } from "@/components/intake/IntakeCallPanel";
import { VideoVisitPanel } from "@/components/visit/VideoVisitPanel";
import { isWithinJoinWindow } from "@telemd/shared";

interface AppointmentDetail {
  id: string;
  status: string;
  slotStart: string;
  slotEnd: string;
  amountPaidCents: number;
  intakeStatus: string;
  paAttestationAt: string;
  patientNotes?: string;
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

  useEffect(() => {
    fetch(`/api/appointments/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setAppointment(data.appointment);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

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
          </div>
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

      {/* Messaging disclaimer */}
      <div className="banner-info text-xs">
        {appointment.practice.messagingDisclaimerText}
      </div>
    </div>
  );
}

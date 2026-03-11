"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatPrice } from "@/lib/utils";
import { Calendar, Clock, CreditCard, Phone, AlertTriangle, Timer } from "lucide-react";

interface Appointment {
  id: string;
  status: string;
  slotStart: string;
  slotEnd: string;
  amountPaidCents: number;
  intakeStatus: string;
  appointmentType: { name: string; durationMinutes: number; priceInCents: number };
  clinician: { member: { firstName: string; lastName: string } };
  practice: { name: string; slug: string };
}

const STATUS_COLORS: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  PENDING_PAYMENT: "warning",
  CONFIRMED: "success",
  INTAKE_PENDING: "warning",
  INTAKE_COMPLETED: "success",
  IN_PROGRESS: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  RESCHEDULED: "outline",
  NO_SHOW: "destructive",
  PAYMENT_FAILED: "destructive",
};

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return "Starting now";
  const h = Math.floor(msRemaining / 3_600_000);
  const m = Math.floor((msRemaining % 3_600_000) / 60_000);
  const s = Math.floor((msRemaining % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function CountdownBanner({ appointment: a }: { appointment: Appointment }) {
  const [msRemaining, setMsRemaining] = useState(
    new Date(a.slotStart).getTime() - Date.now()
  );

  useEffect(() => {
    const id = setInterval(() => {
      setMsRemaining(new Date(a.slotStart).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [a.slotStart]);

  const intakeComplete = a.intakeStatus === "COMPLETED";

  return (
    <Card className="border-2 border-primary bg-primary/5 shadow-md">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Timer className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Upcoming visit
              </span>
            </div>
            <h2 className="text-lg font-bold">
              {a.appointmentType.name} with Dr.{" "}
              {a.clinician.member.firstName} {a.clinician.member.lastName}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDateTime(a.slotStart)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {a.appointmentType.durationMinutes} min
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-mono font-bold text-primary tabular-nums">
                {formatCountdown(msRemaining)}
              </span>
              <Badge variant={intakeComplete ? "success" : "warning"}>
                Intake {intakeComplete ? "complete" : "pending"}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            {!intakeComplete && (
              <Link href={`/patient/appointments/${a.id}?action=intake`}>
                <Button size="sm" variant="outline" className="w-full sm:w-auto">
                  <Phone className="h-4 w-4 mr-1" />
                  Complete Intake
                </Button>
              </Link>
            )}
            <Link href={`/patient/appointments/${a.id}`}>
              <Button size="sm" className="w-full sm:w-auto">View Details</Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/appointments?role=patient")
      .then((r) => r.json())
      .then((data) => {
        setAppointments(data.appointments ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const now = Date.now();
  const in24h = now + 24 * 60 * 60 * 1000;

  // Soonest CONFIRMED appointment within 24 hours
  const imminent = appointments
    .filter((a) => {
      const t = new Date(a.slotStart).getTime();
      return a.status === "CONFIRMED" && t > now && t <= in24h;
    })
    .sort((a, b) => new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime())[0];

  const upcoming = appointments.filter(
    (a) =>
      new Date(a.slotStart).getTime() > now &&
      !["CANCELLED", "RESCHEDULED"].includes(a.status)
  );
  const past = appointments.filter(
    (a) =>
      new Date(a.slotStart).getTime() <= now ||
      ["CANCELLED", "RESCHEDULED", "COMPLETED"].includes(a.status)
  );

  return (
    <div className="container py-8 space-y-8">
      {/* Emergency banner */}
      <div className="banner-warning flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>
          Do not use this platform for emergencies. If you have a medical emergency, call{" "}
          <strong>911</strong> immediately.
        </span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Appointments</h1>
        <Link href="/book">
          <Button>Book New Appointment</Button>
        </Link>
      </div>

      {/* Countdown banner for imminent appointment */}
      {imminent && <CountdownBanner appointment={imminent} />}

      {/* Upcoming */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Upcoming ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No upcoming appointments.</p>
              <Link href="/book" className="mt-4 inline-block">
                <Button variant="outline" size="sm">Book an Appointment</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {upcoming.map((appt) => (
              <AppointmentCard key={appt.id} appointment={appt} />
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Past Appointments</h2>
          <div className="space-y-4">
            {past.map((appt) => (
              <AppointmentCard key={appt.id} appointment={appt} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AppointmentCard({ appointment: a }: { appointment: Appointment }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{a.appointmentType.name}</h3>
              <Badge variant={STATUS_COLORS[a.status] ?? "secondary"}>
                {a.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Dr. {a.clinician.member.firstName} {a.clinician.member.lastName} —{" "}
              {a.practice.name}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDateTime(a.slotStart)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {a.appointmentType.durationMinutes} min
              </span>
              <span className="flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5" />
                {a.status === "PENDING_PAYMENT"
                  ? `${formatPrice(a.appointmentType.priceInCents)} due`
                  : formatPrice(a.amountPaidCents)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {a.status === "PENDING_PAYMENT" && (
              <Link href={`/patient/appointments/${a.id}?action=pay`}>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <CreditCard className="h-4 w-4 mr-1" />
                  Pay Now
                </Button>
              </Link>
            )}
            {a.status === "CONFIRMED" && a.intakeStatus !== "COMPLETED" && (
              <Link href={`/patient/appointments/${a.id}?action=intake`}>
                <Button size="sm" variant="outline">
                  <Phone className="h-4 w-4 mr-1" />
                  Start Intake
                </Button>
              </Link>
            )}
            <Link href={`/patient/appointments/${a.id}`}>
              <Button size="sm" variant="outline">View Details</Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

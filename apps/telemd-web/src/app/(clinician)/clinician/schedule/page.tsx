"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { Calendar, Video, Phone, CheckCircle, AlertTriangle, Clock } from "lucide-react";

interface Appointment {
  id: string;
  status: string;
  slotStart: string;
  intakeStatus: string;
  appointmentType: { name: string; durationMinutes: number };
  patient: { id: string; email: string };
}

export default function ClinicianSchedulePage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [practiceId, setPracticeId] = useState<string | null>(null);

  useEffect(() => {
    // Get practiceId from session/member
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.practiceId) {
          setPracticeId(data.practiceId);
          return fetch(`/api/appointments?role=clinician&practiceId=${data.practiceId}`);
        }
      })
      .then((r) => r?.json())
      .then((data) => {
        if (data) setAppointments(data.appointments ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayAppts = appointments.filter(
    (a) =>
      new Date(a.slotStart) >= today &&
      new Date(a.slotStart) < tomorrow &&
      !["CANCELLED", "RESCHEDULED"].includes(a.status)
  );

  const upcoming = appointments.filter(
    (a) =>
      new Date(a.slotStart) >= tomorrow &&
      !["CANCELLED", "RESCHEDULED"].includes(a.status)
  );

  if (loading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-2xl font-bold">My Schedule</h1>

      {/* Today */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Today ({todayAppts.length})
        </h2>
        {todayAppts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No appointments scheduled for today.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todayAppts.map((a) => (
              <ScheduleCard key={a.id} appointment={a} />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Upcoming ({upcoming.length})</h2>
          <div className="space-y-3">
            {upcoming.slice(0, 10).map((a) => (
              <ScheduleCard key={a.id} appointment={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ScheduleCard({ appointment: a }: { appointment: Appointment }) {
  const intakeDone = a.intakeStatus === "COMPLETED";
  const now = new Date();
  const slotStart = new Date(a.slotStart);
  const canStart = now >= new Date(slotStart.getTime() - 10 * 60 * 1000) &&
    now <= new Date(slotStart.getTime() + 2 * 60 * 60 * 1000);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{a.appointmentType.name}</span>
            <Badge variant="secondary" className="text-xs">
              {a.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDateTime(a.slotStart)} · {a.appointmentType.durationMinutes}min
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Patient: {a.patient.email}
          </div>
          <div className="flex items-center gap-1 text-xs">
            {intakeDone ? (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-3 w-3" />
                Intake complete
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                Intake pending
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {canStart && (
            <Link href={`/clinician/appointments/${a.id}?action=visit`}>
              <button className="flex items-center gap-1 bg-primary text-white text-xs px-3 py-1.5 rounded-md hover:bg-primary/90">
                <Video className="h-3.5 w-3.5" />
                Start Visit
              </button>
            </Link>
          )}
          <Link href={`/clinician/appointments/${a.id}`}>
            <button className="text-xs px-3 py-1.5 rounded-md border hover:bg-muted">
              View
            </button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

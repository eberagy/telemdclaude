"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, CheckCircle, AlertTriangle } from "lucide-react";

interface Appointment {
  id: string;
  status: string;
  slotStart: string;
  slotEnd: string;
  intakeStatus: string;
  appointmentType: { name: string; durationMinutes: number };
  // Staff sees no clinical data — only scheduling info
  patient: { id: string };
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-800",
  INTAKE_PENDING: "bg-amber-100 text-amber-800",
  INTAKE_COMPLETED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-800",
  PENDING_PAYMENT: "bg-orange-100 text-orange-800",
};

export default function StaffSchedulePage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((me) => {
        if (me.practiceId) {
          return fetch(`/api/appointments?role=staff&practiceId=${me.practiceId}`);
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

  const active = (a: Appointment) => !["CANCELLED", "RESCHEDULED", "NO_SHOW"].includes(a.status);
  const todayAppts = appointments.filter(
    (a) => new Date(a.slotStart) >= today && new Date(a.slotStart) < tomorrow && active(a)
  );
  const upcoming = appointments.filter((a) => new Date(a.slotStart) >= tomorrow && active(a));

  if (loading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-2xl font-bold">Schedule</h1>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
        You are viewing scheduling information only. Clinical notes and patient records are not accessible to staff.
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Today ({todayAppts.length})
        </h2>
        {todayAppts.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground text-sm">
              No appointments today.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todayAppts.map((a) => <ScheduleRow key={a.id} appt={a} />)}
          </div>
        )}
      </section>

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Upcoming ({upcoming.length})</h2>
          <div className="space-y-3">
            {upcoming.slice(0, 20).map((a) => <ScheduleRow key={a.id} appt={a} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function ScheduleRow({ appt: a }: { appt: Appointment }) {
  const intakeDone = a.intakeStatus === "COMPLETED";
  const start = new Date(a.slotStart);
  const timeStr = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const dateStr = start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{a.appointmentType.name}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[a.status] ?? "bg-muted"}`}
            >
              {a.status.replace(/_/g, " ")}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {dateStr} · {timeStr} · {a.appointmentType.durationMinutes}min
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs">
          {intakeDone ? (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-3.5 w-3.5" /> Intake done
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" /> Intake pending
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

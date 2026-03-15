"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MessageSquare, FileText, Clock } from "lucide-react";

interface Appointment {
  id: string;
  status: string;
  slotStart: string;
  appointmentType: { name: string; durationMinutes: number };
  patient: { id: string; email: string };
}

interface Message {
  id: string;
  content: string;
  senderRole: string;
  createdAt: string;
  readAt?: string;
}

const STATUS_CHIP: Record<string, string> = {
  CONFIRMED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  NO_SHOW: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-violet-100 text-violet-700",
  PENDING_PAYMENT: "bg-amber-100 text-amber-700",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function ClinicianDashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then(async (data) => {
        if (data.practiceId) {
          const [apptRes, msgRes] = await Promise.all([
            fetch(`/api/appointments?role=clinician&practiceId=${data.practiceId}`),
            fetch(`/api/messages?practiceId=${data.practiceId}`),
          ]);
          const apptData = await apptRes.json();
          const msgData = await msgRes.json();
          setAppointments(apptData.appointments ?? []);
          setMessages(msgData.messages ?? []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const todayAppts = appointments.filter(
    (a) =>
      new Date(a.slotStart) >= today &&
      new Date(a.slotStart) < tomorrow &&
      !["CANCELLED", "RESCHEDULED"].includes(a.status)
  );

  const upcomingThisWeek = appointments.filter(
    (a) =>
      new Date(a.slotStart) >= tomorrow &&
      new Date(a.slotStart) < weekEnd &&
      !["CANCELLED", "RESCHEDULED"].includes(a.status)
  );

  const unreadMessages = messages.filter(
    (m) => m.senderRole === "Patient" && !m.readAt
  );

  // Pending SOAPs: appointments that are CONFIRMED/IN_PROGRESS and from past (no note yet implied)
  const pendingSOAPs = appointments.filter(
    (a) =>
      new Date(a.slotStart) < new Date() &&
      ["CONFIRMED", "COMPLETED", "IN_PROGRESS"].includes(a.status)
  );

  if (loading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-muted rounded-lg" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Today</span>
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <p className="text-3xl font-bold">{todayAppts.length}</p>
            <p className="text-xs text-muted-foreground mt-1">appointments</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">This Week</span>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-3xl font-bold">{upcomingThisWeek.length}</p>
            <p className="text-xs text-muted-foreground mt-1">upcoming</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Messages</span>
              <MessageSquare className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-3xl font-bold">{unreadMessages.length}</p>
            <p className="text-xs text-muted-foreground mt-1">unread</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">SOAPs</span>
              <FileText className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-3xl font-bold">{pendingSOAPs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">pending review</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Today&apos;s Schedule
          </h2>
          <Link href="/clinician/schedule">
            <Button variant="outline" size="sm">
              View Full Schedule
            </Button>
          </Link>
        </div>

        {todayAppts.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No appointments scheduled for today.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todayAppts.map((a) => (
              <Card key={a.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center w-16 flex-shrink-0">
                      <p className="text-sm font-semibold">{formatTime(a.slotStart)}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{a.appointmentType.name}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            STATUS_CHIP[a.status] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {a.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Patient · {a.appointmentType.durationMinutes}min
                      </p>
                    </div>
                  </div>
                  <Link href={`/clinician/appointments/${a.id}`}>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Unread Messages */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            Unread Messages
            {unreadMessages.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadMessages.length}
              </Badge>
            )}
          </h2>
          <Link href="/clinician/messages">
            <Button variant="outline" size="sm">
              Open Inbox
            </Button>
          </Link>
        </div>

        {unreadMessages.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No unread messages.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {unreadMessages.slice(0, 5).map((m) => (
              <Card key={m.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">New message from Patient</p>
                      <p className="text-xs text-muted-foreground truncate max-w-sm">
                        {m.content}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground flex-shrink-0">
                    {new Date(m.createdAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </CardContent>
              </Card>
            ))}
            {unreadMessages.length > 5 && (
              <Link href="/clinician/messages">
                <p className="text-sm text-center text-primary hover:underline pt-1">
                  +{unreadMessages.length - 5} more messages
                </p>
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

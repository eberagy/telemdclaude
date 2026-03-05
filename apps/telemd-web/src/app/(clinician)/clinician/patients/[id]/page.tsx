"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, MessageSquare, User, Shield } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface Appointment {
  id: string;
  status: string;
  slotStart: string;
  appointmentType: { name: string; durationMinutes: number };
  intakeStatus: string;
}

interface PatientData {
  id: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  state: string;
  createdAt: string;
  appointments: Appointment[];
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-800",
  COMPLETED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
};

export default function ClinicianPatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // Load patient appointments to build the record
    fetch(`/api/appointments?role=clinician&patientId=${id}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.appointments?.length === 0) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        // Build minimal patient view from appointments
        const firstAppt = data.appointments[0];
        setPatient({
          id,
          email: firstAppt.patient?.email ?? "—",
          phone: firstAppt.patient?.phone,
          dateOfBirth: firstAppt.patient?.dateOfBirth,
          state: firstAppt.patient?.state ?? "PA",
          createdAt: firstAppt.patient?.createdAt ?? new Date().toISOString(),
          appointments: data.appointments,
        });
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="container py-8 max-w-2xl">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (notFound || !patient) {
    return (
      <div className="container py-8 max-w-2xl">
        <Link href="/clinician/schedule">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Schedule
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Patient not found or not assigned to you.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-2xl space-y-6">
      <Link href="/clinician/schedule">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </Link>

      {/* Patient header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5 text-primary" />
            Patient Record
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Email</p>
              <p className="font-medium">{patient.email}</p>
            </div>
            {patient.dateOfBirth && (
              <div>
                <p className="text-muted-foreground text-xs">Date of Birth</p>
                <p className="font-medium">{patient.dateOfBirth}</p>
              </div>
            )}
            {patient.phone && (
              <div>
                <p className="text-muted-foreground text-xs">Phone</p>
                <p className="font-medium">{patient.phone}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground text-xs">State</p>
              <Badge variant="secondary">{patient.state}</Badge>
            </div>
          </div>
          <div className="border-t pt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            PHI access logged per HIPAA audit requirements
          </div>
        </CardContent>
      </Card>

      {/* Appointment history */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Visit History ({patient.appointments.length})
        </h2>
        <div className="space-y-2">
          {patient.appointments.map((a) => (
            <Link key={a.id} href={`/clinician/appointments/${a.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{a.appointmentType.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[a.status] ?? "bg-muted"}`}
                      >
                        {a.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(a.slotStart)} · {a.appointmentType.durationMinutes}min
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">View →</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Messaging */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Patient Messages</p>
              <p className="text-xs text-muted-foreground">Secure messaging thread</p>
            </div>
          </div>
          <Link href={`/clinician/messages?patientId=${id}`}>
            <Button variant="outline" size="sm">Open</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

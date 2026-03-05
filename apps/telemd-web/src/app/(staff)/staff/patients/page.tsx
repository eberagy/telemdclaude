"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Search, User, AlertTriangle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

// Staff sees scheduling/contact info only — NO clinical data, NO PHI notes/SOAP

interface SchedulingRecord {
  patientId: string;
  email: string;
  phone?: string;
  upcomingAppointments: {
    id: string;
    status: string;
    slotStart: string;
    appointmentTypeName: string;
  }[];
}

export default function StaffPatientsPage() {
  const [records, setRecords] = useState<SchedulingRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/appointments?role=staff&limit=200")
      .then((r) => r.ok ? r.json() : { appointments: [] })
      .then((data) => {
        // Group by patient, no clinical data exposed
        const map = new Map<string, SchedulingRecord>();
        for (const appt of data.appointments ?? []) {
          const pid = appt.patient?.id ?? appt.patientId;
          if (!pid) continue;
          if (!map.has(pid)) {
            map.set(pid, {
              patientId: pid,
              email: appt.patient?.email ?? "—",
              phone: appt.patient?.phone,
              upcomingAppointments: [],
            });
          }
          map.get(pid)!.upcomingAppointments.push({
            id: appt.id,
            status: appt.status,
            slotStart: appt.slotStart,
            appointmentTypeName: appt.appointmentType?.name ?? "Visit",
          });
        }
        setRecords(Array.from(map.values()));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = records.filter(
    (r) =>
      !query ||
      r.email.toLowerCase().includes(query.toLowerCase()) ||
      r.phone?.includes(query)
  );

  return (
    <div className="container py-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Patient Scheduling Lookup</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Scheduling and contact information only. Clinical records are restricted to clinicians.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2 text-sm text-amber-800">
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>
          <strong>Staff access:</strong> You can view appointment scheduling status and contact info only.
          Clinical notes, diagnoses, transcripts, and AI summaries are not accessible to staff.
        </span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email or phone..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <User className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{query ? "No matching patients found." : "No patients scheduled yet."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.patientId}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm">{r.email}</p>
                    {r.phone && (
                      <p className="text-xs text-muted-foreground">{r.phone}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {r.upcomingAppointments.length} visit{r.upcomingAppointments.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {r.upcomingAppointments.slice(0, 3).map((a) => (
                    <div key={a.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDateTime(a.slotStart)}</span>
                      <span>·</span>
                      <span>{a.appointmentTypeName}</span>
                      <Badge
                        variant={a.status === "CONFIRMED" ? "default" : "secondary"}
                        className="text-xs py-0 px-1.5"
                      >
                        {a.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  ))}
                  {r.upcomingAppointments.length > 3 && (
                    <p className="text-xs text-muted-foreground pl-5">
                      +{r.upcomingAppointments.length - 3} more visits
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

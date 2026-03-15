"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, CheckCircle } from "lucide-react";

interface Note {
  id: string;
  status: string;
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
  appointment: {
    id: string;
    slotStart: string;
    appointmentType: { name: string };
    patient: { email: string };
  };
}

export default function ClinicianNotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((me) => {
        if (!me.practiceId) return Promise.reject("no practiceId");
        return fetch(`/api/notes?practiceId=${me.practiceId}`);
      })
      .then((r) => r.json())
      .then((data) => {
        setNotes(data.notes ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="container py-8 max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <FileText className="h-6 w-6 text-primary" />
        Clinical Notes ({notes.length})
      </h1>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No notes yet. Notes appear after you start a visit.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <Link key={note.id} href={`/clinician/appointments/${note.appointment.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">
                        {note.appointment.appointmentType.name}
                      </p>
                      <Badge
                        variant={note.status === "SIGNED" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {note.status === "SIGNED" ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Signed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Draft
                          </span>
                        )}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {note.appointment.patient.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Visit:{" "}
                      {new Date(note.appointment.slotStart).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {note.signedAt && (
                        <span className="ml-2 text-green-600">
                          · Signed {new Date(note.signedAt).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

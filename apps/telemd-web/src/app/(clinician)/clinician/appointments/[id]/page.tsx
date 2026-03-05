"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import {
  ArrowLeft,
  Video,
  FileText,
  Brain,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { VideoVisitPanel } from "@/components/visit/VideoVisitPanel";
import { isWithinJoinWindow } from "@telemd/shared";

interface SOAPSummary {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  missingInfo: string[];
  redFlags: string[];
  disclaimer: string;
}

interface AppointmentFull {
  id: string;
  status: string;
  slotStart: string;
  intakeStatus: string;
  transcriptRaw?: string;
  soapSummary?: SOAPSummary;
  clinicianNote?: { id: string; status: string; signedAt?: string };
  patient: { id: string; email: string };
  appointmentType: { name: string; durationMinutes: number };
  practice: {
    id: string;
    name: string;
    timezone: string;
  };
}

export default function ClinicianAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [appointment, setAppointment] = useState<AppointmentFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"summary" | "transcript" | "note" | "visit" | null>(null);

  const refresh = () => {
    fetch(`/api/appointments/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setAppointment(data.appointment);
        setLoading(false);
      });
  };

  useEffect(() => {
    refresh();
  }, [id]);

  if (loading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="container py-8">
        <p>Appointment not found or access denied.</p>
        <Link href="/clinician/schedule">
          <Button variant="outline" className="mt-4">Back to Schedule</Button>
        </Link>
      </div>
    );
  }

  const canStart = isWithinJoinWindow(new Date(appointment.slotStart));

  return (
    <div className="container py-8 max-w-5xl">
      <Link
        href="/clinician/schedule"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Schedule
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Appointment info + actions */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{appointment.appointmentType.name}</CardTitle>
                <Badge>{appointment.status.replace(/_/g, " ")}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(appointment.slotStart, appointment.practice.timezone)}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground block">Patient</span>
                <span className="font-medium">{appointment.patient.email}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground block">Intake Status</span>
                <div className="flex items-center gap-2">
                  {appointment.intakeStatus === "COMPLETED" ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-green-700">Complete</span>
                    </>
                  ) : (
                    <span className="text-amber-600">Pending</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                {canStart && (
                  <Button
                    onClick={() => setActiveView("visit")}
                    className="w-full gap-2"
                  >
                    <Video className="h-4 w-4" />
                    Start Visit
                  </Button>
                )}
                {appointment.soapSummary && (
                  <Button
                    variant="outline"
                    onClick={() => setActiveView("summary")}
                    className="w-full gap-2"
                  >
                    <Brain className="h-4 w-4" />
                    View SOAP Summary
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setActiveView("note")}
                  className="w-full gap-2"
                >
                  <FileText className="h-4 w-4" />
                  {appointment.clinicianNote ? "Edit Note" : "Write Note"}
                </Button>
                {appointment.transcriptRaw && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveView("transcript")}
                    className="w-full gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    View Transcript
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Evidence Panel */}
          <EvidencePanel practiceId={appointment.practice.id} />
        </div>

        {/* Right: Active panel */}
        <div className="lg:col-span-2 space-y-4">
          {activeView === "summary" && appointment.soapSummary && (
            <SOAPSummaryPanel summary={appointment.soapSummary} />
          )}

          {activeView === "note" && (
            <ClinicalNotePanel
              appointmentId={id}
              existingNote={appointment.clinicianNote}
              onSaved={refresh}
            />
          )}

          {activeView === "transcript" && appointment.transcriptRaw && (
            <TranscriptPanel transcript={appointment.transcriptRaw} />
          )}

          {activeView === "visit" && (
            <VideoVisitPanel
              appointmentId={id}
              role="host"
              onEnd={() => {
                setActiveView(null);
                refresh();
              }}
            />
          )}

          {!activeView && (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
              Select an action from the left panel
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SOAPSummaryPanel({ summary }: { summary: SOAPSummary }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI-Generated SOAP Summary
        </CardTitle>
        <div className="ai-disclaimer">{summary.disclaimer}</div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Red Flags — clinician-only */}
        {summary.redFlags.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-800 text-sm">
                Red Flags — Clinician Review Required
              </span>
              <Badge variant="destructive" className="text-xs">Clinician Only</Badge>
            </div>
            <ul className="list-disc list-inside space-y-1">
              {summary.redFlags.map((flag, i) => (
                <li key={i} className="text-sm text-red-700">{flag}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing Info */}
        {summary.missingInfo.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-amber-800 text-sm">Missing Information</span>
            </div>
            <ul className="list-disc list-inside space-y-1">
              {summary.missingInfo.map((item, i) => (
                <li key={i} className="text-sm text-amber-700">{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* SOAP sections */}
        {[
          { label: "Subjective", content: summary.subjective },
          { label: "Objective (Patient-Reported)", content: summary.objective },
          { label: "Assessment (Suggestions Only)", content: summary.assessment },
          { label: "Plan (Non-Prescriptive)", content: summary.plan },
        ].map((section) => (
          <div key={section.label}>
            <h4 className="font-medium text-sm mb-1">{section.label}</h4>
            <p className="text-sm text-foreground leading-relaxed bg-muted/30 p-3 rounded">
              {section.content}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TranscriptPanel({ transcript }: { transcript: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Intake Transcript
        </CardTitle>
        <div className="phi-badge">
          <AlertTriangle className="h-3 w-3" />
          PHI — Clinician Only
        </div>
      </CardHeader>
      <CardContent>
        <pre className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 p-4 rounded max-h-96 overflow-y-auto">
          {transcript}
        </pre>
      </CardContent>
    </Card>
  );
}

function ClinicalNotePanel({
  appointmentId,
  existingNote,
  onSaved,
}: {
  appointmentId: string;
  existingNote?: { id: string; status: string; signedAt?: string } | null;
  onSaved: () => void;
}) {
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (sign = false) => {
    setSaving(true);
    const res = await fetch(`/api/notes/${appointmentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjective, objective, assessment, plan, sign }),
    });
    setSaving(false);
    if (res.ok) onSaved();
  };

  const isSigned = existingNote?.status === "SIGNED";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Clinical Note
          {isSigned && (
            <Badge variant="success" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Signed
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSigned ? (
          <p className="text-sm text-muted-foreground">
            This note has been signed and cannot be edited.
          </p>
        ) : (
          <>
            {[
              { label: "Subjective", value: subjective, setter: setSubjective },
              { label: "Objective", value: objective, setter: setObjective },
              { label: "Assessment", value: assessment, setter: setAssessment },
              { label: "Plan", value: plan, setter: setPlan },
            ].map((field) => (
              <div key={field.label}>
                <label className="text-sm font-medium block mb-1">{field.label}</label>
                <textarea
                  value={field.value}
                  onChange={(e) => field.setter(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={`${field.label} section...`}
                />
              </div>
            ))}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => save(false)}
                disabled={saving}
              >
                Save Draft
              </Button>
              <Button
                onClick={() => save(true)}
                disabled={saving}
              >
                Sign & Finalize
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EvidencePanel({ practiceId }: { practiceId: string }) {
  const [links, setLinks] = useState<Array<{ id: string; title: string; url?: string; snippet?: string }>>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`/api/evidence?practiceId=${practiceId}`)
      .then((r) => r.json())
      .then((data) => setLinks(data.links ?? []));
  }, [practiceId]);

  const filtered = links.filter(
    (l) =>
      !search ||
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.snippet?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Evidence Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          type="text"
          placeholder="Search resources..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No resources found
            </p>
          ) : (
            filtered.map((link) => (
              <div key={link.id} className="p-2 rounded bg-muted/30 text-sm">
                <div className="flex items-center gap-1">
                  {link.url ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      {link.title}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="font-medium">{link.title}</span>
                  )}
                </div>
                {link.snippet && (
                  <p className="text-xs text-muted-foreground mt-0.5">{link.snippet}</p>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Activity, Heart, Scale, Droplets, Smile, Wind, TrendingUp } from "lucide-react";

type VitalType =
  | "BP_SYSTOLIC"
  | "BP_DIASTOLIC"
  | "WEIGHT_LB"
  | "BLOOD_GLUCOSE_MGDL"
  | "MOOD_SCORE"
  | "O2_SAT_PERCENT"
  | "HEART_RATE_BPM";

interface Vital {
  id: string;
  type: VitalType;
  value: number;
  unit: string;
  notes?: string;
  recordedAt: string;
}

const VITAL_CONFIG: Record<
  VitalType,
  { label: string; unit: string; icon: React.ElementType; color: string; min?: number; max?: number; step?: number }
> = {
  BP_SYSTOLIC:        { label: "Blood Pressure (Systolic)",  unit: "mmHg",  icon: Heart,    color: "#ef4444", min: 80,  max: 200 },
  BP_DIASTOLIC:       { label: "Blood Pressure (Diastolic)", unit: "mmHg",  icon: Heart,    color: "#f97316", min: 50,  max: 130 },
  WEIGHT_LB:          { label: "Weight",                     unit: "lbs",   icon: Scale,    color: "#8b5cf6", min: 50,  max: 500, step: 0.1 },
  BLOOD_GLUCOSE_MGDL: { label: "Blood Glucose",              unit: "mg/dL", icon: Droplets, color: "#3b82f6", min: 50,  max: 400 },
  MOOD_SCORE:         { label: "Mood Score",                 unit: "/10",   icon: Smile,    color: "#10b981", min: 1,   max: 10 },
  O2_SAT_PERCENT:     { label: "Oxygen Saturation",          unit: "%",     icon: Wind,     color: "#06b6d4", min: 85,  max: 100, step: 0.1 },
  HEART_RATE_BPM:     { label: "Heart Rate",                 unit: "bpm",   icon: Activity, color: "#ec4899", min: 30,  max: 220 },
};

const ALL_TYPES = Object.keys(VITAL_CONFIG) as VitalType[];

export default function PatientHealthPage() {
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [loading, setLoading] = useState(true);
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<VitalType>("BP_SYSTOLIC");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  // Employer code join
  const [employerCode, setEmployerCode] = useState("");
  const [joinMsg, setJoinMsg] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<{ name: string; discountPercent: number } | null>(null);

  const fetchVitals = (pid: string) => {
    fetch(`/api/vitals?practiceId=${pid}&limit=60`)
      .then((r) => r.json())
      .then((data) => { setVitals(data.vitals ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((me) => {
        if (me.practiceId) {
          setPracticeId(me.practiceId);
          fetchVitals(me.practiceId);
          if (me.employerGroup) setCurrentGroup(me.employerGroup);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const submitVital = async () => {
    if (!value || !practiceId) return;
    setSubmitting(true);
    setSubmitMsg(null);
    const res = await fetch("/api/vitals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: selectedType, value: parseFloat(value), notes, practiceId }),
    });
    if (res.ok) {
      setSubmitMsg("Logged!");
      setValue("");
      setNotes("");
      fetchVitals(practiceId);
    } else {
      const d = await res.json();
      setSubmitMsg(d.error ?? "Error saving.");
    }
    setSubmitting(false);
    setTimeout(() => setSubmitMsg(null), 3000);
  };

  const joinEmployer = async () => {
    if (!employerCode.trim()) return;
    setJoinLoading(true);
    setJoinMsg(null);
    const res = await fetch("/api/employer-groups/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: employerCode.trim().toUpperCase() }),
    });
    const data = await res.json();
    if (res.ok) {
      setCurrentGroup(data.group);
      setEmployerCode("");
      setJoinMsg(`Enrolled with ${data.group.name}! ${data.group.discountPercent}% of visits covered.`);
    } else {
      setJoinMsg(data.error ?? "Invalid code.");
    }
    setJoinLoading(false);
  };

  // Build chart data for selected vital type
  const chartData = vitals
    .filter((v) => v.type === selectedType)
    .slice()
    .reverse()
    .map((v) => ({
      date: new Date(v.recordedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: v.value,
    }));

  const cfg = VITAL_CONFIG[selectedType];
  const Icon = cfg.icon;

  const latestByType = ALL_TYPES.reduce<Partial<Record<VitalType, Vital>>>((acc, t) => {
    const latest = vitals.find((v) => v.type === t);
    if (latest) acc[t] = latest;
    return acc;
  }, {});

  return (
    <div className="container py-8 max-w-4xl space-y-8">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Activity className="h-6 w-6 text-primary" />
        My Health Dashboard
      </h1>

      {/* Employer coverage banner */}
      {currentGroup ? (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <Badge className="bg-green-600 text-white">Covered</Badge>
          <span className="text-sm font-medium text-green-800">
            {currentGroup.name} — {currentGroup.discountPercent}% of your visit cost covered
          </span>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Have an employer benefit code?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 max-w-sm">
              <Input
                placeholder="Enter code (e.g. ACME2024)"
                value={employerCode}
                onChange={(e) => setEmployerCode(e.target.value.toUpperCase())}
                className="uppercase"
                maxLength={20}
              />
              <Button onClick={joinEmployer} disabled={joinLoading || !employerCode} size="sm">
                {joinLoading ? "…" : "Apply"}
              </Button>
            </div>
            {joinMsg && (
              <p className={`text-xs mt-2 ${joinMsg.startsWith("Enrolled") ? "text-green-600" : "text-destructive"}`}>
                {joinMsg}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vitals summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-muted rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ALL_TYPES.map((t) => {
            const c = VITAL_CONFIG[t];
            const VIcon = c.icon;
            const latest = latestByType[t];
            return (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  selectedType === t
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <VIcon className="h-3.5 w-3.5" style={{ color: c.color }} />
                  <span className="text-xs text-muted-foreground truncate">{c.label.split(" ")[0]}</span>
                </div>
                {latest ? (
                  <p className="text-lg font-bold">
                    {latest.value}
                    <span className="text-xs font-normal text-muted-foreground ml-1">{c.unit}</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">No data</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Trend chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            {cfg.label} Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length < 2 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Log at least 2 readings to see a trend.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis
                  domain={[cfg.min ?? "auto", cfg.max ?? "auto"]}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  formatter={(v) => [`${Number(v)} ${cfg.unit}`, cfg.label]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={cfg.label}
                  stroke={cfg.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Log new vital */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="h-4 w-4" style={{ color: cfg.color }} />
            Log {cfg.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {ALL_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setSelectedType(t); setValue(""); }}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selectedType === t
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {VITAL_CONFIG[t].label.split(" ")[0]}
                  {t === "BP_SYSTOLIC" ? " (Sys)" : t === "BP_DIASTOLIC" ? " (Dia)" : ""}
                </button>
              ))}
            </div>

            <div className="flex gap-2 max-w-xs">
              <Input
                type="number"
                placeholder={`Value in ${cfg.unit}`}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                min={cfg.min}
                max={cfg.max}
                step={cfg.step ?? 1}
              />
              <span className="flex items-center text-sm text-muted-foreground whitespace-nowrap">{cfg.unit}</span>
            </div>

            <Input
              placeholder="Optional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={200}
              className="max-w-sm"
            />

            <div className="flex items-center gap-3">
              <Button onClick={submitVital} disabled={submitting || !value} size="sm">
                {submitting ? "Saving…" : "Log Reading"}
              </Button>
              {submitMsg && (
                <span className={`text-sm ${submitMsg === "Logged!" ? "text-green-600" : "text-destructive"}`}>
                  {submitMsg}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent readings */}
      {vitals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Readings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {vitals.slice(0, 20).map((v) => {
                const c = VITAL_CONFIG[v.type];
                const VIcon = c.icon;
                return (
                  <div key={v.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <VIcon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: c.color }} />
                      <span className="text-muted-foreground">{c.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{v.value} {v.unit}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {new Date(v.recordedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

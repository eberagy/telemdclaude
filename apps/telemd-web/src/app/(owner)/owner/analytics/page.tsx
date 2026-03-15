"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Calendar, TrendingDown, UserX, Trophy } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Appointment {
  id: string;
  status: string;
  slotStart: string;
  amountPaidCents: number;
  clinician?: {
    member: { firstName: string; lastName: string };
  };
}

interface WeeklyRevenue {
  week: string;
  revenueDollars: number;
}

interface Stats {
  totalMonth: number;
  totalWeek: number;
  cancellationRate: number;
  noShowRate: number;
  topClinician: string | null;
  weeklyRevenue: WeeklyRevenue[];
}

function getWeekLabel(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // start of week (Sun)
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function computeStats(appointments: Appointment[]): Stats {
  const now = new Date();

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisMonth = appointments.filter(
    (a) => new Date(a.slotStart) >= startOfMonth
  );
  const thisWeek = appointments.filter(
    (a) => new Date(a.slotStart) >= startOfWeek
  );

  const total = appointments.length;
  const cancelled = appointments.filter((a) => a.status === "CANCELLED").length;
  const noShow = appointments.filter((a) => a.status === "NO_SHOW").length;

  // Top clinician by total appointment count
  const clinicianCounts = new Map<string, number>();
  for (const a of appointments) {
    if (a.clinician?.member) {
      const name = `Dr. ${a.clinician.member.firstName} ${a.clinician.member.lastName}`;
      clinicianCounts.set(name, (clinicianCounts.get(name) ?? 0) + 1);
    }
  }
  const topEntry = [...clinicianCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  // Weekly revenue: last 8 weeks, paid appointments only
  const paidAppts = appointments.filter(
    (a) => a.status !== "CANCELLED" && a.status !== "NO_SHOW" && a.amountPaidCents > 0
  );
  const weekMap = new Map<string, number>();
  for (const a of paidAppts) {
    const label = getWeekLabel(new Date(a.slotStart));
    weekMap.set(label, (weekMap.get(label) ?? 0) + a.amountPaidCents);
  }
  // Build last 8 week labels in order
  const weeklyRevenue: WeeklyRevenue[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay() - i * 7);
    const label = getWeekLabel(d);
    weeklyRevenue.push({
      week: label,
      revenueDollars: parseFloat(((weekMap.get(label) ?? 0) / 100).toFixed(2)),
    });
  }

  return {
    totalMonth: thisMonth.length,
    totalWeek: thisWeek.length,
    cancellationRate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
    noShowRate: total > 0 ? Math.round((noShow / total) * 100) : 0,
    topClinician: topEntry ? `${topEntry[0]} (${topEntry[1]} visits)` : null,
    weeklyRevenue,
  };
}

export default function OwnerAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((me) => {
        if (!me.practiceId) return Promise.reject("no practiceId");
        return fetch(`/api/appointments?role=owner&practiceId=${me.practiceId}`);
      })
      .then((r) => r.json())
      .then((data) => {
        const appointments: Appointment[] = data.appointments ?? [];
        setStats(computeStats(appointments));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container py-8 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Appointments This Month",
      value: stats?.totalMonth ?? 0,
      icon: Calendar,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Appointments This Week",
      value: stats?.totalWeek ?? 0,
      icon: BarChart3,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      title: "Cancellation Rate",
      value: `${stats?.cancellationRate ?? 0}%`,
      icon: TrendingDown,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "No-Show Rate",
      value: `${stats?.noShowRate ?? 0}%`,
      icon: UserX,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  return (
    <div className="container py-8 max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-primary" />
        Analytics
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ title, value, icon: Icon, color, bg }) => (
          <Card key={title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <span className={`inline-flex p-1 rounded ${bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                </span>
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weekly revenue chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <span className="inline-flex p-1 rounded bg-violet-50">
              <BarChart3 className="h-3.5 w-3.5 text-violet-600" />
            </span>
            Weekly Revenue (Last 8 Weeks)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats && stats.weeklyRevenue.every((w) => w.revenueDollars === 0) ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No revenue data yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={stats?.weeklyRevenue ?? []}
                margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${v}`}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, "Revenue"]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                  }}
                />
                <Bar dataKey="revenueDollars" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top clinician */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <span className="inline-flex p-1 rounded bg-green-50">
              <Trophy className="h-3.5 w-3.5 text-green-600" />
            </span>
            Top Clinician (All Time)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.topClinician ? (
            <p className="text-lg font-semibold">{stats.topClinician}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No appointment data yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

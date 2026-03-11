"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Calendar, TrendingDown, UserX, Trophy } from "lucide-react";

interface Appointment {
  id: string;
  status: string;
  slotStart: string;
  clinician?: {
    member: { firstName: string; lastName: string };
  };
}

interface Stats {
  totalMonth: number;
  totalWeek: number;
  cancellationRate: number;
  noShowRate: number;
  topClinician: string | null;
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

  return {
    totalMonth: thisMonth.length,
    totalWeek: thisWeek.length,
    cancellationRate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
    noShowRate: total > 0 ? Math.round((noShow / total) * 100) : 0,
    topClinician: topEntry ? `${topEntry[0]} (${topEntry[1]} visits)` : null,
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

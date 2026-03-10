"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, LayoutDashboard } from "lucide-react";

interface Practice {
  name: string;
  slug: string;
}

interface Member {
  role: string;
  clinician?: { seatStatus: string } | null;
}

export default function OwnerDashboardPage() {
  const [practice, setPractice] = useState<Practice | null>(null);
  const [activeClinicians, setActiveClinicians] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/owner/practice").then((r) => r.json()),
      fetch("/api/owner/team").then((r) => r.json()),
    ])
      .then(([practiceData, teamData]) => {
        setPractice(practiceData.practice ?? null);
        const members: Member[] = teamData.members ?? [];
        const count = members.filter(
          (m) => m.role === "Clinician" && m.clinician?.seatStatus === "ACTIVE"
        ).length;
        setActiveClinicians(count);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container py-8 max-w-3xl">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <LayoutDashboard className="h-6 w-6 text-primary" />
        Owner Dashboard
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Welcome */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Welcome</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold leading-tight">
              {practice?.name ?? "Your Practice"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Owner Portal</p>
          </CardContent>
        </Card>

        {/* Practice name */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              Practice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{practice?.name ?? "—"}</p>
            {practice?.slug && (
              <p className="text-xs text-muted-foreground mt-1">/{practice.slug}</p>
            )}
          </CardContent>
        </Card>

        {/* Active clinicians */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Active Clinicians
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">
              {activeClinicians ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">with active seats</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Calendar, ChevronRight } from "lucide-react";

interface Patient {
  id: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  state: string;
  createdAt: string;
  _count: { appointments: number };
}

export default function ClinicianPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const q = debounced ? `?search=${encodeURIComponent(debounced)}` : "";
    fetch(`/api/patients${q}`)
      .then((r) => r.json())
      .then((data) => { setPatients(data.patients ?? []); setLoading(false); });
  }, [debounced]);

  return (
    <div className="container py-8 max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" />
        My Patients ({patients.length})
      </h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-muted rounded-lg" />)}
        </div>
      ) : patients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>{debounced ? "No patients match your search." : "No patients yet."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {patients.map((p) => (
            <Link key={p.id} href={`/clinician/patients/${p.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-medium text-sm truncate">{p.email}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {p._count.appointments} visit{p._count.appointments !== 1 ? "s" : ""}
                      </span>
                      <Badge variant="secondary" className="text-xs">{p.state}</Badge>
                      {p.dateOfBirth && <span>DOB: {p.dateOfBirth}</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

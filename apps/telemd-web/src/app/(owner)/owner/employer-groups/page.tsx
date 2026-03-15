"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Plus, Copy, Check, Percent } from "lucide-react";

interface EmployerGroup {
  id: string;
  name: string;
  code: string;
  description?: string;
  coveredVisitsCap?: number;
  discountPercent: number;
  isActive: boolean;
  _count: { patients: number };
  createdAt: string;
}

export default function EmployerGroupsPage() {
  const [groups, setGroups] = useState<EmployerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountPercent, setDiscountPercent] = useState("100");
  const [coveredVisitsCap, setCoveredVisitsCap] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchGroups = (pid: string) => {
    fetch(`/api/employer-groups?practiceId=${pid}`)
      .then((r) => r.json())
      .then((data) => { setGroups(data.groups ?? []); setLoading(false); });
  };

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((me) => {
        if (me.practiceId) {
          setPracticeId(me.practiceId);
          fetchGroups(me.practiceId);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const copyCode = (id: string, c: string) => {
    void navigator.clipboard.writeText(c);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const createGroup = async () => {
    if (!practiceId || !name || !code) return;
    setCreating(true);
    setCreateError(null);

    const res = await fetch("/api/employer-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        practiceId,
        name,
        code: code.toUpperCase(),
        description: description || undefined,
        discountPercent: parseInt(discountPercent),
        coveredVisitsCap: coveredVisitsCap ? parseInt(coveredVisitsCap) : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setCreateError(data.error ?? "Failed to create.");
    } else {
      setGroups((prev) => [{ ...data.group, _count: { patients: 0 } }, ...prev]);
      setName("");
      setCode("");
      setDescription("");
      setDiscountPercent("100");
      setCoveredVisitsCap("");
      setShowForm(false);
    }
    setCreating(false);
  };

  const totalEnrolled = groups.reduce((s, g) => s + g._count.patients, 0);

  return (
    <div className="container py-8 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          Employer Groups
        </h1>
        <Button onClick={() => setShowForm((s) => !s)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Group
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{groups.length}</p>
              <p className="text-xs text-muted-foreground">Employer Groups</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{totalEnrolled}</p>
              <p className="text-xs text-muted-foreground">Enrolled Employees</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Create Employer Group</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Company Name *</label>
                <Input placeholder="Acme Corp" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Enrollment Code * (uppercase, no spaces)
                </label>
                <Input
                  placeholder="ACME2024"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                  maxLength={20}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Coverage % (100 = fully covered)</label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Visit cap / employee / year (blank = unlimited)
                </label>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 12"
                  value={coveredVisitsCap}
                  onChange={(e) => setCoveredVisitsCap(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Description (optional)</label>
              <Input
                placeholder="Employee health benefit program"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
              />
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
            <div className="flex gap-2">
              <Button onClick={createGroup} disabled={creating || !name || !code} size="sm">
                {creating ? "Creating…" : "Create Group"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Groups list */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-24 bg-muted rounded-lg" />)}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="font-medium">No employer groups yet.</p>
            <p className="text-sm mt-1">
              Create a group and share the code with employers to unlock B2B2C covered visits.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <Card key={g.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{g.name}</p>
                      {!g.isActive && <Badge variant="secondary">Inactive</Badge>}
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        {g.discountPercent}% covered
                      </Badge>
                      {g.coveredVisitsCap && (
                        <Badge variant="outline" className="text-xs">
                          {g.coveredVisitsCap} visits/yr cap
                        </Badge>
                      )}
                    </div>
                    {g.description && (
                      <p className="text-sm text-muted-foreground">{g.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {g._count.patients} enrolled
                      </span>
                      <span className="text-muted-foreground text-xs">
                        Created {new Date(g.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1.5 bg-muted rounded-md px-3 py-1.5">
                      <span className="font-mono text-sm font-bold tracking-wider">{g.code}</span>
                      <button
                        onClick={() => copyCode(g.id, g.code)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy code"
                      >
                        {copiedId === g.id ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

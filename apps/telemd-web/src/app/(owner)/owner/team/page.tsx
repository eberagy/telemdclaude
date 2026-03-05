"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, CheckCircle, AlertTriangle, X } from "lucide-react";

interface Member {
  id: string;
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  clinician?: { seatStatus: string; specialty?: string } | null;
}

const ROLE_COLORS: Record<string, string> = {
  PracticeOwner: "bg-violet-100 text-violet-800",
  Clinician: "bg-blue-100 text-blue-800",
  Staff: "bg-gray-100 text-gray-700",
};

export default function OwnerTeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"Clinician" | "Staff">("Clinician");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSent, setInviteSent] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/owner/team")
      .then((r) => r.json())
      .then((data) => { setMembers(data.members ?? []); setLoading(false); });
  };

  useEffect(load, []);

  const sendInvite = async () => {
    setInviting(true);
    setInviteError("");
    const res = await fetch("/api/owner/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const data = await res.json();
    if (!res.ok) {
      setInviteError(data.error ?? "Failed to send invite");
    } else {
      setInviteSent(true);
      setInviteEmail("");
      setTimeout(() => { setInviteSent(false); setShowInvite(false); }, 2000);
    }
    setInviting(false);
  };

  return (
    <div className="container py-8 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Team ({members.length})
        </h1>
        <Button onClick={() => setShowInvite(!showInvite)}>
          <Plus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Invite panel */}
      {showInvite && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">Send Invite</p>
              <button onClick={() => setShowInvite(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="clinician@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "Clinician" | "Staff")}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                >
                  <option value="Clinician">Clinician</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>
            </div>
            {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
            <Button onClick={sendInvite} disabled={!inviteEmail || inviting}>
              {inviteSent ? "Invite Sent!" : inviting ? "Sending..." : "Send Invite"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Members list */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {m.firstName || m.lastName
                        ? `${m.firstName} ${m.lastName}`.trim()
                        : m.email}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[m.role] ?? "bg-muted"}`}
                    >
                      {m.role.replace("Practice", "")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{m.email}</p>
                  {m.clinician?.specialty && (
                    <p className="text-xs text-muted-foreground">{m.clinician.specialty}</p>
                  )}
                </div>
                {m.role === "Clinician" && m.clinician && (
                  <div className="flex items-center gap-1.5 text-sm">
                    {m.clinician.seatStatus === "ACTIVE" ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" /> Active seat
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="h-4 w-4" /> {m.clinician.seatStatus}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {members.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No team members yet. Send an invite to get started.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

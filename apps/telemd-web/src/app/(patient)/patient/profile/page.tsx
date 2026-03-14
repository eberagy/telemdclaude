"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { User, Shield, Lock, Pencil, Check, X, Bell } from "lucide-react";

interface PatientProfile {
  id: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  state: string;
}

export default function PatientProfilePage() {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/me/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
          setPhone(data.profile.phone ?? "");
          setDob(data.profile.dateOfBirth ?? "");
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim() || null,
          dateOfBirth: dob || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save changes.");
        return;
      }
      setProfile(data.profile);
      setPhone(data.profile.phone ?? "");
      setDob(data.profile.dateOfBirth ?? "");
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setPhone(profile?.phone ?? "");
    setDob(profile?.dateOfBirth ?? "");
    setError(null);
    setEditing(false);
  };

  if (!isLoaded) {
    return (
      <div className="container py-8 max-w-lg">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-lg space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <User className="h-6 w-6 text-primary" />
        My Profile
      </h1>

      {/* Clerk account info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            {user?.imageUrl && (
              <img
                src={user.imageUrl}
                alt="Avatar"
                className="w-12 h-12 rounded-full border"
              />
            )}
            <div>
              <p className="font-medium">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-sm text-muted-foreground">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
          <div className="pt-2 border-t">
            <a
              href="https://accounts.clerk.dev/user"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Manage account (email, password, 2FA) →
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Editable contact info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Contact Information</CardTitle>
          {!editing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              className="h-8 gap-1.5 text-xs"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+12025551234"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Include country code (e.g. +1)</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving} className="gap-1.5">
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Phone</span>
                <span>
                  {profile?.phone ?? (
                    <span className="text-muted-foreground italic">Not set</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Date of Birth</span>
                <span>
                  {profile?.dateOfBirth
                    ? new Date(profile.dateOfBirth + "T00:00:00").toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : <span className="text-muted-foreground italic">Not set</span>}
                </span>
              </div>
              {saved && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Changes saved
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Notification settings link */}
      <Card>
        <CardContent className="pt-5">
          <Link
            href="/patient/profile/notifications"
            className="flex items-center justify-between text-sm hover:text-primary transition-colors"
          >
            <span className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              Notification Settings
            </span>
            <span className="text-muted-foreground">→</span>
          </Link>
        </CardContent>
      </Card>

      {/* Privacy & PHI */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Privacy & Health Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">State of Service</span>
            <Badge variant="secondary">Pennsylvania (PA)</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Data Encrypted</span>
            <span className="flex items-center gap-1 text-green-600 font-medium">
              <Lock className="h-3.5 w-3.5" /> Yes (AES-256)
            </span>
          </div>
          <div className="border-t pt-3 text-xs text-muted-foreground space-y-1">
            <p>Your health information is protected under HIPAA.</p>
            <p>To request access to or deletion of your records, email us at privacy@telemd.health</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

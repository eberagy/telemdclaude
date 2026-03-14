"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Bell, CheckCircle } from "lucide-react";

interface NotificationPrefs {
  emailReminders: boolean;
  smsReminders: boolean;
}

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<NotificationPrefs>({ emailReminders: true, smsReminders: false });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/me/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (data.prefs) setPrefs(data.prefs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleToggle = async (key: keyof NotificationPrefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    await fetch("/api/me/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="container py-8 max-w-lg space-y-6">
      <Link
        href="/patient/profile"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Profile
      </Link>

      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Bell className="h-6 w-6 text-primary" />
        Notification Settings
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appointment Reminders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-8 bg-muted rounded" />
              <div className="h-8 bg-muted rounded" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-reminders" className="text-sm font-medium">
                    Email Reminders
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Receive appointment reminders via email
                  </p>
                </div>
                <Switch
                  id="email-reminders"
                  checked={prefs.emailReminders}
                  onCheckedChange={() => handleToggle("emailReminders")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sms-reminders" className="text-sm font-medium">
                    SMS Reminders
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Receive appointment reminders via text message
                  </p>
                </div>
                <Switch
                  id="sms-reminders"
                  checked={prefs.smsReminders}
                  onCheckedChange={() => handleToggle("smsReminders")}
                />
              </div>

              {saved && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Saved
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

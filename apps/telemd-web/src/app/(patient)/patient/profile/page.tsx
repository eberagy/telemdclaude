"use client";

import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Lock } from "lucide-react";


export default function PatientProfilePage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="container py-8 max-w-lg">
        <div className="animate-pulse space-y-4">
          {[1, 2].map((i) => <div key={i} className="h-32 bg-muted rounded-lg" />)}
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

      {/* Account info */}
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

      {/* Upcoming notice */}
      <Card className="border-muted bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Profile editing (name, phone, date of birth) is coming soon.
          Contact your care team for updates to your clinical information.
        </CardContent>
      </Card>
    </div>
  );
}

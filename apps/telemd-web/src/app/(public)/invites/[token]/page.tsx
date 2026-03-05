"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignInButton } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, CheckCircle, AlertTriangle, Clock, UserPlus } from "lucide-react";

interface InvitePreview {
  token: string;
  email: string;
  role: string;
  practiceName: string;
  practiceSlug: string;
  expiresAt: string;
}

const ROLE_LABEL: Record<string, string> = {
  Clinician: "Clinician",
  Staff: "Staff Member",
  PracticeOwner: "Practice Owner",
};

export default function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setInvite(data.invite);
      })
      .catch(() => setError("Failed to load invite."));
  }, [token]);

  const acceptInvite = async () => {
    setAccepting(true);
    try {
      const res = await fetch(`/api/invites/${token}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to accept invite.");
        return;
      }
      setAccepted(true);
      // Reload the session to pick up new Clerk metadata, then redirect
      await user?.reload();
      setTimeout(() => router.push(data.redirectTo ?? "/"), 1500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  if (!isLoaded || (!invite && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading invite...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-1">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <h1 className="text-xl font-bold">TeleMD Practice Invite</h1>
        </div>

        {error ? (
          <Card className="border-red-200">
            <CardContent className="pt-6 pb-6 text-center space-y-3">
              <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
              <p className="font-medium text-red-700">{error}</p>
              <Button variant="outline" onClick={() => router.push("/")}>
                Return Home
              </Button>
            </CardContent>
          </Card>
        ) : accepted ? (
          <Card className="border-green-200">
            <CardContent className="pt-6 pb-6 text-center space-y-3">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-lg font-semibold">Welcome to the team!</p>
              <p className="text-sm text-muted-foreground">Redirecting to your portal...</p>
            </CardContent>
          </Card>
        ) : invite ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                You&apos;re invited to join
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="bg-muted/40 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-lg">{invite.practiceName}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{ROLE_LABEL[invite.role] ?? invite.role}</Badge>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    Invited to: {invite.email}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Expires {new Date(invite.expiresAt).toLocaleDateString()}
                </div>
              </div>

              {!user ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    Sign in or create an account to accept this invite.
                  </p>
                  <SignInButton
                    mode="modal"
                    forceRedirectUrl={`/invites/${token}`}
                    signUpForceRedirectUrl={`/invites/${token}`}
                  >
                    <Button className="w-full gap-2">
                      <UserPlus className="h-4 w-4" />
                      Sign In / Create Account
                    </Button>
                  </SignInButton>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    Signed in as <strong>{user.primaryEmailAddress?.emailAddress}</strong>
                  </p>
                  <Button
                    className="w-full"
                    onClick={acceptInvite}
                    disabled={accepting}
                  >
                    {accepting ? "Accepting..." : `Accept & Join ${invite.practiceName}`}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

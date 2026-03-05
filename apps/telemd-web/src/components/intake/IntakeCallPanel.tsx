"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, CheckCircle, AlertTriangle, X } from "lucide-react";

interface IntakeCallPanelProps {
  appointmentId: string;
  onComplete: () => void;
  onClose: () => void;
}

type CallState = "idle" | "connecting" | "active" | "completed" | "error";

export function IntakeCallPanel({
  appointmentId,
  onComplete,
  onClose,
}: IntakeCallPanelProps) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startCall = async () => {
    setCallState("connecting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/intake/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCallState("error");
        setErrorMsg(data.error ?? "Failed to start intake call.");
        return;
      }

      // In production, use Retell Web SDK with data.accessToken
      // For now, simulate call flow
      setCallState("active");

      // The actual Retell Web SDK integration:
      // const RetellWebClient = (await import("retell-client-js-sdk")).RetellWebClient;
      // const client = new RetellWebClient();
      // await client.startCall({ accessToken: data.accessToken });
      // client.on("call_ended", () => { setCallState("completed"); onComplete(); });

      // Simulated completion for demo (replace with SDK events in production)
      console.log("[intake] Call started with callId:", data.callId);
    } catch {
      setCallState("error");
      setErrorMsg("Network error. Please try again.");
    }
  };

  const endCall = () => {
    setCallState("completed");
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          AI Voice Intake
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Instructions */}
        <div className="banner-info">
          <p className="font-medium mb-1">How it works:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Click &quot;Start Intake Call&quot; below</li>
            <li>Our AI assistant will ask you questions about your visit</li>
            <li>Answer naturally — this helps your clinician prepare</li>
            <li>The call takes approximately 3-5 minutes</li>
          </ol>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-md">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            This is an intake screening only — not medical advice or triage.
            For emergencies, call 911.
          </span>
        </div>

        {/* Call states */}
        {callState === "idle" && (
          <div className="text-center py-4">
            <Button onClick={startCall} size="lg" className="gap-2">
              <Phone className="h-5 w-5" />
              Start Intake Call
            </Button>
          </div>
        )}

        {callState === "connecting" && (
          <div className="text-center py-4 space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground text-sm">Connecting to intake assistant...</p>
          </div>
        )}

        {callState === "active" && (
          <div className="text-center py-4 space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="font-medium text-green-700">Call in progress</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Please answer the intake questions when prompted.
            </p>
            <Button
              variant="destructive"
              onClick={endCall}
              className="gap-2"
            >
              <PhoneOff className="h-4 w-4" />
              End Call
            </Button>
          </div>
        )}

        {callState === "completed" && (
          <div className="text-center py-4 space-y-2">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
            <p className="font-medium text-green-700">Intake completed!</p>
            <p className="text-sm text-muted-foreground">
              Your responses have been recorded. Your clinician will review them before your visit.
            </p>
          </div>
        )}

        {callState === "error" && (
          <div className="text-center py-4 space-y-3">
            <p className="text-destructive text-sm">{errorMsg}</p>
            <Button variant="outline" onClick={() => setCallState("idle")}>
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

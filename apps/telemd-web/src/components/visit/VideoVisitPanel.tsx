"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, VideoOff, Mic, MicOff, PhoneOff, AlertTriangle } from "lucide-react";

interface VideoVisitPanelProps {
  appointmentId: string;
  role: "host" | "participant";
  onEnd: () => void;
}

type SessionState = "loading" | "ready" | "connected" | "ended" | "error";

export function VideoVisitPanel({ appointmentId, role, onEnd }: VideoVisitPanelProps) {
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initSession();
  }, [appointmentId]);

  const initSession = async () => {
    try {
      const res = await fetch("/api/zoom/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to initialize video session.");
        setSessionState("error");
        return;
      }

      // In production, initialize Zoom Video SDK here:
      // const ZoomVideo = (await import("@zoom/videosdk")).default;
      // const client = ZoomVideo.createClient();
      // await client.init("en-US", "Global", { patchJsMedia: true });
      // await client.join(data.sessionName, data.sessionToken, userId);
      // const stream = client.getMediaStream();
      // await stream.startVideo({ videoElement: containerRef.current! });

      console.log("[zoom] Session token received for:", data.sessionName);
      setSessionState("connected");
    } catch {
      setErrorMsg("Failed to connect to video session.");
      setSessionState("error");
    }
  };

  const endVisit = async () => {
    // In production: await client.leave();
    setSessionState("ended");
    setTimeout(onEnd, 2000);
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Video Visit
          </CardTitle>
          {sessionState === "connected" && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-green-700 font-medium">Live</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* No recording notice */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-gray-50 p-2 rounded">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>This session is <strong>not recorded</strong>. No video or audio is stored.</span>
        </div>

        {/* Video container */}
        <div
          ref={containerRef}
          className="w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center"
        >
          {sessionState === "loading" && (
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto" />
              <p className="text-white text-sm">Initializing video...</p>
            </div>
          )}
          {sessionState === "connected" && (
            <div className="text-white text-center">
              <Video className="h-12 w-12 mx-auto mb-2 opacity-60" />
              <p className="text-sm opacity-70">
                {role === "host"
                  ? "Video session active. Waiting for patient..."
                  : "Connected. Your clinician will join shortly."}
              </p>
            </div>
          )}
          {sessionState === "ended" && (
            <div className="text-white text-center">
              <p className="font-medium">Visit ended</p>
            </div>
          )}
          {sessionState === "error" && (
            <div className="text-red-300 text-center text-sm px-4">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Controls */}
        {sessionState === "connected" && (
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className={isMuted ? "bg-red-50 border-red-200" : ""}
            >
              {isMuted ? (
                <MicOff className="h-4 w-4 text-red-500" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsVideoOff(!isVideoOff)}
              className={isVideoOff ? "bg-red-50 border-red-200" : ""}
            >
              {isVideoOff ? (
                <VideoOff className="h-4 w-4 text-red-500" />
              ) : (
                <Video className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={endVisit}
              className="gap-2"
            >
              <PhoneOff className="h-4 w-4" />
              {role === "host" ? "End Visit" : "Leave"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

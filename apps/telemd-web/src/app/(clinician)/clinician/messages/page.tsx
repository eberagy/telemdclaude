"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, AlertTriangle, User } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  senderRole: string;
  createdAt: string;
  readAt?: string;
}

interface PatientThread {
  patientId: string;
  email: string;
  lastMessage: string;
  unread: number;
}

export default function ClinicianMessagesPage() {
  const searchParams = useSearchParams();
  const initialPatientId = searchParams.get("patientId");

  const [me, setMe] = useState<{ practiceId: string | null }>({ practiceId: null });
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatientId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => setMe({ practiceId: data.practiceId }));
  }, []);

  useEffect(() => {
    if (!selectedPatientId || !me.practiceId) return;
    setLoading(true);
    fetch(`/api/messages?practiceId=${me.practiceId}&patientId=${selectedPatientId}`)
      .then((r) => r.json())
      .then((data) => { setMessages(data.messages ?? []); setLoading(false); });
  }, [selectedPatientId, me.practiceId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!content.trim() || !me.practiceId || !selectedPatientId) return;
    setSending(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ practiceId: me.practiceId, content, patientId: selectedPatientId }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessages((m) => [...m, data.message]);
      setContent("");
    } else {
      toast.error("Failed to send message");
    }
    setSending(false);
  };

  if (!selectedPatientId) {
    return (
      <div className="container py-8 max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Patient Messages
        </h1>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground space-y-3">
            <User className="h-10 w-10 mx-auto opacity-40" />
            <p>Select a patient from their record to open a message thread.</p>
            <p className="text-xs">
              Navigate to a patient's record via the Schedule or Patients page, then click "Open Messages."
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedPatientId(null)}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Patient Thread
        </h1>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
        Do not include clinical diagnoses in messages. For urgent clinical matters, use a phone call.
      </div>

      <Card className="flex flex-col min-h-[400px]">
        <CardContent className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[500px]">
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded-lg" />)}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              No messages yet. Start the conversation.
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.senderRole !== "Patient" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.senderRole !== "Patient"
                      ? "bg-primary text-white rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  <p>{m.content}</p>
                  <p className={`text-xs mt-1 ${m.senderRole !== "Patient" ? "text-white/70" : "text-muted-foreground"}`}>
                    {new Date(m.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    {m.senderRole === "Patient" ? " · Patient" : " · You"}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Textarea
          placeholder="Message patient..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          rows={2}
          className="resize-none flex-1"
        />
        <Button onClick={send} disabled={!content.trim() || sending} className="self-end">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

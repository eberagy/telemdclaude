"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, AlertTriangle } from "lucide-react";

interface Message {
  id: string;
  content: string;
  senderRole: string;
  createdAt: string;
  readAt?: string;
}

export default function PatientMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((me) => {
        if (me.practiceId) {
          setPracticeId(me.practiceId);
          return fetch(`/api/messages?practiceId=${me.practiceId}`);
        }
      })
      .then((r) => r?.json())
      .then((data) => {
        if (data) setMessages(data.messages ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!content.trim() || !practiceId) return;
    setSending(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ practiceId, content }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessages((m) => [...m, data.message]);
      setContent("");
    }
    setSending(false);
  };

  return (
    <div className="container py-8 max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <MessageSquare className="h-6 w-6 text-primary" />
        Messages
      </h1>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
        Do not use messaging for medical emergencies. Call 911 immediately.
      </div>

      {/* Message thread */}
      <Card className="min-h-[400px] flex flex-col">
        <CardContent className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[500px]">
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded-lg" />)}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              No messages yet. Send a message to your care team.
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.senderRole === "Patient" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.senderRole === "Patient"
                      ? "bg-primary text-white rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  <p>{m.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      m.senderRole === "Patient" ? "text-white/70" : "text-muted-foreground"
                    }`}
                  >
                    {new Date(m.createdAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {m.senderRole !== "Patient" && ` · Care Team`}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </CardContent>
      </Card>

      {/* Compose */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Message your care team..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          className="resize-none flex-1"
        />
        <Button
          onClick={send}
          disabled={!content.trim() || sending || !practiceId}
          className="self-end"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Press Enter to send, Shift+Enter for new line. Response time is typically within 1 business day.
      </p>
    </div>
  );
}

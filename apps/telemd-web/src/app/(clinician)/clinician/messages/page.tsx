"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, AlertTriangle, User, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  senderRole: string;
  createdAt: string;
  readAt?: string;
  patientId?: string;
  patientEmail?: string;
}

interface PatientThread {
  patientId: string;
  patientEmail: string;
  lastMessage: Message;
  unreadCount: number;
}

export default function ClinicianMessagesPage() {
  const searchParams = useSearchParams();
  const initialPatientId = searchParams.get("patientId");

  const [me, setMe] = useState<{ practiceId: string | null }>({ practiceId: null });
  const [threads, setThreads] = useState<PatientThread[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatientId);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => setMe({ practiceId: data.practiceId }));
  }, []);

  // Fetch all messages and group into threads
  useEffect(() => {
    if (!me.practiceId) return;
    setLoadingThreads(true);
    fetch(`/api/messages?practiceId=${me.practiceId}`)
      .then((r) => r.json())
      .then((data) => {
        const msgs: Message[] = data.messages ?? [];
        const threadMap = new Map<string, PatientThread>();
        for (const msg of msgs) {
          const pid = msg.patientId ?? "unknown";
          const email = msg.patientEmail ?? pid;
          if (!threadMap.has(pid)) {
            threadMap.set(pid, {
              patientId: pid,
              patientEmail: email,
              lastMessage: msg,
              unreadCount: 0,
            });
          } else {
            const t = threadMap.get(pid)!;
            if (new Date(msg.createdAt) > new Date(t.lastMessage.createdAt)) {
              t.lastMessage = msg;
            }
          }
          if (msg.senderRole === "Patient" && !msg.readAt) {
            threadMap.get(pid)!.unreadCount++;
          }
        }
        setThreads(
          Array.from(threadMap.values()).sort(
            (a, b) =>
              new Date(b.lastMessage.createdAt).getTime() -
              new Date(a.lastMessage.createdAt).getTime()
          )
        );
        setLoadingThreads(false);
      })
      .catch(() => setLoadingThreads(false));
  }, [me.practiceId]);

  // Fetch messages for selected patient
  useEffect(() => {
    if (!selectedPatientId || !me.practiceId) return;
    setLoadingMessages(true);
    fetch(`/api/messages?practiceId=${me.practiceId}&patientId=${selectedPatientId}`)
      .then((r) => r.json())
      .then((data) => {
        setThreadMessages(data.messages ?? []);
        setLoadingMessages(false);
      });
  }, [selectedPatientId, me.practiceId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages]);

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
      setThreadMessages((m) => [...m, data.message]);
      setContent("");
    } else {
      toast.error("Failed to send message");
    }
    setSending(false);
  };

  const selectedThread = threads.find((t) => t.patientId === selectedPatientId);

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <MessageSquare className="h-6 w-6 text-primary" />
        Patient Messages
      </h1>

      <div className="flex border rounded-lg overflow-hidden bg-white" style={{ minHeight: 560 }}>
        {/* ── Left panel: thread list ── */}
        <div
          className={`flex-col border-r ${
            selectedPatientId ? "hidden md:flex" : "flex"
          } w-full md:w-1/3`}
        >
          <div className="px-4 py-3 border-b bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Conversations ({threads.length})
            </p>
          </div>

          {loadingThreads ? (
            <div className="p-4 space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded-md" />)}
            </div>
          ) : threads.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
              <User className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">No conversations yet.</p>
              <p className="text-xs mt-1 max-w-[180px]">
                Open a patient&apos;s record and click &quot;Message&quot; to start a thread.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y">
              {threads.map((thread) => {
                const isSelected = selectedPatientId === thread.patientId;
                return (
                  <button
                    key={thread.patientId}
                    onClick={() => setSelectedPatientId(thread.patientId)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                      isSelected ? "bg-primary/5 border-l-2 border-l-primary" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-medium text-sm truncate">
                        {thread.patientEmail}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {thread.unreadCount > 0 && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(thread.lastMessage.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {thread.lastMessage.senderRole !== "Patient" ? "You: " : ""}
                      {thread.lastMessage.content}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right panel: thread view ── */}
        <div
          className={`flex-col flex-1 ${selectedPatientId ? "flex" : "hidden md:flex"}`}
        >
          {!selectedPatientId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">Select a conversation</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b">
                <button
                  onClick={() => setSelectedPatientId(null)}
                  className="md:hidden text-muted-foreground hover:text-foreground"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <p className="font-medium text-sm">
                    {selectedThread?.patientEmail ?? selectedPatientId}
                  </p>
                  <p className="text-xs text-muted-foreground">Patient</p>
                </div>
              </div>

              {/* PHI disclaimer */}
              <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                Do not include clinical diagnoses. For urgent clinical matters, use a phone call.
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-96">
                {loadingMessages ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded-lg" />)}
                  </div>
                ) : threadMessages.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground text-sm">
                    No messages yet. Start the conversation.
                  </div>
                ) : (
                  threadMessages.map((m) => (
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
                        <p
                          className={`text-xs mt-1 ${
                            m.senderRole !== "Patient" ? "text-white/70" : "text-muted-foreground"
                          }`}
                        >
                          {new Date(m.createdAt).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {m.senderRole === "Patient" ? " · Patient" : " · You"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Compose */}
              <div className="p-4 border-t flex gap-2">
                <Textarea
                  placeholder="Message patient..."
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
                  disabled={!content.trim() || sending}
                  className="self-end"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

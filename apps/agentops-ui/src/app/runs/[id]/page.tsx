"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface AgentRunDetail {
  id: string;
  agentId: string;
  status: string;
  prompt: string;
  result?: string;
  error?: string;
  question?: string;
  tokenUsed: number;
  costCents: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  agent: { name: string; displayName: string };
}

const STATUS_COLORS: Record<string, string> = {
  QUEUED: "bg-gray-800 text-gray-400",
  RUNNING: "bg-blue-900 text-blue-300",
  AWAITING_APPROVAL: "bg-amber-900 text-amber-300",
  AWAITING_INPUT: "bg-violet-900 text-violet-300",
  COMPLETED: "bg-green-900 text-green-300",
  FAILED: "bg-red-900 text-red-300",
  CANCELLED: "bg-gray-800 text-gray-500",
};

export default function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [run, setRun] = useState<AgentRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fetchRun = () =>
    fetch(`/api/runs/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setRun(data.run ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));

  useEffect(() => {
    fetchRun();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitAnswer = async () => {
    if (!answer.trim()) return;
    setSubmitting(true);
    await fetch(`/api/runs/${id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
    });
    // Refresh run state
    await fetch(`/api/runs/${id}`)
      .then((r) => r.json())
      .then((data) => setRun(data.run ?? null));
    setSubmitted(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-gray-400">Loading run...</div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center flex-col gap-4">
        <div className="text-red-400">Run not found.</div>
        <Link href="/runs" className="text-violet-400 hover:text-violet-300 text-sm">
          ← Back to Runs
        </Link>
      </div>
    );
  }

  const isAwaitingInput = run.status === "AWAITING_INPUT";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-900 px-6 h-14 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-violet-600 rounded flex items-center justify-center">
            <span className="font-bold text-xs">A</span>
          </div>
          <span className="font-bold">AgentOps</span>
        </Link>
        <span className="text-gray-600">/</span>
        <Link href="/runs" className="text-gray-400 hover:text-gray-200 text-sm">
          Runs
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-gray-300 text-sm font-mono">{run.id.slice(0, 8)}…</span>
      </nav>

      <main className="container py-8 max-w-3xl space-y-6">
        {/* Human-in-the-loop prompt — shown prominently at top when awaiting */}
        {isAwaitingInput && run.question && !submitted && (
          <div className="bg-violet-950 border border-violet-700 rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-violet-300 font-semibold text-sm">
                Agent is waiting for your answer
              </span>
            </div>
            <p className="text-white text-sm leading-relaxed">{run.question}</p>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              placeholder="Type your answer..."
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 resize-none"
            />
            <button
              onClick={submitAnswer}
              disabled={!answer.trim() || submitting}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded font-medium text-sm transition-colors"
            >
              {submitting ? "Submitting…" : "Submit Answer"}
            </button>
          </div>
        )}

        {submitted && (
          <div className="bg-green-950 border border-green-700 rounded-lg p-4 text-green-300 text-sm">
            ✓ Answer submitted. The agent will continue shortly.
          </div>
        )}

        {/* Run details card */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-gray-800">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <span className="font-bold text-lg">{run.agent.displayName}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  STATUS_COLORS[run.status] ?? "bg-gray-800 text-gray-400"
                }`}
              >
                {run.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>Agent ID: <span className="font-mono text-gray-400">{run.agentId}</span></span>
              <span>Run ID: <span className="font-mono text-gray-400">{run.id}</span></span>
              <span>{run.tokenUsed.toLocaleString()} tokens</span>
              <span>${(run.costCents / 100).toFixed(4)} cost</span>
              <span>Created: {new Date(run.createdAt).toLocaleString()}</span>
              {run.completedAt && (
                <span>Completed: {new Date(run.completedAt).toLocaleString()}</span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5">
            <Section title="Prompt">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap bg-gray-800 p-3 rounded leading-relaxed">
                {run.prompt}
              </pre>
            </Section>

            {run.result && (
              <Section title="Result">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap bg-gray-800 p-3 rounded max-h-64 overflow-y-auto leading-relaxed">
                  {run.result}
                </pre>
              </Section>
            )}

            {run.error && (
              <Section title="Error">
                <pre className="text-xs text-red-300 whitespace-pre-wrap bg-red-950 p-3 rounded leading-relaxed">
                  {run.error}
                </pre>
              </Section>
            )}

            {isAwaitingInput && run.question && !submitted && (
              <Section title="Pending Question">
                <p className="text-sm text-violet-300 bg-violet-950/50 p-3 rounded border border-violet-800">
                  {run.question}
                </p>
              </Section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

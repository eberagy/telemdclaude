"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AgentRun {
  id: string;
  agentId: string;
  status: string;
  prompt: string;
  result?: string;
  error?: string;
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
  COMPLETED: "bg-green-900 text-green-300",
  FAILED: "bg-red-900 text-red-300",
  CANCELLED: "bg-gray-800 text-gray-500",
};

export default function RunsPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = filter === "ALL" ? "" : `?status=${filter}`;
    fetch(`/api/runs${q}`)
      .then((r) => r.json())
      .then((data) => { setRuns(data.runs ?? []); setLoading(false); });
  }, [filter]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-900">
        <div className="container flex items-center gap-4 h-14 text-sm">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-violet-600 rounded flex items-center justify-center">
              <span className="font-bold text-xs">A</span>
            </div>
            <span className="font-bold">AgentOps</span>
          </Link>
          <span className="text-gray-500">/ Runs</span>
        </div>
      </nav>

      <main className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Agent Runs</h1>
          <div className="flex gap-2 flex-wrap">
            {["ALL", "RUNNING", "AWAITING_APPROVAL", "COMPLETED", "FAILED"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`text-xs px-3 py-1.5 rounded-md ${
                  filter === s ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-900 rounded-lg animate-pulse" />)}
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No runs found.</div>
        ) : (
          <div className="space-y-2">
            {runs.map((r) => (
              <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                <div
                  className="p-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-gray-800/50"
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{r.agent.displayName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] ?? "bg-gray-800"}`}>
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">{r.prompt}</p>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>{r.tokenUsed.toLocaleString()} tokens</span>
                      <span>${(r.costCents / 100).toFixed(4)}</span>
                      <span>{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <span className="text-gray-600 text-xs">{expanded === r.id ? "▲" : "▼"}</span>
                </div>

                {expanded === r.id && (
                  <div className="border-t border-gray-800 p-4 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Prompt</p>
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap bg-gray-800 p-3 rounded">
                        {r.prompt}
                      </pre>
                    </div>
                    {r.result && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Result</p>
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap bg-gray-800 p-3 rounded max-h-40 overflow-y-auto">
                          {r.result}
                        </pre>
                      </div>
                    )}
                    {r.error && (
                      <div>
                        <p className="text-xs text-red-400 mb-1">Error</p>
                        <pre className="text-xs text-red-300 whitespace-pre-wrap bg-red-950 p-3 rounded">
                          {r.error}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

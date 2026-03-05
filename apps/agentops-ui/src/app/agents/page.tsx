"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Agent {
  id: string;
  name: string;
  displayName: string;
  description: string;
  autonomyLevel: string;
  isActive: boolean;
  isPaused: boolean;
  budgetCentsPerDay: number;
  spentTodayCents: number;
  allowedTools: string[];
}

const AUTONOMY_COLORS: Record<string, string> = {
  DRAFT_ONLY: "bg-gray-800 text-gray-300",
  NORMAL: "bg-blue-900 text-blue-300",
  AGGRESSIVE: "bg-red-900 text-red-300",
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => { setAgents(data.agents ?? []); setLoading(false); });
  };

  useEffect(load, []);

  const toggle = async (id: string, action: "pause" | "resume" | "disable" | "enable") => {
    await fetch(`/api/agents/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    load();
  };

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
          <span className="text-gray-500">/ Agents</span>
        </div>
      </nav>

      <main className="container py-8">
        <h1 className="text-2xl font-bold mb-6">Agent Controls</h1>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-gray-900 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p>No agents registered. Check the worker service.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((a) => (
              <div
                key={a.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-5 flex items-start justify-between gap-6"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{a.displayName}</span>
                    <span className="text-xs text-gray-500 font-mono">{a.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${AUTONOMY_COLORS[a.autonomyLevel] ?? "bg-gray-800"}`}>
                      {a.autonomyLevel.replace(/_/g, " ")}
                    </span>
                    {a.isPaused && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900 text-amber-300">PAUSED</span>
                    )}
                    {!a.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-900 text-red-300">DISABLED</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{a.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Budget: ${(a.budgetCentsPerDay / 100).toFixed(2)}/day</span>
                    <span>Spent today: ${(a.spentTodayCents / 100).toFixed(2)}</span>
                    <span>Tools: {a.allowedTools.length}</span>
                  </div>
                  {/* Budget bar */}
                  <div className="w-48 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full"
                      style={{
                        width: `${Math.min(100, (a.spentTodayCents / a.budgetCentsPerDay) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {a.isPaused ? (
                    <button
                      onClick={() => toggle(a.id, "resume")}
                      className="text-xs px-3 py-1.5 bg-green-700 hover:bg-green-600 rounded-md"
                    >
                      Resume
                    </button>
                  ) : (
                    <button
                      onClick={() => toggle(a.id, "pause")}
                      className="text-xs px-3 py-1.5 bg-amber-700 hover:bg-amber-600 rounded-md"
                    >
                      Pause
                    </button>
                  )}
                  {a.isActive ? (
                    <button
                      onClick={() => toggle(a.id, "disable")}
                      className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-red-700 rounded-md"
                    >
                      Disable
                    </button>
                  ) : (
                    <button
                      onClick={() => toggle(a.id, "enable")}
                      className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-green-700 rounded-md"
                    >
                      Enable
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

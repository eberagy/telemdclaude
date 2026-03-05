"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Agent {
  id: string;
  name: string;
  displayName: string;
  autonomyLevel: string;
  budgetCentsPerDay: number;
  allowedTools: string[];
}

const AUTONOMY_LEVELS = ["DRAFT_ONLY", "NORMAL", "AGGRESSIVE"] as const;
const AUTONOMY_DESC: Record<string, string> = {
  DRAFT_ONLY: "Creates drafts for human review before any action",
  NORMAL: "Acts autonomously within approved tool set, pauses for high-risk actions",
  AGGRESSIVE: "Maximizes autonomy — use with extreme care",
};

export default function SettingsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<Agent>>>({});

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => {
        const list = data.agents ?? [];
        setAgents(list);
        const initial: Record<string, Partial<Agent>> = {};
        list.forEach((a: Agent) => {
          initial[a.id] = {
            autonomyLevel: a.autonomyLevel,
            budgetCentsPerDay: a.budgetCentsPerDay,
          };
        });
        setEdits(initial);
        setLoading(false);
      });
  }, []);

  const saveAgent = async (id: string) => {
    setSaving(id);
    await fetch(`/api/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edits[id]),
    });
    setSaving(null);
  };

  const patch = (id: string, key: keyof Agent, value: unknown) => {
    setEdits((e) => ({ ...e, [id]: { ...e[id], [key]: value } }));
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
          <span className="text-gray-500">/ Settings</span>
        </div>
      </nav>

      <main className="container py-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-gray-400 text-sm mb-8">
          Configure autonomy levels, daily budgets, and tool permissions per agent.
        </p>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-gray-900 rounded-lg" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {agents.map((a) => {
              const edit = edits[a.id] ?? {};
              const autonomy = (edit.autonomyLevel ?? a.autonomyLevel) as string;
              const budget = (edit.budgetCentsPerDay ?? a.budgetCentsPerDay) as number;
              const changed =
                autonomy !== a.autonomyLevel || budget !== a.budgetCentsPerDay;

              return (
                <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold">{a.displayName}</span>
                      <span className="text-gray-500 text-xs ml-2 font-mono">{a.name}</span>
                    </div>
                    {changed && (
                      <button
                        onClick={() => saveAgent(a.id)}
                        disabled={saving === a.id}
                        className="text-xs px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-md disabled:opacity-50"
                      >
                        {saving === a.id ? "Saving..." : "Save"}
                      </button>
                    )}
                  </div>

                  {/* Autonomy level */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">Autonomy Level</label>
                    <div className="flex gap-2 flex-wrap">
                      {AUTONOMY_LEVELS.map((level) => (
                        <button
                          key={level}
                          onClick={() => patch(a.id, "autonomyLevel", level)}
                          className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                            autonomy === level
                              ? level === "AGGRESSIVE"
                                ? "bg-red-700 text-white"
                                : level === "DRAFT_ONLY"
                                ? "bg-gray-600 text-white"
                                : "bg-violet-600 text-white"
                              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                          }`}
                        >
                          {level.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">{AUTONOMY_DESC[autonomy]}</p>
                  </div>

                  {/* Budget */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">Daily Budget</label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm">$</span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={(budget / 100).toFixed(2)}
                        onChange={(e) =>
                          patch(a.id, "budgetCentsPerDay", Math.round(parseFloat(e.target.value) * 100))
                        }
                        className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white w-28 focus:outline-none focus:border-violet-500"
                      />
                      <span className="text-gray-500 text-xs">per day</span>
                    </div>
                  </div>

                  {/* Allowed tools */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-gray-400">Allowed Tools ({a.allowedTools.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {a.allowedTools.map((tool) => (
                        <span key={tool} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono">
                          {tool}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-600">Tool list is managed in the worker config file.</p>
                  </div>

                  {autonomy === "AGGRESSIVE" && (
                    <div className="border border-red-800 bg-red-950/50 rounded p-3 text-xs text-red-400">
                      ⚠ AGGRESSIVE mode bypasses most approval gates. Ensure budget limits are strict.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

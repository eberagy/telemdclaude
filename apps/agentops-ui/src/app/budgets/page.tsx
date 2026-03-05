"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface BudgetSummary {
  agentId: string;
  agentName: string;
  agentDisplayName: string;
  budgetCentsPerDay: number;
  spentTodayCents: number;
  spentThisWeekCents: number;
  spentTotalCents: number;
}

interface BudgetEntry {
  id: string;
  provider: string;
  model: string;
  tokens: number;
  costCents: number;
  createdAt: string;
  agent: { name: string; displayName: string };
}

export default function BudgetsPage() {
  const [summaries, setSummaries] = useState<BudgetSummary[]>([]);
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/budgets/summary").then((r) => r.json()),
      fetch("/api/budgets/entries?limit=50").then((r) => r.json()),
    ]).then(([sumData, entData]) => {
      setSummaries(sumData.summaries ?? []);
      setEntries(entData.entries ?? []);
      setLoading(false);
    });
  }, []);

  const totalToday = summaries.reduce((acc, s) => acc + s.spentTodayCents, 0);
  const totalWeek = summaries.reduce((acc, s) => acc + s.spentThisWeekCents, 0);
  const totalBudget = summaries.reduce((acc, s) => acc + s.budgetCentsPerDay, 0);

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
          <span className="text-gray-500">/ Budgets</span>
        </div>
      </nav>

      <main className="container py-8">
        <h1 className="text-2xl font-bold mb-6">Budgets & Costs</h1>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-900 rounded-lg" />)}
            </div>
          </div>
        ) : (
          <>
            {/* Overview */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {[
                { label: "Daily Budget (total)", value: `$${(totalBudget / 100).toFixed(2)}`, color: "text-gray-300" },
                { label: "Spent Today", value: `$${(totalToday / 100).toFixed(2)}`, color: totalToday > totalBudget * 0.8 ? "text-red-400" : "text-teal-400" },
                { label: "Spent This Week", value: `$${(totalWeek / 100).toFixed(2)}`, color: "text-purple-400" },
              ].map((s) => (
                <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-sm text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Per-agent breakdown */}
            <h2 className="text-lg font-semibold mb-3">Per-Agent Daily Budget</h2>
            <div className="space-y-3 mb-8">
              {summaries.map((s) => {
                const pct = Math.min(100, (s.spentTodayCents / s.budgetCentsPerDay) * 100);
                const barColor = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-violet-500";
                return (
                  <div key={s.agentId} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{s.agentDisplayName}</span>
                      <div className="text-sm text-gray-400">
                        ${(s.spentTodayCents / 100).toFixed(2)} / ${(s.budgetCentsPerDay / 100).toFixed(2)}
                      </div>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent entries */}
            <h2 className="text-lg font-semibold mb-3">Recent Charges</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 text-xs">
                    <th className="text-left p-3">Agent</th>
                    <th className="text-left p-3">Model</th>
                    <th className="text-right p-3">Tokens</th>
                    <th className="text-right p-3">Cost</th>
                    <th className="text-right p-3">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="p-3 text-gray-300">{e.agent.displayName}</td>
                      <td className="p-3 text-gray-400 font-mono text-xs">{e.model}</td>
                      <td className="p-3 text-right text-gray-400">{e.tokens.toLocaleString()}</td>
                      <td className="p-3 text-right text-teal-400">${(e.costCents / 100).toFixed(4)}</td>
                      <td className="p-3 text-right text-gray-500 text-xs">
                        {new Date(e.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Star, CheckCircle, XCircle, Activity, Cpu, DollarSign } from "lucide-react";

interface Scorecard {
  agentId: string;
  agentName: string;
  displayName: string;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  successRate: number | null;
  avgCostCents: number | null;
  avgTokens: number | null;
  avgRating: number | null;
  ratedRunsCount: number;
}

interface Run {
  id: string;
  status: string;
  trigger: string;
  costCents: number | null;
  tokenUsed: number | null;
  ratingScore: number | null;
  createdAt: string;
  completedAt: string | null;
  agent: { name: string; displayName: string };
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "text-green-400",
  FAILED: "text-red-400",
  RUNNING: "text-blue-400",
  PENDING: "text-gray-400",
  AWAITING_APPROVAL: "text-amber-400",
};

function StarRating({ score }: { score: number | null }) {
  if (!score) return <span className="text-gray-500 text-xs">Unrated</span>;
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= score ? "text-amber-400 fill-amber-400" : "text-gray-600"}`}
        />
      ))}
      <span className="text-xs text-gray-400 ml-1">{score.toFixed(1)}</span>
    </span>
  );
}

export default function AgentScorecardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/agents/${id}/scorecard`).then((r) => r.json()),
      fetch(`/api/runs?limit=20`).then((r) => r.json()),
    ]).then(([sc, runsData]) => {
      setScorecard(sc);
      const agentRuns: Run[] = (runsData.runs ?? []).filter(
        (r: Run & { agent: { name: string } }) => r.agent?.name === sc?.agentName
      );
      setRuns(agentRuns);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="container py-12 space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-gray-800 rounded" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-gray-900 rounded-lg" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!scorecard) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Agent not found.</p>
      </div>
    );
  }

  const successPct = scorecard.successRate != null
    ? Math.round(scorecard.successRate * 100)
    : null;

  const statCards = [
    {
      label: "Total Runs",
      value: scorecard.totalRuns,
      icon: Activity,
      color: "text-violet-400",
    },
    {
      label: "Success Rate",
      value: successPct != null ? `${successPct}%` : "—",
      icon: CheckCircle,
      color: successPct != null && successPct >= 80 ? "text-green-400" : "text-amber-400",
    },
    {
      label: "Avg Cost",
      value:
        scorecard.avgCostCents != null
          ? `$${(scorecard.avgCostCents / 100).toFixed(3)}`
          : "—",
      icon: DollarSign,
      color: "text-blue-400",
    },
    {
      label: "Avg Tokens",
      value:
        scorecard.avgTokens != null
          ? scorecard.avgTokens.toLocaleString()
          : "—",
      icon: Cpu,
      color: "text-cyan-400",
    },
  ];

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
          <span className="text-gray-500">/</span>
          <Link href="/agents" className="text-gray-400 hover:text-white">Agents</Link>
          <span className="text-gray-500">/ {scorecard.displayName}</span>
        </div>
      </nav>

      <main className="container py-8 space-y-8">
        <div className="flex items-center gap-3">
          <Link
            href="/agents"
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Agents
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{scorecard.displayName}</h1>
            <p className="text-sm text-gray-500 font-mono">{scorecard.agentName}</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
              </div>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        {/* Rating summary */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 flex items-center gap-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Average Rating</p>
            <StarRating score={scorecard.avgRating} />
          </div>
          <div className="h-8 w-px bg-gray-800" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Rated Runs</p>
            <p className="text-lg font-semibold">{scorecard.ratedRunsCount}</p>
          </div>
          <div className="h-8 w-px bg-gray-800" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Failed Runs</p>
            <div className="flex items-center gap-1">
              <XCircle className="h-4 w-4 text-red-400" />
              <p className="text-lg font-semibold">{scorecard.failedRuns}</p>
            </div>
          </div>
        </div>

        {/* Run history */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Runs</h2>
          {runs.length === 0 ? (
            <p className="text-gray-500 text-sm">No runs recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {runs.map((run) => (
                <Link key={run.id} href={`/runs/${run.id}`}>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between gap-4 hover:border-gray-600 transition-colors cursor-pointer">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-medium ${STATUS_COLORS[run.status] ?? "text-gray-400"}`}
                        >
                          {run.status}
                        </span>
                        <span className="text-xs text-gray-500">{run.trigger}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(run.createdAt).toLocaleString()}
                        {run.costCents != null && (
                          <span className="ml-2">· ${(run.costCents / 100).toFixed(3)}</span>
                        )}
                        {run.tokenUsed != null && (
                          <span className="ml-2">· {run.tokenUsed.toLocaleString()} tokens</span>
                        )}
                      </p>
                    </div>
                    <StarRating score={run.ratingScore} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

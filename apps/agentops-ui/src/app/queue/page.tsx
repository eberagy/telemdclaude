"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface QueuedTask {
  id: string;
  title: string;
  description: string;
  source: string;
  sourceId?: string;
  priority: number;
  assignedTo?: string;
  status: string;
  labels: string[];
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-900 text-amber-300",
  ASSIGNED: "bg-blue-900 text-blue-300",
  COMPLETED: "bg-green-900 text-green-300",
  CANCELLED: "bg-gray-800 text-gray-400",
};

const SOURCE_ICONS: Record<string, string> = {
  github: "⚙",
  telemd_event: "🏥",
  manual: "✍",
  scheduled: "🕐",
};

export default function QueuePage() {
  const [tasks, setTasks] = useState<QueuedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");

  const load = () => {
    fetch(`/api/queue?status=${filter}`)
      .then((r) => r.json())
      .then((data) => { setTasks(data.tasks ?? []); setLoading(false); });
  };

  useEffect(() => { setLoading(true); load(); }, [filter]);

  const cancel = async (id: string) => {
    await fetch(`/api/queue/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
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
          <span className="text-gray-500">/ Queue</span>
        </div>
      </nav>

      <main className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Task Queue</h1>
          <div className="flex gap-2">
            {["PENDING", "ASSIGNED", "COMPLETED", "CANCELLED"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                  filter === s
                    ? "bg-violet-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-900 rounded-lg animate-pulse" />)}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            No {filter.toLowerCase()} tasks.
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-start justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{SOURCE_ICONS[t.source] ?? "📋"}</span>
                    <span className="font-medium text-sm truncate">{t.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] ?? "bg-gray-800"}`}>
                      {t.status}
                    </span>
                    <span className="text-xs text-gray-500">P{t.priority}</span>
                  </div>
                  <p className="text-sm text-gray-400 truncate">{t.description}</p>
                  <div className="flex flex-wrap gap-1.5 text-xs text-gray-500">
                    {t.assignedTo && <span className="bg-gray-800 px-2 py-0.5 rounded">→ {t.assignedTo}</span>}
                    {t.labels.map((l) => (
                      <span key={l} className="bg-gray-800 px-2 py-0.5 rounded">{l}</span>
                    ))}
                    <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {t.status === "PENDING" && (
                  <button
                    onClick={() => cancel(t.id)}
                    className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-red-900 rounded-md flex-shrink-0"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

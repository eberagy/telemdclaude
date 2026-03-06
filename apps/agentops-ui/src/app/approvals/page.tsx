"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Approval {
  id: string;
  token: string;
  agentName: string;
  summary: string;
  action: string;
  risk: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

const RISK_COLORS: Record<string, string> = {
  LOW: "text-green-400 bg-green-900/30",
  MEDIUM: "text-yellow-400 bg-yellow-900/30",
  HIGH: "text-orange-400 bg-orange-900/30",
  CRITICAL: "text-red-400 bg-red-900/30",
};

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("PENDING");

  const fetchApprovals = () => {
    setLoading(true);
    fetch(`/api/approvals?status=${filter}`)
      .then((r) => r.json())
      .then((data) => {
        setApprovals(data.approvals ?? []);
        setLoading(false);
      });
  };

  useEffect(() => { fetchApprovals(); }, [filter]);

  const decide = async (token: string, decision: string) => {
    await fetch(`/api/approvals/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    fetchApprovals();
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-900 px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm">
          ← Dashboard
        </Link>
        <h1 className="font-bold">Approval Inbox</h1>
        <div className="flex gap-2">
          {["PENDING", "APPROVED", "DENIED"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full ${
                filter === s
                  ? "bg-violet-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </nav>

      <main className="container py-8 max-w-4xl">
        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading...</div>
        ) : approvals.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            No {filter.toLowerCase()} approvals.
          </div>
        ) : (
          <div className="space-y-4">
            {approvals.map((approval) => (
              <div
                key={approval.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">{approval.summary}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          RISK_COLORS[approval.risk] ?? "text-gray-400 bg-gray-800"
                        }`}
                      >
                        {approval.risk}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      Agent: <span className="text-gray-300">{approval.agentName}</span>
                      {" · "}
                      {new Date(approval.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <Link
                    href={`/approvals/${approval.token}`}
                    className="text-xs text-violet-400 hover:text-violet-300 flex-shrink-0"
                  >
                    View Details →
                  </Link>
                </div>

                <div className="bg-gray-800 rounded p-3 text-xs font-mono text-gray-300 max-h-24 overflow-y-auto mb-4">
                  {approval.action.substring(0, 400)}
                  {approval.action.length > 400 ? "..." : ""}
                </div>

                {approval.status === "PENDING" && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => decide(approval.token, "APPROVED")}
                      className="flex-1 bg-green-700 hover:bg-green-600 text-white py-2 rounded text-sm font-medium transition-colors"
                    >
                      Approve ✅
                    </button>
                    <button
                      onClick={() => decide(approval.token, "DENIED")}
                      className="flex-1 bg-red-800 hover:bg-red-700 text-white py-2 rounded text-sm font-medium transition-colors"
                    >
                      Deny ❌
                    </button>
                    <button
                      onClick={() => decide(approval.token, "CHANGES_REQUESTED")}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded text-sm font-medium transition-colors"
                    >
                      Changes ✍️
                    </button>
                  </div>
                )}

                {approval.status !== "PENDING" && (
                  <div
                    className={`text-sm font-medium ${
                      approval.status === "APPROVED"
                        ? "text-green-400"
                        : approval.status === "DENIED"
                        ? "text-red-400"
                        : "text-gray-400"
                    }`}
                  >
                    {approval.status}
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

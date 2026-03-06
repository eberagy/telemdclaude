"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface ApprovalDetail {
  id: string;
  token: string;
  agentName: string;
  summary: string;
  action: string;
  risk: string;
  preview?: string;
  rollbackPlan?: string;
  whySafe?: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export default function ApprovalDetailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [approval, setApproval] = useState<ApprovalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch(`/api/approvals/${token}`)
      .then((r) => r.json())
      .then((data) => {
        setApproval(data.approval);
        setLoading(false);
      });
  }, [token]);

  const decide = async (decision: string) => {
    setDeciding(true);
    await fetch(`/api/approvals/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note }),
    });
    // Refresh
    const data = await fetch(`/api/approvals/${token}`).then((r) => r.json());
    setApproval(data.approval);
    setDeciding(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-red-400">Approval not found or expired.</div>
      </div>
    );
  }

  const isPending = approval.status === "PENDING";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-900 px-6 h-14 flex items-center gap-4">
        <Link href="/approvals" className="text-violet-400 hover:text-violet-300 text-sm">
          ← Approvals
        </Link>
        <span className="text-gray-500">|</span>
        <span className="font-medium text-sm">Approval Detail</span>
      </nav>

      <main className="container py-8 max-w-3xl">
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-bold text-lg text-white">{approval.summary}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  approval.risk === "CRITICAL"
                    ? "bg-red-900/50 text-red-400"
                    : approval.risk === "HIGH"
                    ? "bg-orange-900/50 text-orange-400"
                    : approval.risk === "MEDIUM"
                    ? "bg-yellow-900/50 text-yellow-400"
                    : "bg-green-900/50 text-green-400"
                }`}
              >
                {approval.risk} RISK
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isPending
                    ? "bg-amber-900/50 text-amber-400"
                    : approval.status === "APPROVED"
                    ? "bg-green-900/50 text-green-400"
                    : "bg-red-900/50 text-red-400"
                }`}
              >
                {approval.status}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              Agent: {approval.agentName} · Created: {new Date(approval.createdAt).toLocaleString()} ·
              Expires: {new Date(approval.expiresAt).toLocaleString()}
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-5">
            <Section title="Proposed Action">
              <pre className="bg-gray-800 rounded p-4 text-xs font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">
                {approval.action}
              </pre>
            </Section>

            {approval.preview && (
              <Section title="Preview / Diff">
                <pre className="bg-gray-800 rounded p-4 text-xs font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">
                  {approval.preview}
                </pre>
              </Section>
            )}

            {approval.rollbackPlan && (
              <Section title="Rollback Plan">
                <p className="text-sm text-gray-300">{approval.rollbackPlan}</p>
              </Section>
            )}

            {approval.whySafe && (
              <Section title="Why Safe">
                <p className="text-sm text-gray-300">{approval.whySafe}</p>
              </Section>
            )}

            {/* Decision */}
            {isPending && (
              <div className="border-t border-gray-800 pt-5 space-y-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">
                    Note (optional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                    placeholder="Add a note for the agent..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => decide("APPROVED")}
                    disabled={deciding}
                    className="flex-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white py-2.5 rounded font-medium transition-colors"
                  >
                    Approve ✅
                  </button>
                  <button
                    onClick={() => decide("DENIED")}
                    disabled={deciding}
                    className="flex-1 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white py-2.5 rounded font-medium transition-colors"
                  >
                    Deny ❌
                  </button>
                  <button
                    onClick={() => decide("CHANGES_REQUESTED")}
                    disabled={deciding}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white py-2.5 rounded font-medium transition-colors"
                  >
                    Request Changes ✍️
                  </button>
                </div>
              </div>
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
      <h3 className="text-sm font-medium text-gray-400 mb-2">{title}</h3>
      {children}
    </div>
  );
}

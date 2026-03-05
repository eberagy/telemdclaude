"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardStats {
  agentsActive: number;
  queuePending: number;
  approvalsPending: number;
  runsToday: number;
  costToday: number;
}

export default function AgentOpsDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-900">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-violet-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <span className="font-bold text-white">AgentOps</span>
            <span className="text-gray-500 text-sm">Control Center</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/approvals" className="text-gray-400 hover:text-white">
              Approvals
              {stats?.approvalsPending ? (
                <span className="ml-1.5 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {stats.approvalsPending}
                </span>
              ) : null}
            </Link>
            <Link href="/agents" className="text-gray-400 hover:text-white">Agents</Link>
            <Link href="/queue" className="text-gray-400 hover:text-white">Queue</Link>
            <Link href="/runs" className="text-gray-400 hover:text-white">Runs</Link>
            <Link href="/budgets" className="text-gray-400 hover:text-white">Budgets</Link>
            <Link href="/settings" className="text-gray-400 hover:text-white">Settings</Link>
          </div>
        </div>
      </nav>

      <main className="container py-8">
        <h1 className="text-2xl font-bold mb-6">Overview</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Active Agents", value: stats?.agentsActive ?? "—", color: "text-green-400" },
            { label: "Queue Pending", value: stats?.queuePending ?? "—", color: "text-blue-400" },
            {
              label: "Pending Approvals",
              value: stats?.approvalsPending ?? "—",
              color: stats?.approvalsPending ? "text-amber-400" : "text-gray-400",
            },
            { label: "Runs Today", value: stats?.runsToday ?? "—", color: "text-purple-400" },
            {
              label: "Cost Today",
              value: stats ? `$${((stats.costToday ?? 0) / 100).toFixed(2)}` : "—",
              color: "text-teal-400",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4"
            >
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              href: "/approvals",
              title: "Approval Inbox",
              desc: "Review and act on pending agent approval requests",
              badge: stats?.approvalsPending,
              color: "border-amber-800 hover:border-amber-600",
            },
            {
              href: "/agents",
              title: "Agent Controls",
              desc: "Pause, resume, or adjust autonomy for each agent",
              color: "border-gray-800 hover:border-violet-600",
            },
            {
              href: "/queue",
              title: "Task Queue",
              desc: "View, reprioritize, or cancel queued tasks",
              color: "border-gray-800 hover:border-blue-600",
            },
            {
              href: "/runs",
              title: "Agent Runs",
              desc: "Review artifacts, diffs, logs, and errors from runs",
              color: "border-gray-800 hover:border-purple-600",
            },
            {
              href: "/budgets",
              title: "Budgets & Costs",
              desc: "Track spending per agent and provider",
              color: "border-gray-800 hover:border-teal-600",
            },
            {
              href: "/settings",
              title: "Settings",
              desc: "Configure autonomy levels, schedules, integrations",
              color: "border-gray-800 hover:border-gray-600",
            },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={`bg-gray-900 border ${item.color} rounded-lg p-5 transition-colors cursor-pointer h-full`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  {item.badge ? (
                    <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

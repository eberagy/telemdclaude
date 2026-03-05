"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Search } from "lucide-react";

interface AuditLog {
  id: string;
  eventType: string;
  clerkUserId: string;
  resourceId?: string;
  resourceType?: string;
  ipAddress?: string;
  createdAt: string;
  member?: { firstName: string; lastName: string; role: string };
}

const EVENT_COLOR: Record<string, string> = {
  VIEW_PATIENT_RECORD: "warning",
  VIEW_TRANSCRIPT: "warning",
  VIEW_AI_SUMMARY: "warning",
  GENERATE_AI_SUMMARY: "secondary",
  EDIT_NOTE: "secondary",
  SIGN_NOTE: "success",
  EXPORT_PDF: "warning",
  START_VISIT: "default",
  JOIN_VISIT: "default",
  MESSAGE_SENT: "secondary",
  PATIENT_ATTESTATION: "success",
  SEAT_ACTIVATED: "success",
  SEAT_DEACTIVATED: "destructive",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch(`/api/audit-logs?page=${page}&search=${encodeURIComponent(search)}`)
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs ?? []);
        setTotal(data.total ?? 0);
        setLoading(false);
      });
  }, [page, search]);

  return (
    <div className="container py-8 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Audit Logs
        </h1>
        <span className="text-sm text-muted-foreground">{total} total entries</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by event type, user..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-4 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No audit logs found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="text-left p-3 font-medium">Time</th>
                    <th className="text-left p-3 font-medium">Event</th>
                    <th className="text-left p-3 font-medium">User</th>
                    <th className="text-left p-3 font-medium">Resource</th>
                    <th className="text-left p-3 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/20">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={(EVENT_COLOR[log.eventType] as "warning" | "success" | "destructive" | "default" | "secondary" | "outline") ?? "secondary"}
                          className="text-xs whitespace-nowrap"
                        >
                          {log.eventType.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {log.member ? (
                          <div>
                            <span className="font-medium">
                              {log.member.firstName} {log.member.lastName}
                            </span>
                            <span className="text-muted-foreground ml-1 text-xs">
                              ({log.member.role})
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs font-mono">
                            {log.clerkUserId.substring(0, 16)}...
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs font-mono">
                        {log.resourceType && log.resourceId
                          ? `${log.resourceType}:${log.resourceId.substring(0, 8)}...`
                          : "—"}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {log.ipAddress ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 50 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(total / 50)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.ceil(total / 50)}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function Button({ children, variant = "default", size = "default", disabled, onClick, className = "" }: {
  children: React.ReactNode;
  variant?: "default" | "outline";
  size?: "sm" | "default";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-input bg-background hover:bg-accent",
  };
  const sizes = { default: "h-10 px-4 py-2 text-sm", sm: "h-9 px-3 text-sm" };
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

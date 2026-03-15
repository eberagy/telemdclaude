"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Users, Calendar, FileText, CreditCard, Shield, ClipboardList, BarChart3, Building2 } from "lucide-react";

const navItems = [
  { href: "/owner/settings", label: "Settings", icon: Settings },
  { href: "/owner/team", label: "Team", icon: Users },
  { href: "/owner/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/owner/employer-groups", label: "Employers", icon: Building2 },
  { href: "/owner/appointment-types", label: "Visit Types", icon: Calendar },
  { href: "/owner/intake-templates", label: "Intake", icon: FileText },
  { href: "/owner/billing", label: "Billing", icon: CreditCard },
  { href: "/owner/risk-controls", label: "Risk Controls", icon: Shield },
  { href: "/owner/audit-logs", label: "Audit Logs", icon: ClipboardList },
];

export function OwnerNavLinks({ variant }: { variant: "sidebar" | "mobile" }) {
  const pathname = usePathname();

  const isSidebar = variant === "sidebar";

  const baseCls = isSidebar
    ? "flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors"
    : "flex items-center gap-2 px-4 py-2.5 text-sm";

  const activeCls = isSidebar
    ? "text-primary font-medium bg-primary/10"
    : "text-primary font-medium";

  const inactiveCls = "text-muted-foreground hover:text-foreground hover:bg-muted";

  return (
    <>
      {navItems.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${baseCls} ${active ? activeCls : inactiveCls}`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Users, MessageSquare } from "lucide-react";

const navItems = [
  { href: "/clinician/schedule", label: "Schedule", icon: Calendar },
  { href: "/clinician/patients", label: "Patients", icon: Users },
  { href: "/clinician/messages", label: "Messages", icon: MessageSquare },
];

export function ClinicianNavLinks({ variant }: { variant: "desktop" | "mobile" }) {
  const pathname = usePathname();

  const isDesktop = variant === "desktop";

  const baseCls = isDesktop
    ? "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors"
    : "flex items-center gap-2 px-4 py-2.5 text-sm";

  const activeCls = isDesktop
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

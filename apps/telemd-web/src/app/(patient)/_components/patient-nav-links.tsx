"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, MessageSquare, User } from "lucide-react";

export function PatientNavLinks({ variant }: { variant: "desktop" | "mobile" }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((me) => {
        if (me.practiceId) return fetch(`/api/messages?practiceId=${me.practiceId}`);
      })
      .then((r) => r?.json())
      .then((data) => {
        if (data?.messages) {
          const count = (
            data.messages as Array<{ senderRole: string; readAt?: string | null }>
          ).filter((m) => m.senderRole !== "Patient" && !m.readAt).length;
          setUnread(count);
        }
      })
      .catch(() => {});
  }, []);

  const isDesktop = variant === "desktop";

  const baseCls = isDesktop
    ? "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors"
    : "flex items-center gap-2 px-4 py-2.5 text-sm";

  const activeCls = isDesktop
    ? "text-primary font-medium bg-primary/10"
    : "text-primary font-medium";

  const inactiveCls = "text-muted-foreground hover:text-foreground hover:bg-muted";

  const navItems = [
    { href: "/patient/appointments", label: "Appointments", icon: Calendar },
    { href: "/patient/messages", label: "Messages", icon: MessageSquare },
    { href: "/patient/profile", label: "Profile", icon: User },
  ];

  return (
    <>
      {navItems.map((item) => {
        const active = pathname.startsWith(item.href);
        const isMessages = item.href === "/patient/messages";
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${baseCls} ${active ? activeCls : inactiveCls}`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
            {isMessages && unread > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[1rem] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}

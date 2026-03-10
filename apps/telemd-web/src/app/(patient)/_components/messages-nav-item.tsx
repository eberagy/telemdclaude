"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

export function MessagesNavItem({ className }: { className: string }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((me) => {
        if (me.practiceId) {
          return fetch(`/api/messages?practiceId=${me.practiceId}`);
        }
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

  return (
    <Link href="/patient/messages" className={className}>
      <MessageSquare className="h-4 w-4" />
      Messages
      {unread > 0 && (
        <span className="ml-1 inline-flex items-center justify-center min-w-[1rem] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

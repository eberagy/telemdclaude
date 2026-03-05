import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, Users, Calendar, FileText, CreditCard, Shield, ClipboardList } from "lucide-react";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const navItems = [
    { href: "/owner/settings", label: "Settings", icon: Settings },
    { href: "/owner/team", label: "Team", icon: Users },
    { href: "/owner/appointment-types", label: "Visit Types", icon: Calendar },
    { href: "/owner/intake-templates", label: "Intake", icon: FileText },
    { href: "/owner/billing", label: "Billing", icon: CreditCard },
    { href: "/owner/risk-controls", label: "Risk Controls", icon: Shield },
    { href: "/owner/audit-logs", label: "Audit Logs", icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-white fixed h-full pt-14 hidden md:block">
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1 md:ml-56">
        {/* Top nav */}
        <nav className="border-b bg-white sticky top-0 z-40 h-14 flex items-center px-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">T</span>
            </div>
            <span className="font-semibold text-sm">TeleMD</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Owner Portal
            </span>
          </div>
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}

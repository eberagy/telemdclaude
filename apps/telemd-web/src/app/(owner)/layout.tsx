import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Settings, Users, Calendar, FileText, CreditCard, Shield, ClipboardList, Menu } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Owner Portal", template: "%s | TeleMD Owner" } };

const navItems = [
  { href: "/owner/settings", label: "Settings", icon: Settings },
  { href: "/owner/team", label: "Team", icon: Users },
  { href: "/owner/appointment-types", label: "Visit Types", icon: Calendar },
  { href: "/owner/intake-templates", label: "Intake", icon: FileText },
  { href: "/owner/billing", label: "Billing", icon: CreditCard },
  { href: "/owner/risk-controls", label: "Risk Controls", icon: Shield },
  { href: "/owner/audit-logs", label: "Audit Logs", icon: ClipboardList },
];

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar — desktop */}
      <aside className="w-56 border-r bg-white fixed h-full pt-14 hidden md:flex flex-col">
        <nav className="p-4 space-y-0.5 flex-1">
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
        <div className="p-4 border-t text-xs text-muted-foreground">
          <p className="font-medium">TeleMD</p>
          <p>Owner Portal</p>
        </div>
      </aside>

      <div className="flex-1 md:ml-56">
        {/* Top bar */}
        <header className="border-b bg-white sticky top-0 z-40 h-14 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">T</span>
            </div>
            <span className="font-semibold text-sm">TeleMD</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full hidden sm:inline">
              Owner Portal
            </span>
          </div>
          <div className="flex items-center gap-2">
            <UserButton afterSignOutUrl="/" />
            {/* Mobile nav */}
            <div className="md:hidden">
              <details className="relative">
                <summary className="list-none cursor-pointer p-2 rounded-md hover:bg-muted">
                  <Menu className="h-5 w-5" />
                </summary>
                <div className="absolute right-0 top-10 w-52 bg-white border rounded-lg shadow-lg py-1 z-50">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}

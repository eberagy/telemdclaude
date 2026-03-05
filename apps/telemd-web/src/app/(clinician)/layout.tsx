import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, Users, MessageSquare, Menu } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

const navItems = [
  { href: "/clinician/schedule", label: "Schedule", icon: Calendar },
  { href: "/clinician/patients", label: "Patients", icon: Users },
  { href: "/clinician/messages", label: "Messages", icon: MessageSquare },
];

export default async function ClinicianLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-white sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14">
          <Link href="/clinician/schedule" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">T</span>
            </div>
            <span className="font-semibold text-sm">TeleMD</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full hidden sm:inline">
              Clinician
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-3 py-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <UserButton afterSignOutUrl="/" />
            {/* Mobile menu toggle */}
            <div className="md:hidden">
              <details className="relative">
                <summary className="list-none cursor-pointer p-2 rounded-md hover:bg-muted">
                  <Menu className="h-5 w-5" />
                </summary>
                <div className="absolute right-0 top-10 w-48 bg-white border rounded-lg shadow-lg py-1 z-50">
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
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}

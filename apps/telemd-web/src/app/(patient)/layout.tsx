import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import type { Metadata } from "next";
import { PatientNavLinks } from "./_components/patient-nav-links";

export const metadata: Metadata = { title: { default: "My Health", template: "%s | TeleMD Patient" } };

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-white sticky top-0 z-40 shadow-sm">
        <div className="container flex items-center justify-between h-14">
          <Link href="/patient/appointments" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">T</span>
            </div>
            <span className="font-semibold text-sm">TeleMD</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <PatientNavLinks variant="desktop" />
          </div>

          <div className="flex items-center gap-2">
            <UserButton afterSignOutUrl="/" />
            {/* Mobile menu */}
            <div className="md:hidden">
              <details className="relative">
                <summary className="list-none cursor-pointer p-2 rounded-md hover:bg-muted">
                  <Menu className="h-5 w-5" />
                </summary>
                <div className="absolute right-0 top-10 w-48 bg-white border rounded-lg shadow-lg py-1 z-50">
                  <PatientNavLinks variant="mobile" />
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

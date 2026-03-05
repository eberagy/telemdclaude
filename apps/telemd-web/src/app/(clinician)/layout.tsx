import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ClinicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Clinician
            </span>
          </Link>
          <div className="flex items-center gap-1 text-sm">
            <Link href="/clinician/schedule" className="nav-link">Schedule</Link>
            <Link href="/clinician/patients" className="nav-link">Patients</Link>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}

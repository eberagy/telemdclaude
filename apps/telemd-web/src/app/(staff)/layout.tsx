import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-white sticky top-0 z-40 h-14 flex items-center px-6 gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">T</span>
          </div>
          <span className="font-semibold text-sm">TeleMD</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Staff</span>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/staff/schedule" className="text-muted-foreground hover:text-foreground">Schedule</Link>
          <Link href="/staff/patients" className="text-muted-foreground hover:text-foreground">Patients</Link>
          <Link href="/staff/messages" className="text-muted-foreground hover:text-foreground">Messages</Link>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}

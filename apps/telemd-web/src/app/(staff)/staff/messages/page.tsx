"use client";

// Staff cannot access patient messages — PHI boundary enforced by API
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Lock, Calendar, Users } from "lucide-react";

export default function StaffMessagesPage() {
  return (
    <div className="container py-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Messages</h1>

      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <strong>Access restricted:</strong> Patient messaging contains PHI and is accessible
        only to clinicians and practice owners. Staff members cannot send or receive patient messages.
        This restriction is enforced at the API level.
      </div>

      <div className="text-center py-8 text-muted-foreground space-y-4">
        <Lock className="h-10 w-10 mx-auto opacity-30" />
        <p className="text-sm max-w-sm mx-auto">
          Staff accounts communicate through the practice admin. For clinical questions,
          contact the clinician directly.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Link href="/staff/schedule">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Go to Schedule
            </Button>
          </Link>
          <Link href="/staff/patients">
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              View Patients
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

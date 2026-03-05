"use client";

// Staff cannot access patient messages — PHI boundary enforced by API
export default function StaffMessagesPage() {
  return (
    <div className="container py-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Messages</h1>

      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <strong>Access restricted:</strong> Patient messaging contains PHI and is accessible
        only to clinicians and practice owners. Staff members cannot send or receive patient messages.
        This restriction is enforced at the API level.
      </div>

      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">
          For scheduling-related communications, please contact the practice owner.
        </p>
      </div>
    </div>
  );
}

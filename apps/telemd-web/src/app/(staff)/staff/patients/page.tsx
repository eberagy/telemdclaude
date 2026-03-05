"use client";

// Staff sees basic scheduling/contact info only — NO clinical data, NO PHI
export default function StaffPatientsPage() {
  return (
    <div className="container py-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Patient Lookup</h1>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Staff access:</strong> You can view appointment scheduling status only.
        Clinical notes, diagnoses, transcripts, and AI summaries are not accessible to staff.
        Contact the clinician or practice owner for clinical information.
      </div>

      <div className="text-center py-16 text-muted-foreground">
        <p className="text-base font-medium">Patient scheduling lookup</p>
        <p className="text-sm mt-1">
          Use the Schedule view to see upcoming appointments by date.
          Patient records require clinical access.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";

interface ClinicianSeat {
  id: string;
  member: { firstName: string; lastName: string; email: string };
  seatStatus: string;
  stripeSubscriptionId?: string;
  seatActivatedAt?: string;
}

export default function OwnerBillingPage() {
  const [seats, setSeats] = useState<ClinicianSeat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/owner/seats")
      .then((r) => r.json())
      .then((data) => { setSeats(data.seats ?? []); setLoading(false); });
  }, []);

  const manageSubscription = async (clinicianId: string, action: "activate" | "deactivate") => {
    await fetch(`/api/owner/seats/${clinicianId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await fetch("/api/owner/seats").then((r) => r.json());
    setSeats(data.seats ?? []);
  };

  const openBillingPortal = async () => {
    const res = await fetch("/api/stripe/billing-portal", { method: "POST" });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      toast.info(data.error === "No billing account found"
        ? "No Stripe account found. Activate a clinician seat to set up billing."
        : "Unable to open billing portal. Please try again.");
    }
  };

  return (
    <div className="container py-8 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Billing & Seats
        </h1>
        <Button variant="outline" onClick={openBillingPortal}>
          Manage Billing Portal
        </Button>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Clinician Seat Subscription</p>
              <p className="text-sm text-muted-foreground">$299/week per active clinician</p>
            </div>
            <Badge variant="success">{seats.filter((s) => s.seatStatus === "ACTIVE").length} Active</Badge>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4">Clinician Seats</h2>
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-20 bg-muted rounded-lg" />)}
          </div>
        ) : seats.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Plus className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No clinicians yet. Invite clinicians from the Team page.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {seats.map((seat) => (
              <Card key={seat.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      Dr. {seat.member.firstName} {seat.member.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{seat.member.email}</p>
                    {seat.seatActivatedAt && (
                      <p className="text-xs text-muted-foreground">
                        Active since {new Date(seat.seatActivatedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {seat.seatStatus === "ACTIVE" ? (
                      <>
                        <div className="flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle className="h-4 w-4" />
                          Active
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => manageSubscription(seat.id, "deactivate")}
                          className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                        >
                          Deactivate
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1 text-amber-600 text-sm">
                          <AlertTriangle className="h-4 w-4" />
                          {seat.seatStatus}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => manageSubscription(seat.id, "activate")}
                        >
                          Activate Seat
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-4">
        <strong>Note:</strong> Inactive clinicians cannot access PHI, appear in scheduling, or host video visits.
        Seat status is enforced server-side on every request.
      </div>
    </div>
  );
}

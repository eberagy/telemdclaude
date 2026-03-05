"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function DemoPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", practice: "", message: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // In production: send via Postmark
    await fetch("/api/demo-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).catch(() => {});
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-white">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="font-bold text-xl">TeleMD</Link>
          <Link href="/sign-in"><Button size="sm" variant="outline">Sign In</Button></Link>
        </div>
      </nav>

      <div className="container py-16 max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Request a Demo</h1>
        <p className="text-muted-foreground mb-8">
          We will walk you through TeleMD and help you get your practice set up.
        </p>

        {submitted ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Request Received</h2>
              <p className="text-muted-foreground">
                We will reach out to {form.email} within 24 hours.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={submit} className="space-y-4">
                {[
                  { name: "name", label: "Your Name", type: "text", placeholder: "Dr. Jane Smith" },
                  { name: "email", label: "Email", type: "email", placeholder: "jane@practice.com" },
                  { name: "practice", label: "Practice Name", type: "text", placeholder: "Smith Family Medicine" },
                ].map((field) => (
                  <div key={field.name}>
                    <label className="text-sm font-medium block mb-1">{field.label}</label>
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      value={form[field.name as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                      required
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-sm font-medium block mb-1">Anything specific you want to see?</label>
                  <textarea
                    rows={3}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="e.g. How does billing work? How does the intake call work?"
                  />
                </div>
                <Button type="submit" className="w-full">Submit Request</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Plus, Pencil, Trash2, X, Check } from "lucide-react";

interface AppointmentType {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  priceInCents: number;
  isActive: boolean;
  intakeTemplate?: { id: string; name: string } | null;
}

interface IntakeTemplate {
  id: string;
  name: string;
}

const emptyForm = {
  name: "",
  description: "",
  durationMinutes: 30,
  priceInCents: 0,
  intakeTemplateId: "",
};

export default function AppointmentTypesPage() {
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [templates, setTemplates] = useState<IntakeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    Promise.all([
      fetch("/api/owner/appointment-types").then((r) => r.json()),
      fetch("/api/owner/intake-templates").then((r) => r.json()),
    ]).then(([typesData, templatesData]) => {
      setTypes(typesData.appointmentTypes ?? []);
      setTemplates(templatesData.templates ?? []);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  };

  const openEdit = (t: AppointmentType) => {
    setEditId(t.id);
    setForm({
      name: t.name,
      description: t.description ?? "",
      durationMinutes: t.durationMinutes,
      priceInCents: t.priceInCents,
      intakeTemplateId: t.intakeTemplate?.id ?? "",
    });
    setError("");
    setShowForm(true);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    const body = {
      ...form,
      intakeTemplateId: form.intakeTemplateId || null,
    };
    const url = editId
      ? `/api/owner/appointment-types/${editId}`
      : "/api/owner/appointment-types";
    const method = editId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to save");
    } else {
      setShowForm(false);
      load();
    }
    setSaving(false);
  };

  const deactivate = async (id: string) => {
    await fetch(`/api/owner/appointment-types/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="container py-8 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          Visit Types
        </h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Visit Type
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">{editId ? "Edit Visit Type" : "New Visit Type"}</p>
              <button onClick={() => setShowForm(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Initial Consultation"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min={15}
                  max={180}
                  step={5}
                  value={form.durationMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, durationMinutes: parseInt(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Price (cents)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.priceInCents}
                  onChange={(e) => setForm((f) => ({ ...f, priceInCents: parseInt(e.target.value) }))}
                  placeholder="e.g. 15000 = $150.00"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Description (optional)</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Intake Template</Label>
                <select
                  value={form.intakeTemplateId}
                  onChange={(e) => setForm((f) => ({ ...f, intakeTemplateId: e.target.value }))}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                >
                  <option value="">None</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={save} disabled={!form.name || saving}>
              <Check className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-20 bg-muted rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {types.filter((t) => t.isActive).map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{t.name}</p>
                    <Badge variant="secondary">{t.durationMinutes}min</Badge>
                    <Badge variant="outline">${(t.priceInCents / 100).toFixed(2)}</Badge>
                  </div>
                  {t.description && (
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                  )}
                  {t.intakeTemplate && (
                    <p className="text-xs text-muted-foreground">
                      Intake: {t.intakeTemplate.name}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => deactivate(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {types.filter((t) => t.isActive).length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Plus className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>No visit types yet. Add one to get started.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

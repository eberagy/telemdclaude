"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Plus, Pencil, Trash2, X, Check, GripVertical } from "lucide-react";

interface IntakeField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface IntakeTemplate {
  id: string;
  name: string;
  fields: IntakeField[];
}

const FIELD_TYPES = ["text", "textarea", "select", "checkbox", "date", "phone"];

const defaultField = (): IntakeField => ({
  key: `field_${Date.now()}`,
  label: "",
  type: "text",
  required: false,
});

export default function IntakeTemplatesPage() {
  const [templates, setTemplates] = useState<IntakeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formFields, setFormFields] = useState<IntakeField[]>([defaultField()]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/owner/intake-templates")
      .then((r) => r.json())
      .then((data) => { setTemplates(data.templates ?? []); setLoading(false); });
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditingId(null);
    setFormName("");
    setFormFields([defaultField()]);
    setError("");
    setShowForm(true);
  };

  const openEdit = (t: IntakeTemplate) => {
    setEditingId(t.id);
    setFormName(t.name);
    setFormFields(t.fields);
    setError("");
    setShowForm(true);
  };

  const addField = () => setFormFields((f) => [...f, defaultField()]);
  const removeField = (idx: number) => setFormFields((f) => f.filter((_, i) => i !== idx));
  const updateField = (idx: number, patch: Partial<IntakeField>) =>
    setFormFields((f) => f.map((field, i) => (i === idx ? { ...field, ...patch } : field)));

  const save = async () => {
    setSaving(true);
    setError("");
    const url = editingId
      ? `/api/owner/intake-templates/${editingId}`
      : "/api/owner/intake-templates";
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: formName, fields: formFields }),
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

  const remove = async (id: string) => {
    await fetch(`/api/owner/intake-templates/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="container py-8 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Intake Templates
        </h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">{editingId ? "Edit Template" : "New Template"}</p>
              <button onClick={() => setShowForm(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-1.5">
              <Label>Template Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Standard Intake"
              />
            </div>

            <div className="space-y-2">
              <Label>Fields</Label>
              {formFields.map((field, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      placeholder="Field label"
                      value={field.label}
                      onChange={(e) => updateField(idx, { label: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                      className="flex-1"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => updateField(idx, { type: e.target.value })}
                      className="border rounded px-2 py-1.5 text-sm bg-background"
                    >
                      {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(idx, { required: e.target.checked })}
                      />
                      Required
                    </label>
                    <button onClick={() => removeField(idx)} className="text-red-500 hover:text-red-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {field.type === "select" && (
                    <Input
                      placeholder="Options (comma-separated)"
                      value={field.options?.join(", ") ?? ""}
                      onChange={(e) =>
                        updateField(idx, { options: e.target.value.split(",").map((s) => s.trim()) })
                      }
                    />
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addField}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Field
              </Button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={save} disabled={!formName || formFields.length === 0 || saving}>
              <Check className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Template"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Template list */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-20 bg-muted rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {t.fields.map((f) => (
                      <Badge key={f.key} variant="secondary" className="text-xs">
                        {f.label} {f.required ? "*" : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => remove(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {templates.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>No templates yet. Create one to attach to visit types.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

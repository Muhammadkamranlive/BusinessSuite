"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { Button, Field, Panel, SelectInput, TextArea, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import type { FormField, FormFieldType } from "@/modules/forms/model";
import { createCustomForm, newFieldId } from "@/modules/forms/services/forms.store";

function blankField(): FormField {
  return { id: newFieldId(), label: "", type: "text", required: false, placeholder: "", help_text: "", options: "" };
}

export default function NewCustomFormPage() {
  const router = useRouter();
  const tenantId = getStoredTenantId() ?? "alpha";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showLetterhead, setShowLetterhead] = useState(true);
  const [fields, setFields] = useState<FormField[]>([
    blankField(),
    { id: newFieldId(), label: "Upload supporting document", type: "file", required: false, help_text: "Optional PDF or image" }
  ]);
  const [error, setError] = useState("");

  const fieldTypes = useMemo(
    () =>
      [
        ["text", "Short text"],
        ["textarea", "Long text"],
        ["number", "Number"],
        ["date", "Date"],
        ["select", "Dropdown"],
        ["checkbox", "Checkbox"],
        ["file", "File upload"]
      ] as Array<[FormFieldType, string]>,
    []
  );

  function updateField(idx: number, patch: Partial<FormField>) {
    setFields((rows) => rows.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  function save(publish: boolean) {
    setError("");
    if (!title.trim()) {
      setError("Form title is required.");
      return;
    }
    const cleaned = fields
      .map((f) => ({ ...f, label: f.label.trim() }))
      .filter((f) => f.label);
    if (!cleaned.length) {
      setError("Add at least one field with a label.");
      return;
    }
    const form = createCustomForm(tenantId, {
      title: title.trim(),
      description: description.trim() || null,
      show_letterhead: showLetterhead,
      fields: cleaned,
      status: publish ? "published" : "draft"
    });
    router.push(`/hrm/forms/${form.id}`);
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader title="New custom form" description="Design fields employees will fill. Include file uploads when you need documents." />
      <ModuleBreadcrumbs trail={[{ label: "Custom forms", href: "/hrm/forms" }, { label: "New" }]} />

      {error ? <p className="mb-4 text-sm font-semibold text-[color:var(--bs-coral)]">{error}</p> : null}

      <Panel className="mb-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Form title" className="md:col-span-2">
            <TextInput required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Benefits enrollment" />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <TextArea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink md:col-span-2">
            <input type="checkbox" checked={showLetterhead} onChange={(e) => setShowLetterhead(e.target.checked)} className="size-4 accent-[color:var(--bs-teal)]" />
            Show company letterhead on this form
          </label>
        </div>
      </Panel>

      <Panel className="mb-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-ink">Fields</h2>
          <Button type="button" variant="secondary" onClick={() => setFields((f) => [...f, blankField()])}>
            Add field
          </Button>
        </div>
        <div className="space-y-4">
          {fields.map((f, idx) => (
            <div key={f.id} className="grid gap-3 rounded-[var(--bs-radius)] border border-line p-3 md:grid-cols-2">
              <Field label="Label">
                <TextInput value={f.label} onChange={(e) => updateField(idx, { label: e.target.value })} />
              </Field>
              <Field label="Type">
                <SelectInput value={f.type} onChange={(e) => updateField(idx, { type: e.target.value as FormFieldType })}>
                  {fieldTypes.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              {f.type === "select" ? (
                <Field label="Options (comma separated)" className="md:col-span-2">
                  <TextInput value={f.options ?? ""} onChange={(e) => updateField(idx, { options: e.target.value })} placeholder="Yes,No,Maybe" />
                </Field>
              ) : null}
              <Field label="Help text" className="md:col-span-2">
                <TextInput value={f.help_text ?? ""} onChange={(e) => updateField(idx, { help_text: e.target.value })} />
              </Field>
              <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={f.required}
                  onChange={(e) => updateField(idx, { required: e.target.checked })}
                  className="size-4 accent-[color:var(--bs-teal)]"
                />
                Required
              </label>
              <div className="flex justify-end">
                <Button type="button" variant="danger" className="!min-h-8 !px-2 !text-xs" onClick={() => setFields((rows) => rows.filter((_, i) => i !== idx))}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => save(true)}>
          Save & publish
        </Button>
        <Button type="button" variant="secondary" onClick={() => save(false)}>
          Save as draft
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/hrm/forms")}>
          Cancel
        </Button>
      </div>
    </AppShell>
  );
}

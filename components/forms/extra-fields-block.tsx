"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Field, SelectInput, TextArea, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { canDesignExtraFields } from "@/lib/employee-menus";
import { cn } from "@/lib/utils";
import {
  EXTRA_FIELD_TYPES,
  blankExtraField,
  buildValueMapFromSchema,
  parseExtraFieldValues,
  stringifyExtraFieldValues,
  type ExtraFieldDef,
  type ExtraFieldType
} from "@/modules/forms/extra-fields";
import { getFormSchema, saveFormSchema, subscribeExtraFields } from "@/modules/forms/services/extra-fields.store";

export function ExtraFieldsBlock({
  formKey,
  valueJson,
  onChange,
  className,
  allowDesign
}: {
  formKey: string;
  valueJson: string;
  onChange: (json: string) => void;
  className?: string;
  allowDesign?: boolean;
}) {
  const tenantId = getStoredTenantId() ?? "alpha";
  const role = getSessionProfile().role;
  const canDesign = (allowDesign ?? true) && canDesignExtraFields(role);
  const [schemaTick, setSchemaTick] = useState(0);
  const schema = useMemo(() => getFormSchema(tenantId, formKey), [tenantId, formKey, schemaTick]);
  const [designing, setDesigning] = useState(false);
  const [draft, setDraft] = useState<ExtraFieldDef[]>(schema);
  const [designError, setDesignError] = useState("");
  const values = parseExtraFieldValues(valueJson);

  useEffect(() => subscribeExtraFields(() => setSchemaTick((t) => t + 1)), []);

  useEffect(() => {
    if (!schema.length) return;
    const next = buildValueMapFromSchema(schema, valueJson);
    const nextJson = stringifyExtraFieldValues(next);
    if (nextJson !== (valueJson || "").trim()) onChange(nextJson);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once schema appears / changes
  }, [schemaTick, schema.length, formKey]);

  function updateValue(field: ExtraFieldDef, raw: string) {
    const next = {
      ...values,
      [field.id]: { label: field.label, type: field.type, value: raw }
    };
    onChange(stringifyExtraFieldValues(next));
  }

  function saveDesign() {
    setDesignError("");
    const cleaned = saveFormSchema(tenantId, formKey, draft);
    if (!cleaned.length && draft.some((f) => f.label.trim())) {
      setDesignError("Each extra field needs a label.");
      return;
    }
    setSchemaTick((t) => t + 1);
    setDesigning(false);
  }

  if (!schema.length && !canDesign && !designing) {
    return null;
  }

  return (
    <div className={cn("md:col-span-full space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">Additional fields</p>
        {canDesign ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setDraft(schema.length ? schema.map((f) => ({ ...f })) : [blankExtraField()]);
              setDesigning((v) => !v);
              setDesignError("");
            }}
          >
            {designing ? "Close designer" : schema.length ? "Modify form" : "Add extra field"}
          </Button>
        ) : null}
      </div>

      {designing ? (
        <div className="space-y-3 rounded-[var(--bs-radius)] border border-line bg-cloud p-3">
          <p className="text-sm text-slate-500">
            Extra fields are saved for this company only. Only HR and administrators can add or change the field list.
            Records store answers as a JSON string.
          </p>
          {designError ? <p className="text-sm text-rose-600">{designError}</p> : null}
          {draft.map((field, idx) => (
            <div key={field.id || idx} className="grid gap-2 rounded-[var(--bs-radius)] border border-line bg-white p-3 md:grid-cols-12">
              <Field label="Label" className="md:col-span-4">
                <TextInput
                  value={field.label}
                  onChange={(e) => setDraft((rows) => rows.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)))}
                  placeholder="e.g. Region"
                />
              </Field>
              <Field label="Type" className="md:col-span-2">
                <SelectInput
                  value={field.type}
                  onChange={(e) =>
                    setDraft((rows) => rows.map((r, i) => (i === idx ? { ...r, type: e.target.value as ExtraFieldType } : r)))
                  }
                >
                  {EXTRA_FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Placeholder" className="md:col-span-3">
                <TextInput
                  value={field.placeholder ?? ""}
                  onChange={(e) => setDraft((rows) => rows.map((r, i) => (i === idx ? { ...r, placeholder: e.target.value } : r)))}
                  placeholder="Hint text"
                />
              </Field>
              <Field label="Default value" className="md:col-span-3">
                <TextInput
                  value={field.default_value ?? ""}
                  onChange={(e) => setDraft((rows) => rows.map((r, i) => (i === idx ? { ...r, default_value: e.target.value } : r)))}
                />
              </Field>
              {field.type === "select" ? (
                <Field label="Options (comma separated)" className="md:col-span-10">
                  <TextInput
                    value={field.options ?? ""}
                    onChange={(e) => setDraft((rows) => rows.map((r, i) => (i === idx ? { ...r, options: e.target.value } : r)))}
                    placeholder="North,South,East,West"
                  />
                </Field>
              ) : (
                <label className="flex items-end gap-2 text-sm font-semibold text-ink md:col-span-10">
                  <input
                    type="checkbox"
                    className="size-4 accent-[color:var(--bs-teal)]"
                    checked={Boolean(field.required)}
                    onChange={(e) => setDraft((rows) => rows.map((r, i) => (i === idx ? { ...r, required: e.target.checked } : r)))}
                  />
                  Required
                </label>
              )}
              <div className="flex items-end md:col-span-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDraft((rows) => rows.filter((_, i) => i !== idx))}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setDraft((rows) => [...rows, blankExtraField()])}>
              Add field
            </Button>
            <Button type="button" onClick={saveDesign}>
              Save form format
            </Button>
          </div>
        </div>
      ) : null}

      {schema.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {schema.map((field) => {
            const current = values[field.id]?.value ?? field.default_value ?? "";
            if (field.type === "textarea") {
              return (
                <Field key={field.id} label={field.label} className="md:col-span-2" hint={field.placeholder}>
                  <TextArea
                    rows={3}
                    required={field.required}
                    placeholder={field.placeholder}
                    value={current}
                    onChange={(e) => updateValue(field, e.target.value)}
                  />
                </Field>
              );
            }
            if (field.type === "select") {
              const options = (field.options || "")
                .split(",")
                .map((o) => o.trim())
                .filter(Boolean);
              return (
                <Field key={field.id} label={field.label}>
                  <SelectInput required={field.required} value={current} onChange={(e) => updateValue(field, e.target.value)}>
                    <option value="">{field.placeholder || "Select…"}</option>
                    {options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
              );
            }
            if (field.type === "checkbox") {
              const checked = current === "true" || current === "1" || current === "yes";
              return (
                <label key={field.id} className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <input
                    type="checkbox"
                    className="size-4 accent-[color:var(--bs-teal)]"
                    checked={checked}
                    onChange={(e) => updateValue(field, e.target.checked ? "true" : "false")}
                  />
                  {field.label}
                </label>
              );
            }
            return (
              <Field key={field.id} label={field.label}>
                <TextInput
                  type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  required={field.required}
                  placeholder={field.placeholder}
                  value={current}
                  onChange={(e) => updateValue(field, e.target.value)}
                />
              </Field>
            );
          })}
        </div>
      ) : !designing ? (
        <p className="text-sm text-slate-500">
          {canDesign
            ? "No extra fields for this company yet. Click Add extra field to extend this form."
            : "No extra fields for this company yet. Ask HR or an administrator to add them."}
        </p>
      ) : null}
    </div>
  );
}

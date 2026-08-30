"use client";

import { parseExtraFieldValues } from "@/modules/forms/extra-fields";
import { getExtraFieldValues } from "@/modules/forms/services/extra-fields.store";
import type { UUID } from "@/modules/core/types";

export function ExtraFieldsReadout({
  tenantId,
  formKey,
  recordId,
  json,
  className
}: {
  tenantId: UUID;
  formKey: string;
  recordId?: UUID | null;
  json?: string | null;
  className?: string;
}) {
  const raw = json ?? (recordId ? getExtraFieldValues(tenantId, formKey, recordId) : "");
  const map = parseExtraFieldValues(raw);
  const entries = Object.values(map).filter((e) => String(e.value ?? "").trim() && e.value !== "false");
  if (!entries.length) return null;

  return (
    <dl className={className ?? "mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2"}>
      {entries.map((e) => (
        <div key={`${e.label}-${e.value}`} className="rounded-[var(--bs-radius)] border border-line bg-cloud px-2 py-1">
          <dt className="font-semibold text-ink">{e.label}</dt>
          <dd>{e.type === "checkbox" ? (e.value === "true" ? "Yes" : "No") : e.value}</dd>
        </div>
      ))}
    </dl>
  );
}

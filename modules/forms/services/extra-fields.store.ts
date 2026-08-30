import type { UUID } from "@/modules/core/types";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";
import type { ExtraFieldDef } from "@/modules/forms/extra-fields";
import { extraFieldValuesAreEmpty } from "@/modules/forms/extra-fields";

const SCHEMA_KEY = "businesssuite:extra-form-schemas:v1";
const VALUES_KEY = "businesssuite:extra-field-values:v1";

type SchemaRow = {
  tenant_id: UUID;
  form_key: string;
  fields: ExtraFieldDef[];
  updated_at: string;
};

type ValueRow = {
  tenant_id: UUID;
  form_key: string;
  record_id: UUID;
  extra_fields_json: string;
  updated_at: string;
};

function now() {
  return new Date().toISOString();
}

function loadSchemas(): SchemaRow[] {
  return loadPersisted<SchemaRow[]>(SCHEMA_KEY) ?? [];
}

function saveSchemas(rows: SchemaRow[]) {
  savePersisted(SCHEMA_KEY, rows);
}

function loadValues(): ValueRow[] {
  return loadPersisted<ValueRow[]>(VALUES_KEY) ?? [];
}

function saveValues(rows: ValueRow[]) {
  savePersisted(VALUES_KEY, rows);
}

export function getFormSchema(tenantId: UUID, formKey: string): ExtraFieldDef[] {
  return loadSchemas().find((r) => r.tenant_id === tenantId && r.form_key === formKey)?.fields ?? [];
}

export function saveFormSchema(tenantId: UUID, formKey: string, fields: ExtraFieldDef[]) {
  const cleaned = fields
    .map((f) => ({
      ...f,
      id: f.id || `ef_${crypto.randomUUID().slice(0, 8)}`,
      label: (f.label || "").trim(),
      placeholder: (f.placeholder || "").trim(),
      default_value: (f.default_value || "").trim(),
      options: (f.options || "").trim()
    }))
    .filter((f) => f.label);
  const rows = loadSchemas().filter((r) => !(r.tenant_id === tenantId && r.form_key === formKey));
  rows.unshift({ tenant_id: tenantId, form_key: formKey, fields: cleaned, updated_at: now() });
  saveSchemas(rows);
  return cleaned;
}

export function listTenantFormSchemas(tenantId: UUID) {
  return loadSchemas().filter((r) => r.tenant_id === tenantId);
}

export function getExtraFieldValues(tenantId: UUID, formKey: string, recordId: UUID): string {
  return loadValues().find((r) => r.tenant_id === tenantId && r.form_key === formKey && r.record_id === recordId)?.extra_fields_json ?? "";
}

export function saveExtraFieldValues(tenantId: UUID, formKey: string, recordId: UUID, extra_fields_json: string) {
  const json = (extra_fields_json || "").trim();
  const rows = loadValues().filter((r) => !(r.tenant_id === tenantId && r.form_key === formKey && r.record_id === recordId));
  if (json && json !== "{}" && !extraFieldValuesAreEmpty(json)) {
    rows.unshift({ tenant_id: tenantId, form_key: formKey, record_id: recordId, extra_fields_json: json, updated_at: now() });
  }
  saveValues(rows.slice(0, 5000));
  return json;
}

/** Persist extra field JSON after create/update. No-op when empty. */
export function persistExtraFields(tenantId: UUID, formKey: string, recordId: UUID | null | undefined, extra_fields_json: string) {
  if (!recordId) return;
  saveExtraFieldValues(tenantId, formKey, recordId, extra_fields_json);
}

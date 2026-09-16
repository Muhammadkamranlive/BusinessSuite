import type { UUID } from "@/modules/core/types";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";
import type { ExtraFieldDef } from "@/modules/forms/extra-fields";
import { extraFieldValuesAreEmpty } from "@/modules/forms/extra-fields";
import type { ExtraFieldsRemoteSnapshot } from "@/modules/forms/services/extra-fields.supabase-sync";

const SCHEMA_KEY = "businesssuite:extra-form-schemas:v1";
const VALUES_KEY = "businesssuite:extra-field-values:v1";
const EVENT = "businesssuite:extra-fields-changed";

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

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let pendingTenantId: string | undefined;

function now() {
  return new Date().toISOString();
}

function loadSchemas(): SchemaRow[] {
  return loadPersisted<SchemaRow[]>(SCHEMA_KEY) ?? [];
}

function saveSchemas(rows: SchemaRow[]) {
  savePersisted(SCHEMA_KEY, rows);
  emitChange();
}

function loadValues(): ValueRow[] {
  return loadPersisted<ValueRow[]>(VALUES_KEY) ?? [];
}

function saveValues(rows: ValueRow[]) {
  savePersisted(VALUES_KEY, rows);
  emitChange();
}

function emitChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT));
  }
}

function isClientSyncEnabled() {
  return process.env.NEXT_PUBLIC_EXTRA_FIELDS_USE_SUPABASE !== "false";
}

export function buildExtraFieldsSnapshot(tenantId?: string): ExtraFieldsRemoteSnapshot {
  const schemas = loadSchemas().filter((r) => !tenantId || r.tenant_id === tenantId);
  const values = loadValues().filter((r) => !tenantId || r.tenant_id === tenantId);
  return {
    version: 1,
    tenantId,
    schemas,
    values
  };
}

/** Debounced push of tenant (or all) extra-field schemas + values to Postgres. */
export function queueExtraFieldsRemoteSync(tenantId?: string, immediate = false) {
  if (typeof window === "undefined") return;
  if (!isClientSyncEnabled()) return;

  if (tenantId) pendingTenantId = tenantId;

  const push = () => {
    const tid = pendingTenantId;
    pendingTenantId = undefined;
    const snapshot = buildExtraFieldsSnapshot(tid);
    void fetch("/api/extra-fields/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot)
    }).catch(() => {
      /* offline */
    });
  };

  if (immediate) {
    if (syncTimer) clearTimeout(syncTimer);
    push();
    return;
  }

  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(push, 900);
}

/** Pull company-wise schemas + values from Postgres — DB wins for that tenant. */
export async function pullExtraFieldsFromSupabase(tenantId: string) {
  if (typeof window === "undefined") return false;
  if (!isClientSyncEnabled()) return false;
  const qs = `?tenantId=${encodeURIComponent(tenantId)}`;
  try {
    const res = await fetch(`/api/extra-fields/sync${qs}`);
    const json = (await res.json()) as {
      ok?: boolean;
      skipped?: boolean;
      snapshot?: ExtraFieldsRemoteSnapshot;
    };
    if (!json.ok || json.skipped || !json.snapshot) return false;

    const otherSchemas = loadSchemas().filter((r) => r.tenant_id !== tenantId);
    saveSchemas([...json.snapshot.schemas, ...otherSchemas]);

    const otherValues = loadValues().filter((r) => r.tenant_id !== tenantId);
    saveValues([...json.snapshot.values, ...otherValues].slice(0, 5000));
    return true;
  } catch {
    return false;
  }
}

export function subscribeExtraFields(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
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
  queueExtraFieldsRemoteSync(tenantId);
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
  queueExtraFieldsRemoteSync(tenantId);
  return json;
}

/** Persist extra field JSON after create/update. No-op when empty. */
export function persistExtraFields(tenantId: UUID, formKey: string, recordId: UUID | null | undefined, extra_fields_json: string) {
  if (!recordId) return;
  saveExtraFieldValues(tenantId, formKey, recordId, extra_fields_json);
}

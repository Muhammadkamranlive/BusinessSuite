import type { ExtraFieldDef } from "@/modules/forms/extra-fields";
import { getSupabaseAdminClient, hasSecretKey } from "@/lib/supabase/server";
import { toDbTenantId, toUiTenantId } from "@/lib/tenants/ids";

export type ExtraFormSchemaRemote = {
  tenant_id: string;
  form_key: string;
  fields: ExtraFieldDef[];
  updated_at: string;
};

export type ExtraFieldValueRemote = {
  tenant_id: string;
  form_key: string;
  record_id: string;
  extra_fields_json: string;
  updated_at: string;
};

export type ExtraFieldsRemoteSnapshot = {
  version: number;
  /** When set, reconcile deletes for this tenant (rows not in snapshot are removed). */
  tenantId?: string;
  schemas: ExtraFormSchemaRemote[];
  values: ExtraFieldValueRemote[];
};

export function isExtraFieldsSupabaseSyncEnabled() {
  return hasSecretKey() && process.env.NEXT_PUBLIC_EXTRA_FIELDS_USE_SUPABASE !== "false";
}

function schemaToDb(row: ExtraFormSchemaRemote): Record<string, unknown> {
  return {
    tenant_id: toDbTenantId(row.tenant_id),
    form_key: row.form_key,
    fields: row.fields ?? [],
    updated_at: row.updated_at || new Date().toISOString()
  };
}

function schemaFromDb(row: Record<string, unknown>): ExtraFormSchemaRemote {
  return {
    tenant_id: toUiTenantId(String(row.tenant_id)),
    form_key: String(row.form_key),
    fields: (Array.isArray(row.fields) ? row.fields : []) as ExtraFieldDef[],
    updated_at: String(row.updated_at ?? new Date().toISOString())
  };
}

function valueToDb(row: ExtraFieldValueRemote): Record<string, unknown> {
  let json: unknown = {};
  try {
    json = row.extra_fields_json ? JSON.parse(row.extra_fields_json) : {};
  } catch {
    json = {};
  }
  return {
    tenant_id: toDbTenantId(row.tenant_id),
    form_key: row.form_key,
    record_id: String(row.record_id),
    extra_fields_json: json,
    updated_at: row.updated_at || new Date().toISOString()
  };
}

function valueFromDb(row: Record<string, unknown>): ExtraFieldValueRemote {
  const raw = row.extra_fields_json;
  const extra_fields_json =
    typeof raw === "string" ? raw : JSON.stringify(raw ?? {});
  return {
    tenant_id: toUiTenantId(String(row.tenant_id)),
    form_key: String(row.form_key),
    record_id: String(row.record_id),
    extra_fields_json,
    updated_at: String(row.updated_at ?? new Date().toISOString())
  };
}

async function reconcileDeletes(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  snapshot: ExtraFieldsRemoteSnapshot,
  uiTenantId: string,
  errors: string[]
) {
  const dbTenantId = toDbTenantId(uiTenantId);
  const keepSchemaKeys = new Set(
    snapshot.schemas.filter((s) => s.tenant_id === uiTenantId).map((s) => s.form_key)
  );
  const keepValueKeys = new Set(
    snapshot.values
      .filter((v) => v.tenant_id === uiTenantId)
      .map((v) => `${v.form_key}::${v.record_id}`)
  );

  const { data: existingSchemas, error: schemaListErr } = await admin
    .from("extra_form_schemas")
    .select("form_key")
    .eq("tenant_id", dbTenantId);
  if (schemaListErr) {
    errors.push(`extra_form_schemas list: ${schemaListErr.message}`);
  } else {
    for (const row of existingSchemas ?? []) {
      const formKey = String((row as { form_key: string }).form_key);
      if (!keepSchemaKeys.has(formKey)) {
        const { error } = await admin
          .from("extra_form_schemas")
          .delete()
          .eq("tenant_id", dbTenantId)
          .eq("form_key", formKey);
        if (error) errors.push(`extra_form_schemas delete ${formKey}: ${error.message}`);
      }
    }
  }

  const { data: existingValues, error: valueListErr } = await admin
    .from("extra_field_values")
    .select("form_key, record_id")
    .eq("tenant_id", dbTenantId);
  if (valueListErr) {
    errors.push(`extra_field_values list: ${valueListErr.message}`);
  } else {
    for (const row of existingValues ?? []) {
      const formKey = String((row as { form_key: string }).form_key);
      const recordId = String((row as { record_id: string }).record_id);
      if (!keepValueKeys.has(`${formKey}::${recordId}`)) {
        const { error } = await admin
          .from("extra_field_values")
          .delete()
          .eq("tenant_id", dbTenantId)
          .eq("form_key", formKey)
          .eq("record_id", recordId);
        if (error) errors.push(`extra_field_values delete ${formKey}/${recordId}: ${error.message}`);
      }
    }
  }
}

export async function pushExtraFieldsSnapshot(snapshot: ExtraFieldsRemoteSnapshot) {
  if (!isExtraFieldsSupabaseSyncEnabled()) {
    return { ok: false as const, reason: "Supabase secret key missing or extra-fields sync disabled" };
  }

  const admin = getSupabaseAdminClient();
  const errors: string[] = [];

  if (snapshot.schemas?.length) {
    const { error } = await admin.from("extra_form_schemas").upsert(snapshot.schemas.map(schemaToDb), {
      onConflict: "tenant_id,form_key"
    });
    if (error) errors.push(`extra_form_schemas upsert: ${error.message}`);
  }

  if (snapshot.values?.length) {
    const { error } = await admin.from("extra_field_values").upsert(snapshot.values.map(valueToDb), {
      onConflict: "tenant_id,form_key,record_id"
    });
    if (error) errors.push(`extra_field_values upsert: ${error.message}`);
  }

  if (snapshot.tenantId) {
    await reconcileDeletes(admin, snapshot, snapshot.tenantId, errors);
  }

  if (errors.length) {
    return { ok: false as const, reason: errors.join("; ") };
  }
  return { ok: true as const };
}

export async function pullExtraFieldsSnapshot(uiTenantId?: string): Promise<{
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  snapshot?: ExtraFieldsRemoteSnapshot;
}> {
  if (!isExtraFieldsSupabaseSyncEnabled()) {
    return {
      ok: false,
      skipped: true,
      reason: "Extra-fields Supabase sync is off. Set SUPABASE_SECRET_KEY."
    };
  }

  const admin = getSupabaseAdminClient();
  const dbTenantId = uiTenantId ? toDbTenantId(uiTenantId) : undefined;

  let schemaQuery = admin.from("extra_form_schemas").select("*");
  let valueQuery = admin.from("extra_field_values").select("*");
  if (dbTenantId) {
    schemaQuery = schemaQuery.eq("tenant_id", dbTenantId);
    valueQuery = valueQuery.eq("tenant_id", dbTenantId);
  }

  const [schemasRes, valuesRes] = await Promise.all([schemaQuery, valueQuery]);
  if (schemasRes.error) {
    return { ok: false, reason: `extra_form_schemas: ${schemasRes.error.message}` };
  }
  if (valuesRes.error) {
    return { ok: false, reason: `extra_field_values: ${valuesRes.error.message}` };
  }

  return {
    ok: true,
    snapshot: {
      version: 1,
      tenantId: uiTenantId,
      schemas: (schemasRes.data ?? []).map((r) => schemaFromDb(r as Record<string, unknown>)),
      values: (valuesRes.data ?? []).map((r) => valueFromDb(r as Record<string, unknown>))
    }
  };
}

import { getSupabaseAdminClient, hasSecretKey } from "@/lib/supabase/server";
import { toDbTenantId, toUiTenantId } from "@/lib/tenants/ids";
import type { BiSnapshotRecord } from "@/modules/reporting/services/snapshots.store";

export type BiRemoteSnapshot = {
  version: number;
  tenantId?: string;
  snapshots: BiSnapshotRecord[];
};

export function isBiSupabaseSyncEnabled() {
  return hasSecretKey() && process.env.NEXT_PUBLIC_BI_USE_SUPABASE !== "false";
}

function toDb(row: BiSnapshotRecord) {
  return {
    id: row.id,
    tenant_id: toDbTenantId(row.tenantId),
    domain: row.domain,
    title: row.title,
    generated_at: row.generatedAt,
    generated_by: null,
    kpi_json: row.kpiJson ?? {},
    payload_json: {},
    branding_json: { legalName: row.brandingName },
    is_active: true
  };
}

function fromDb(row: Record<string, unknown>): BiSnapshotRecord {
  const branding =
    row.branding_json && typeof row.branding_json === "object"
      ? (row.branding_json as { legalName?: string })
      : {};
  return {
    id: String(row.id),
    tenantId: toUiTenantId(String(row.tenant_id)),
    domain: String(row.domain) as BiSnapshotRecord["domain"],
    title: String(row.title),
    generatedAt: String(row.generated_at ?? row.created_at ?? new Date().toISOString()),
    kpiJson: (row.kpi_json as BiSnapshotRecord["kpiJson"]) ?? {},
    brandingName: branding.legalName ?? ""
  };
}

export async function pushBiSnapshot(snapshot: BiRemoteSnapshot) {
  if (!isBiSupabaseSyncEnabled()) {
    return { ok: false as const, reason: "Supabase secret key missing or BI sync disabled" };
  }
  if (!snapshot.snapshots?.length) return { ok: true as const };
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("bi_report_snapshots").upsert(snapshot.snapshots.map(toDb), { onConflict: "id" });
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}

export async function pullBiSnapshot(uiTenantId?: string): Promise<{
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  snapshot?: BiRemoteSnapshot;
}> {
  if (!isBiSupabaseSyncEnabled()) {
    return { ok: false, skipped: true, reason: "BI Supabase sync is off. Set SUPABASE_SECRET_KEY." };
  }
  const admin = getSupabaseAdminClient();
  let query = admin.from("bi_report_snapshots").select("*").eq("is_active", true);
  if (uiTenantId) query = query.eq("tenant_id", toDbTenantId(uiTenantId));
  const { data, error } = await query;
  if (error) return { ok: false, reason: error.message };
  return {
    ok: true,
    snapshot: {
      version: 1,
      tenantId: uiTenantId,
      snapshots: (data ?? []).map((r) => fromDb(r as Record<string, unknown>))
    }
  };
}

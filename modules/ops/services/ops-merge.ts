import type { OpsRemoteSnapshot } from "@/modules/ops/services/ops.supabase-sync";

type TenantRow = { tenant_id?: string };

/** Merge a tenant-scoped pull into a full snapshot without wiping other tenants or empty remotes. */
export function mergeOpsPull(
  current: OpsRemoteSnapshot,
  pulled: OpsRemoteSnapshot,
  uiTenantId?: string
): OpsRemoteSnapshot {
  if (!uiTenantId) return pulled;

  const merged = { ...current, version: current.version ?? pulled.version ?? 3 } as OpsRemoteSnapshot;
  const keys = Object.keys(pulled) as (keyof OpsRemoteSnapshot)[];

  for (const key of keys) {
    if (key === "version") continue;
    const incoming = pulled[key] as TenantRow[] | undefined;
    if (!Array.isArray(incoming) || incoming.length === 0) continue;

    const existing = (current[key] ?? []) as TenantRow[];
    merged[key] = [...existing.filter((row) => row.tenant_id !== uiTenantId), ...incoming] as never;
  }

  return merged;
}

export function remoteHrmHasRows(snapshot: {
  employees?: unknown[];
  departments?: unknown[];
}): boolean {
  return (snapshot.employees?.length ?? 0) > 0 || (snapshot.departments?.length ?? 0) > 0;
}

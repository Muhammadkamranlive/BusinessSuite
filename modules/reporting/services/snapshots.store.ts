import type { UUID } from "@/modules/core/types";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";
import { getStoredTenantId } from "@/lib/auth/session";
import type { ReportDomain, TenantWarehouseSnapshot } from "@/modules/reporting/model";
import type { BiRemoteSnapshot } from "@/modules/reporting/services/snapshots.supabase-sync";

const STORAGE_KEY = "businesssuite:bi-snapshots:v1";

export type BiSnapshotRecord = {
  id: UUID;
  tenantId: UUID;
  domain: ReportDomain;
  title: string;
  generatedAt: string;
  kpiJson: TenantWarehouseSnapshot["kpis"];
  brandingName: string;
};

let syncTimer: ReturnType<typeof setTimeout> | null = null;

function syncEnabled() {
  return process.env.NEXT_PUBLIC_BI_USE_SUPABASE !== "false";
}

function loadAll(): BiSnapshotRecord[] {
  return loadPersisted<BiSnapshotRecord[]>(STORAGE_KEY) ?? [];
}

function saveAll(rows: BiSnapshotRecord[]) {
  savePersisted(STORAGE_KEY, rows);
  queueBiRemoteSync();
}

function queueBiRemoteSync(immediate = false) {
  if (typeof window === "undefined" || !syncEnabled()) return;
  const push = () => {
    const tenantId = getStoredTenantId() ?? undefined;
    const snapshot: BiRemoteSnapshot = {
      version: 1,
      tenantId,
      snapshots: tenantId ? loadAll().filter((r) => r.tenantId === tenantId) : loadAll()
    };
    void fetch("/api/bi/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot)
    }).catch(() => undefined);
  };
  if (immediate) {
    if (syncTimer) clearTimeout(syncTimer);
    push();
    return;
  }
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(push, 800);
}

export async function pullBiFromSupabase(tenantId: string) {
  if (typeof window === "undefined" || !syncEnabled()) return false;
  try {
    const res = await fetch(`/api/bi/sync?tenantId=${encodeURIComponent(tenantId)}`);
    const json = (await res.json()) as { ok?: boolean; skipped?: boolean; snapshot?: BiRemoteSnapshot };
    if (!json.ok || json.skipped || !json.snapshot) return false;
    const others = loadAll().filter((r) => r.tenantId !== tenantId);
    savePersisted(STORAGE_KEY, [...json.snapshot.snapshots, ...others].slice(0, 50));
    return true;
  } catch {
    return false;
  }
}

export function listBiSnapshots(tenantId: UUID) {
  return loadAll()
    .filter((r) => r.tenantId === tenantId)
    .sort((a, b) => (a.generatedAt < b.generatedAt ? 1 : -1));
}

export function saveBiSnapshot(wh: TenantWarehouseSnapshot, domain: ReportDomain, title: string) {
  const row: BiSnapshotRecord = {
    id: crypto.randomUUID(),
    tenantId: wh.tenantId,
    domain,
    title,
    generatedAt: new Date().toISOString(),
    kpiJson: wh.kpis,
    brandingName: wh.branding.legalName
  };
  saveAll([row, ...loadAll()].slice(0, 50));
  return row;
}

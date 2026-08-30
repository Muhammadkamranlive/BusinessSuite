import type { UUID } from "@/modules/core/types";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";
import type { ReportDomain, TenantWarehouseSnapshot } from "@/modules/reporting/model";

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

function loadAll(): BiSnapshotRecord[] {
  return loadPersisted<BiSnapshotRecord[]>(STORAGE_KEY) ?? [];
}

function saveAll(rows: BiSnapshotRecord[]) {
  savePersisted(STORAGE_KEY, rows);
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

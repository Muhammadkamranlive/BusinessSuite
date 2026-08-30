import type { TenantEntity, UUID } from "@/modules/core/types";
import { logCreate } from "@/modules/core/services/audit.service";
import { bindTrashRestore, trashEntityInCollection, updateEntityInCollection } from "@/modules/core/services/entity-crud";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";
import { catalogSpecs, getCatalogSpec } from "@/modules/catalog/catalog-registry";
import { queueOpsRemoteSync, registerOpsModule } from "@/modules/ops/services/ops-remote";

function now() {
  return new Date().toISOString();
}
function id() {
  return crypto.randomUUID();
}

export type CatalogRow = TenantEntity & Record<string, unknown> & {
  status: string;
};

const STORAGE_KEY = "businesssuite:catalog:v1";
const STORAGE_VERSION = 1;

let tables: Record<string, CatalogRow[]> = {};
const refsReady = new Set<string>();
let hydrated = false;

function persist() {
  savePersisted(STORAGE_KEY, { version: STORAGE_VERSION, tables });
  queueOpsRemoteSync();
}

function flattenForRemote(): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const [slug, rows] of Object.entries(tables)) {
    for (const row of rows) {
      const { id, tenant_id, created_at, updated_at, is_active, status, ...payload } = row;
      out.push({
        id,
        tenant_id,
        slug,
        status: String(status ?? "active"),
        payload,
        is_active: is_active !== false,
        created_at,
        updated_at: updated_at ?? created_at
      });
    }
  }
  return out;
}

function inflateFromRemote(rows: Record<string, unknown>[]) {
  const next: Record<string, CatalogRow[]> = {};
  for (const spec of catalogSpecs) next[spec.slug] = [];
  for (const raw of rows) {
    const slug = String(raw.slug ?? "");
    if (!slug) continue;
    const payload =
      raw.payload && typeof raw.payload === "object" && !Array.isArray(raw.payload)
        ? (raw.payload as Record<string, unknown>)
        : {};
    const row: CatalogRow = {
      ...payload,
      id: String(raw.id),
      tenant_id: String(raw.tenant_id),
      created_at: String(raw.created_at ?? new Date().toISOString()),
      updated_at: raw.updated_at ? String(raw.updated_at) : null,
      is_active: raw.is_active !== false,
      status: String(raw.status ?? "active")
    };
    next[slug] = [row, ...(next[slug] ?? [])];
  }
  tables = next;
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  const snap = loadPersisted<{ version: number; tables: Record<string, CatalogRow[]> }>(STORAGE_KEY);
  if (snap?.version === STORAGE_VERSION && snap.tables) tables = snap.tables;
  for (const spec of catalogSpecs) {
    if (!tables[spec.slug]) tables[spec.slug] = [];
    bindSlug(spec.slug, spec.module, spec.entityName);
  }
}

function bindSlug(slug: string, module: string, entityName: string) {
  if (refsReady.has(slug)) return;
  refsReady.add(slug);
  bindTrashRestore({
    get: () => tables[slug] ?? [],
    set: (rows) => {
      tables[slug] = rows;
    },
    persist,
    module,
    entityName,
    labelOf: (row) => String(row.name ?? row.full_name ?? row.code ?? row.mrn ?? row.id)
  });
}

function ref(slug: string) {
  const spec = getCatalogSpec(slug);
  if (!spec) throw new Error(`Unknown catalog ${slug}`);
  ensureHydrated();
  bindSlug(slug, spec.module, spec.entityName);
  return {
    get: () => tables[slug] ?? [],
    set: (rows: CatalogRow[]) => {
      tables[slug] = rows;
    },
    persist,
    module: spec.module,
    entityName: spec.entityName,
    labelOf: (row: CatalogRow) => String(row.name ?? row.full_name ?? row.code ?? row.mrn ?? row.id)
  };
}

export function listCatalog(slug: string, tenantId: UUID): CatalogRow[] {
  ensureHydrated();
  return (tables[slug] ?? []).filter((r) => r.tenant_id === tenantId && r.is_active !== false);
}

export function createCatalog(slug: string, tenantId: UUID, data: Record<string, unknown>): CatalogRow {
  ensureHydrated();
  const spec = getCatalogSpec(slug);
  if (!spec) throw new Error(`Unknown catalog ${slug}`);
  const row: CatalogRow = {
    ...data,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    status: String(data.status ?? spec.statusOptions[0] ?? "active")
  };
  tables[slug] = [row, ...(tables[slug] ?? [])];
  persist();
  logCreate({ tenantId, module: spec.module, entityName: spec.entityName, entityId: row.id, newData: row });
  return row;
}

export function updateCatalog(slug: string, rowId: UUID, data: Partial<CatalogRow>) {
  ensureHydrated();
  return updateEntityInCollection(ref(slug), rowId, data);
}

export function trashCatalog(slug: string, rowId: UUID) {
  ensureHydrated();
  return trashEntityInCollection(ref(slug), rowId);
}

registerOpsModule({
  build: () => {
    ensureHydrated();
    return { catalogRecords: flattenForRemote() };
  },
  apply: (snapshot) => {
    ensureHydrated();
    if (!snapshot.catalogRecords) return;
    const incoming = snapshot.catalogRecords;
    const hasLocal = Object.values(tables).some((rows) => rows.length > 0);
    if (incoming.length === 0 && hasLocal) return;
    inflateFromRemote(incoming);
    savePersisted(STORAGE_KEY, { version: STORAGE_VERSION, tables });
  }
});

import type { UUID } from "@/modules/core/types";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";
import { logAction, logDelete } from "@/modules/core/services/audit.service";
import { getStoredUserEmail } from "@/lib/auth/session";

const STORAGE_KEY = "businesssuite:recycle-bin:v1";

/**
 * Dual recycle bin model:
 * - Module users see items until they clear them from their module bin.
 * - Clearing from a module bin keeps the item for Administration recycle bin.
 * - Only admin permanent purge / empty removes the row forever.
 */
export type TrashItem = {
  id: UUID;
  tenant_id: UUID;
  module: string;
  entity_name: string;
  entity_id: UUID;
  label: string;
  snapshot: Record<string, unknown>;
  deleted_at: string;
  deleted_by?: string | null;
  /** When set, hidden from module recycle bin but still in admin bin. */
  module_cleared_at?: string | null;
  module_cleared_by?: string | null;
};

export type TrashAudience = "module" | "admin";

type RestoreHandler = (snapshot: Record<string, unknown>) => boolean;

const restoreHandlers = new Map<string, RestoreHandler>();

function handlerKey(module: string, entityName: string) {
  return `${module}:${entityName}`;
}

export function registerRestoreHandler(module: string, entityName: string, handler: RestoreHandler) {
  restoreHandlers.set(handlerKey(module, entityName), handler);
}

function now() {
  return new Date().toISOString();
}

function loadAll(): TrashItem[] {
  return loadPersisted<TrashItem[]>(STORAGE_KEY) ?? [];
}

function saveAll(rows: TrashItem[]) {
  savePersisted(STORAGE_KEY, rows.slice(0, 2000));
}

export function listTrash(
  tenantId: UUID,
  opts?: { module?: string; entityName?: string; search?: string; audience?: TrashAudience }
) {
  const audience = opts?.audience ?? "admin";
  let rows = loadAll().filter((r) => r.tenant_id === tenantId);

  if (audience === "module") {
    rows = rows.filter((r) => !r.module_cleared_at);
  }

  if (opts?.module) rows = rows.filter((r) => r.module === opts.module);
  if (opts?.entityName) rows = rows.filter((r) => r.entity_name === opts.entityName);
  if (opts?.search?.trim()) {
    const q = opts.search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.module.toLowerCase().includes(q) ||
        r.entity_name.toLowerCase().includes(q) ||
        r.entity_id.toLowerCase().includes(q)
    );
  }
  return rows.sort((a, b) => (a.deleted_at < b.deleted_at ? 1 : -1));
}

export function getTrashItem(id: UUID) {
  return loadAll().find((r) => r.id === id) ?? null;
}

export function isInTrash(tenantId: UUID, module: string, entityName: string, entityId: UUID) {
  return loadAll().some(
    (r) =>
      r.tenant_id === tenantId &&
      r.module === module &&
      r.entity_name === entityName &&
      r.entity_id === entityId &&
      !r.module_cleared_at
  );
}

/** Move a record snapshot into the tenant recycle bin (visible in module + admin). */
export function moveToTrash(params: {
  tenantId: UUID;
  module: string;
  entityName: string;
  entityId: UUID;
  label: string;
  snapshot: Record<string, unknown>;
}) {
  const rows = loadAll().filter(
    (r) =>
      !(
        r.tenant_id === params.tenantId &&
        r.module === params.module &&
        r.entity_name === params.entityName &&
        r.entity_id === params.entityId
      )
  );
  const item: TrashItem = {
    id: crypto.randomUUID(),
    tenant_id: params.tenantId,
    module: params.module,
    entity_name: params.entityName,
    entity_id: params.entityId,
    label: params.label,
    snapshot: params.snapshot,
    deleted_at: now(),
    deleted_by: getStoredUserEmail(),
    module_cleared_at: null,
    module_cleared_by: null
  };
  rows.unshift(item);
  saveAll(rows);
  logDelete({
    tenantId: params.tenantId,
    module: params.module,
    entityName: params.entityName,
    entityId: params.entityId,
    oldData: params.snapshot
  });
  return item;
}

export function restoreTrashItem(trashId: UUID) {
  const rows = loadAll();
  const item = rows.find((r) => r.id === trashId);
  if (!item) return { ok: false as const, error: "Item not found in recycle bin." };
  const handler = restoreHandlers.get(handlerKey(item.module, item.entity_name));
  if (!handler) {
    return { ok: false as const, error: `No restore handler for ${item.module}.${item.entity_name}.` };
  }
  const snapshot = { ...item.snapshot, is_active: true, updated_at: now() };
  const ok = handler(snapshot);
  if (!ok) return { ok: false as const, error: "Restore failed." };
  saveAll(rows.filter((r) => r.id !== trashId));
  logAction({
    tenantId: item.tenant_id,
    module: item.module,
    action: "create",
    entityName: item.entity_name,
    entityId: item.entity_id,
    newData: { ...snapshot, _restored_from_trash: true }
  });
  return { ok: true as const, item };
}

/**
 * Module-level permanent delete: removes from module recycle bin only.
 * Item remains in Administration recycle bin for admin restore or true purge.
 */
export function clearFromModuleBin(trashId: UUID) {
  const rows = loadAll();
  const idx = rows.findIndex((r) => r.id === trashId);
  if (idx < 0) return false;
  const item = rows[idx];
  if (item.module_cleared_at) return true;
  rows[idx] = {
    ...item,
    module_cleared_at: now(),
    module_cleared_by: getStoredUserEmail()
  };
  saveAll(rows);
  logAction({
    tenantId: item.tenant_id,
    module: item.module,
    action: "delete",
    entityName: item.entity_name,
    entityId: item.entity_id,
    oldData: { ...item.snapshot, _cleared_from_module_bin: true }
  });
  return true;
}

/** Admin-only: permanently remove from all recycle bins. */
export function purgeTrashItem(trashId: UUID) {
  const rows = loadAll();
  const item = rows.find((r) => r.id === trashId);
  if (!item) return false;
  saveAll(rows.filter((r) => r.id !== trashId));
  logAction({
    tenantId: item.tenant_id,
    module: item.module,
    action: "delete",
    entityName: item.entity_name,
    entityId: item.entity_id,
    oldData: { ...item.snapshot, _purged: true, _admin_purge: true }
  });
  return true;
}

/** Clear all visible items from a module bin (they remain for admin). */
export function emptyModuleTrash(tenantId: UUID, module: string) {
  const rows = loadAll();
  let cleared = 0;
  const next = rows.map((r) => {
    if (r.tenant_id !== tenantId || r.module !== module || r.module_cleared_at) return r;
    cleared += 1;
    return {
      ...r,
      module_cleared_at: now(),
      module_cleared_by: getStoredUserEmail()
    };
  });
  saveAll(next);
  if (cleared) {
    logAction({
      tenantId,
      module,
      action: "delete",
      entityName: "recycle_bin",
      oldData: { module_emptied: cleared }
    });
  }
  return cleared;
}

/** Admin-only: permanently empty the entire tenant recycle bin. */
export function emptyTrash(tenantId: UUID) {
  const rows = loadAll();
  const keep = rows.filter((r) => r.tenant_id !== tenantId);
  const removed = rows.length - keep.length;
  saveAll(keep);
  if (removed) {
    logAction({
      tenantId,
      module: "settings",
      action: "delete",
      entityName: "recycle_bin",
      oldData: { emptied: removed }
    });
  }
  return removed;
}

export function trashStats(tenantId: UUID, opts?: { module?: string; audience?: TrashAudience }) {
  const rows = listTrash(tenantId, { module: opts?.module, audience: opts?.audience ?? "admin" });
  const byModule: Record<string, number> = {};
  for (const r of rows) byModule[r.module] = (byModule[r.module] ?? 0) + 1;
  const adminOnly = loadAll().filter(
    (r) => r.tenant_id === tenantId && r.module_cleared_at && (!opts?.module || r.module === opts.module)
  ).length;
  return { total: rows.length, byModule, adminOnly };
}

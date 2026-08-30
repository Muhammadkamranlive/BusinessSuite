import type { TenantEntity, UUID } from "@/modules/core/types";
import { logUpdate } from "@/modules/core/services/audit.service";
import { moveToTrash, registerRestoreHandler } from "@/modules/core/services/trash.store";

type CollectionRef<T extends TenantEntity> = {
  get: () => T[];
  set: (rows: T[]) => void;
  persist: () => void;
  module: string;
  entityName: string;
  labelOf: (row: T) => string;
};

/** Register restore so recycle bin can put the snapshot back. Call once per entity type. */
export function bindTrashRestore<T extends TenantEntity>(ref: CollectionRef<T>) {
  registerRestoreHandler(ref.module, ref.entityName, (snapshot) => {
    const rows = ref.get();
    const id = String(snapshot.id ?? "");
    if (!id) return false;
    const idx = rows.findIndex((r) => r.id === id);
    const restored = { ...(snapshot as unknown as T), is_active: true, updated_at: new Date().toISOString() };
    if (idx >= 0) rows[idx] = restored;
    else rows.unshift(restored);
    ref.set(rows);
    ref.persist();
    return true;
  });
}

export function updateEntityInCollection<T extends TenantEntity>(
  ref: CollectionRef<T>,
  id: UUID,
  patch: Partial<T>
): T | null {
  const rows = ref.get();
  const idx = rows.findIndex((r) => r.id === id && r.is_active !== false);
  if (idx < 0) return null;
  const old = { ...rows[idx] };
  rows[idx] = { ...rows[idx], ...patch, updated_at: new Date().toISOString() };
  ref.set(rows);
  ref.persist();
  logUpdate({
    tenantId: old.tenant_id,
    module: ref.module,
    entityName: ref.entityName,
    entityId: id,
    oldData: old as unknown as Record<string, unknown>,
    newData: rows[idx] as unknown as Record<string, unknown>
  });
  return rows[idx];
}

/** Soft-delete: hide from lists + move snapshot to tenant recycle bin. */
export function trashEntityInCollection<T extends TenantEntity>(ref: CollectionRef<T>, id: UUID): T | null {
  const rows = ref.get();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const row = rows[idx];
  if (row.is_active === false) return row;
  const snapshot = { ...(row as unknown as Record<string, unknown>) };
  rows[idx] = { ...row, is_active: false, updated_at: new Date().toISOString() };
  ref.set(rows);
  ref.persist();
  moveToTrash({
    tenantId: row.tenant_id,
    module: ref.module,
    entityName: ref.entityName,
    entityId: row.id,
    label: ref.labelOf(row),
    snapshot
  });
  return rows[idx];
}

export function activeOnly<T extends TenantEntity>(rows: T[], tenantId: UUID) {
  return rows.filter((r) => r.tenant_id === tenantId && r.is_active !== false);
}

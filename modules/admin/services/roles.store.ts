import type { TenantEntity, UUID } from "@/modules/core/types";
import { logCreate } from "@/modules/core/services/audit.service";
import { bindTrashRestore, trashEntityInCollection, updateEntityInCollection } from "@/modules/core/services/entity-crud";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";
import {
  applyRoleCatalog,
  defaultPermissionMatrix,
  defaultRoleDescriptions,
  defaultRoleLabels,
  SYSTEM_ROLE_KEYS,
  type ModuleKey,
  type RoleKey
} from "@/lib/permissions";
import { ensureRoleAcl, syncRoleAclModules } from "@/modules/admin/services/acl.store";

const STORAGE_KEY = "businesssuite:admin:roles:v1";
const WORLD_CRUD_MODULES_PATCH = "businesssuite:roles:world-crud-v1";
const PROTECTED_KEYS = new Set<string>(["super_admin"]);

function now() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID();
}

export type RoleRecord = TenantEntity & {
  key: RoleKey;
  label: string;
  description: string;
  modules: ModuleKey[];
  is_system: boolean;
};

let roles: RoleRecord[] = [];
let hydrated = false;

function persist() {
  savePersisted(STORAGE_KEY, roles);
  applyRoleCatalog(
    roles
      .filter((row) => row.is_active !== false)
      .map((row) => ({
        key: row.key,
        label: row.label,
        description: row.description,
        modules: row.modules,
        is_active: row.is_active
      }))
  );
}

function seedRoles(): RoleRecord[] {
  const ts = now();
  return SYSTEM_ROLE_KEYS.map((key) => ({
    id: `role-${key}`,
    tenant_id: "alpha",
    key,
    label: defaultRoleLabels[key],
    description: defaultRoleDescriptions[key] ?? "",
    modules: [...(defaultPermissionMatrix[key] ?? [])],
    is_system: true,
    is_active: true,
    created_at: ts,
    updated_at: ts
  }));
}

const collection = {
  get: () => roles,
  set: (rows: RoleRecord[]) => {
    roles = rows;
  },
  persist,
  module: "settings",
  entityName: "role",
  labelOf: (row: RoleRecord) => row.label
};

export function slugifyRoleKey(label: string) {
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return slug || "role";
}

function uniqueKey(desired: string, exceptId?: string) {
  let base = slugifyRoleKey(desired);
  if (!base) base = "role";
  let candidate = base;
  let n = 2;
  while (roles.some((row) => row.key === candidate && row.id !== exceptId)) {
    candidate = `${base}_${n}`;
    n += 1;
  }
  return candidate;
}

export function hydrateRoles() {
  if (hydrated) {
    applyRoleCatalog(
      roles
        .filter((row) => row.is_active !== false)
        .map((row) => ({
          key: row.key,
          label: row.label,
          description: row.description,
          modules: row.modules,
          is_active: row.is_active
        }))
    );
    return;
  }
  hydrated = true;
  const stored = loadPersisted<RoleRecord[]>(STORAGE_KEY);
  if (stored && stored.length > 0) {
    roles = stored;
    const existingKeys = new Set(roles.map((row) => row.key));
    for (const seeded of seedRoles()) {
      if (!existingKeys.has(seeded.key)) roles.push(seeded);
    }
  } else {
    roles = seedRoles();
  }
  if (typeof window !== "undefined" && !loadPersisted<string>(WORLD_CRUD_MODULES_PATCH)) {
    for (const row of roles) {
      const defaults = defaultPermissionMatrix[row.key] ?? [];
      const have = new Set(row.modules);
      const missing = defaults.filter((m) => !have.has(m));
      if (missing.length) {
        row.modules = [...row.modules, ...missing];
        syncRoleAclModules(row.key, row.modules);
      }
    }
    savePersisted(WORLD_CRUD_MODULES_PATCH, "1");
  }
  persist();
  bindTrashRestore(collection);
}

export function listRoles() {
  hydrateRoles();
  return roles.filter((row) => row.is_active !== false);
}

export function listActiveRoles() {
  return listRoles();
}

export function listRoleOptions() {
  return listActiveRoles().map((row) => ({ key: row.key, label: row.label }));
}

export function canAssignRole(_actorRole: RoleKey, targetRole: RoleKey) {
  return targetRole !== "super_admin";
}

export function listAssignableRoleOptions(actorRole: RoleKey) {
  return listRoleOptions().filter((row) => canAssignRole(actorRole, row.key));
}

export function getRoleByKey(key: RoleKey) {
  hydrateRoles();
  return roles.find((row) => row.key === key && row.is_active !== false) ?? null;
}

export function canTrashRole(row: RoleRecord) {
  return !PROTECTED_KEYS.has(row.key);
}

export function createRole(
  tenantId: UUID,
  input: {
    label: string;
    key?: string;
    description?: string;
    modules: ModuleKey[];
    copyFrom?: RoleKey | "";
  }
) {
  hydrateRoles();
  const label = input.label.trim();
  if (!label) throw new Error("Role name is required.");
  const desired = slugifyRoleKey(input.key?.trim() || label);
  if (desired === "super_admin") {
    throw new Error("Super Admin is reserved for the platform operator and cannot be created as a company role.");
  }
  if (input.copyFrom === "super_admin") {
    throw new Error("Company roles cannot copy Super Admin. Copy Company Admin or a manager role instead.");
  }
  const key = uniqueKey(input.key?.trim() || label);
  const template = input.copyFrom ? getRoleByKey(input.copyFrom) : null;
  const modules = input.modules.length > 0 ? [...input.modules] : [...(template?.modules ?? ["dashboard"])];
  const row: RoleRecord = {
    id: id(),
    tenant_id: tenantId,
    key,
    label,
    description: (input.description ?? "").trim() || (template?.description ?? ""),
    modules,
    is_system: false,
    is_active: true,
    created_at: now(),
    updated_at: now()
  };
  roles.unshift(row);
  persist();
  ensureRoleAcl(row.key, template?.key);
  syncRoleAclModules(row.key, row.modules);
  logCreate({
    tenantId,
    module: "settings",
    entityName: "role",
    entityId: row.id,
    newData: row as unknown as Record<string, unknown>
  });
  return row;
}

export function updateRole(
  id: UUID,
  patch: Partial<Pick<RoleRecord, "label" | "description" | "modules">>
) {
  hydrateRoles();
  const current = roles.find((row) => row.id === id && row.is_active !== false);
  if (!current) return null;
  const nextModules = patch.modules ? [...patch.modules] : current.modules;
  const updated = updateEntityInCollection(collection, id, {
    ...patch,
    label: patch.label?.trim() || current.label,
    description: patch.description !== undefined ? patch.description.trim() : current.description,
    modules: nextModules
  });
  if (updated) syncRoleAclModules(updated.key, updated.modules);
  return updated;
}

export function trashRole(id: UUID) {
  hydrateRoles();
  const row = roles.find((r) => r.id === id);
  if (!row) return null;
  if (!canTrashRole(row)) {
    throw new Error("The Super Admin role cannot be moved to trash.");
  }
  return trashEntityInCollection(collection, id);
}

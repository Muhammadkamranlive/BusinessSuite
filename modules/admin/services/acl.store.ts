import type { ModuleKey, RoleKey } from "@/lib/permissions";
import { isCompanyDirectoryMenu, isEmployeeSelfServiceMenu, isEmployeeViewOnlyMenu } from "@/lib/employee-menus";
import { isPlatformOnlyMenu, isSuperAdminRole, SUPER_ADMIN_ONLY_MENU_IDS } from "@/lib/platform-access";
import { menuRegistry, type MenuRight, getMenuById } from "@/lib/menu-registry";
import { tenantHasMenuApp, tenantHasModule } from "@/modules/billing/services/tenant-apps.store";
import { getRoleModules, listRoleKeys, permissionMatrix } from "@/lib/permissions";

const EMPLOYEE_ACL_PATCH_KEY = "businesssuite:acl:employee-self-service:v4";
const PLATFORM_ACL_PATCH_KEY = "businesssuite:acl:company-admin-platform:v2";
const ORG_TREE_ACL_PATCH_KEY = "businesssuite:acl:org-tree-all-roles:v1";
const FLOW_DIAGRAM_ACL_PATCH_KEY = "businesssuite:acl:flow-diagram-menus:v1";
const COMPOSE_EMAIL_ACL_PATCH_KEY = "businesssuite:acl:compose-email-menus:v1";
const AUTOMATIONS_ACL_PATCH_KEY = "businesssuite:acl:automations-menus:v1";

export type MenuRightsMap = Partial<Record<MenuRight, boolean>>;
export type MenuAclMap = Record<string, MenuRightsMap>;

const ROLE_ACL_KEY = "businesssuite:acl:roles";
const USER_ACL_KEY = "businesssuite:acl:users";

function emptyRights(): MenuRightsMap {
  return { view: false, create: false, update: false, delete: false };
}

function fullRights(): MenuRightsMap {
  return { view: true, create: true, update: true, delete: true };
}

function viewOnly(): MenuRightsMap {
  return { view: true, create: false, update: false, delete: false };
}

function moduleManagerRights(): MenuRightsMap {
  return { view: true, create: true, update: true, delete: false };
}

function employeeSelfServiceRights(menuId: string): MenuRightsMap {
  if (!isEmployeeSelfServiceMenu(menuId)) return emptyRights();
  if (menuId.endsWith(".root") || isEmployeeViewOnlyMenu(menuId)) return viewOnly();
  return { view: true, create: true, update: true, delete: false };
}

function stripPlatformMenus(map: MenuAclMap): MenuAclMap {
  const next = { ...map };
  for (const menuId of SUPER_ADMIN_ONLY_MENU_IDS) {
    next[menuId] = emptyRights();
  }
  return next;
}

function defaultRightsFor(role: RoleKey, menuId: string, module: ModuleKey, allowed: Set<ModuleKey>): MenuRightsMap {
  if (isSuperAdminRole(role)) return fullRights();
  if (isPlatformOnlyMenu(menuId)) return emptyRights();
  if (role === "company_admin") return fullRights();
  // Org chart: every user in the company can open HRM → Organization (view).
  if (isCompanyDirectoryMenu(menuId)) return viewOnly();
  if (!allowed.has(module)) return emptyRights();
  // Flow diagram menus: anyone who can open the module can view the guide.
  if (menuId.endsWith(".flow_diagram")) return viewOnly();
  // Compose email: module users can view + create (send).
  if (menuId.endsWith(".compose_email")) {
    return { view: true, create: true, update: false, delete: false };
  }
  // Automations: module managers can view + update rules for their module.
  if (menuId.endsWith(".automations")) {
    return { view: true, create: true, update: true, delete: false };
  }
  if (role === "employee") return employeeSelfServiceRights(menuId);
  if (role === "viewer") return viewOnly();
  if (menuId.endsWith(".root")) return viewOnly();
  return moduleManagerRights();
}

export function buildDefaultAclForRole(role: RoleKey, modules?: ModuleKey[]): MenuAclMap {
  const allowedModules = new Set(modules ?? getRoleModules(role));
  const map: MenuAclMap = {};

  for (const menu of menuRegistry) {
    map[menu.id] = defaultRightsFor(role, menu.id, menu.module, allowedModules);
  }

  if (role !== "super_admin" && role !== "company_admin") {
    map["settings.access_control"] = emptyRights();
  } else {
    map["settings.access_control"] = fullRights();
  }

  return map;
}

/** Seed role defaults from the live module matrix + sensible CRUD. */
export function buildDefaultRoleAcl(): Record<RoleKey, MenuAclMap> {
  const roles = listRoleKeys().length > 0 ? listRoleKeys() : (Object.keys(permissionMatrix) as RoleKey[]);
  const result: Record<RoleKey, MenuAclMap> = {};
  for (const role of roles) {
    result[role] = buildDefaultAclForRole(role);
  }
  return result;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

let roleAclCache: Record<RoleKey, MenuAclMap> | null = null;
let userAclCache: Record<string, MenuAclMap> | null = null;

export function getRoleAcl(): Record<RoleKey, MenuAclMap> {
  if (!roleAclCache) {
    const defaults = buildDefaultRoleAcl();
    const stored = readJson<Partial<Record<RoleKey, MenuAclMap>>>(ROLE_ACL_KEY, {});
    const keys = new Set([...Object.keys(defaults), ...Object.keys(stored)]);
    roleAclCache = { ...defaults };
    for (const role of keys) {
      const base = defaults[role] ?? buildDefaultAclForRole(role);
      roleAclCache[role] = { ...base, ...(stored[role] ?? {}) };
      for (const menuId of Object.keys(stored[role] ?? {})) {
        roleAclCache[role][menuId] = {
          ...base[menuId],
          ...(stored[role]?.[menuId] ?? {})
        };
      }
    }
  }
  if (typeof window !== "undefined" && !window.localStorage.getItem(EMPLOYEE_ACL_PATCH_KEY)) {
    roleAclCache.employee = buildDefaultAclForRole("employee");
    writeJson(ROLE_ACL_KEY, roleAclCache);
    window.localStorage.setItem(EMPLOYEE_ACL_PATCH_KEY, "1");
  }
  if (typeof window !== "undefined" && !window.localStorage.getItem(PLATFORM_ACL_PATCH_KEY)) {
    for (const role of Object.keys(roleAclCache)) {
      if (isSuperAdminRole(role)) continue;
      roleAclCache[role] = stripPlatformMenus(roleAclCache[role] ?? {});
    }
    writeJson(ROLE_ACL_KEY, roleAclCache);
    window.localStorage.setItem(PLATFORM_ACL_PATCH_KEY, "1");
  }
  if (typeof window !== "undefined" && !window.localStorage.getItem(ORG_TREE_ACL_PATCH_KEY)) {
    for (const role of Object.keys(roleAclCache)) {
      const map = { ...(roleAclCache[role] ?? {}) };
      const root = map["hrm.root"] ?? emptyRights();
      map["hrm.root"] = { ...viewOnly(), ...root, view: true };
      map["hrm.organization"] = viewOnly();
      roleAclCache[role] = isSuperAdminRole(role) ? map : stripPlatformMenus(map);
    }
    writeJson(ROLE_ACL_KEY, roleAclCache);
    window.localStorage.setItem(ORG_TREE_ACL_PATCH_KEY, "1");
  }
  if (typeof window !== "undefined" && !window.localStorage.getItem(FLOW_DIAGRAM_ACL_PATCH_KEY)) {
    for (const role of Object.keys(roleAclCache)) {
      const allowed = new Set(getRoleModules(role as RoleKey));
      const map = { ...(roleAclCache[role] ?? {}) };
      for (const menu of menuRegistry) {
        if (!menu.id.endsWith(".flow_diagram")) continue;
        if (isSuperAdminRole(role) || role === "company_admin" || allowed.has(menu.module)) {
          map[menu.id] = viewOnly();
        }
      }
      roleAclCache[role] = isSuperAdminRole(role) ? map : stripPlatformMenus(map);
    }
    writeJson(ROLE_ACL_KEY, roleAclCache);
    window.localStorage.setItem(FLOW_DIAGRAM_ACL_PATCH_KEY, "1");
  }
  if (typeof window !== "undefined" && !window.localStorage.getItem(COMPOSE_EMAIL_ACL_PATCH_KEY)) {
    for (const role of Object.keys(roleAclCache)) {
      const allowed = new Set(getRoleModules(role as RoleKey));
      const map = { ...(roleAclCache[role] ?? {}) };
      for (const menu of menuRegistry) {
        if (!menu.id.endsWith(".compose_email")) continue;
        if (isSuperAdminRole(role) || role === "company_admin" || allowed.has(menu.module)) {
          map[menu.id] = { view: true, create: true, update: false, delete: false };
        }
      }
      roleAclCache[role] = isSuperAdminRole(role) ? map : stripPlatformMenus(map);
    }
    writeJson(ROLE_ACL_KEY, roleAclCache);
    window.localStorage.setItem(COMPOSE_EMAIL_ACL_PATCH_KEY, "1");
  }
  if (typeof window !== "undefined" && !window.localStorage.getItem(AUTOMATIONS_ACL_PATCH_KEY)) {
    for (const role of Object.keys(roleAclCache)) {
      const allowed = new Set(getRoleModules(role as RoleKey));
      const map = { ...(roleAclCache[role] ?? {}) };
      for (const menu of menuRegistry) {
        if (!menu.id.endsWith(".automations")) continue;
        if (isSuperAdminRole(role) || role === "company_admin" || allowed.has(menu.module)) {
          map[menu.id] = { view: true, create: true, update: true, delete: false };
        }
      }
      roleAclCache[role] = isSuperAdminRole(role) ? map : stripPlatformMenus(map);
    }
    writeJson(ROLE_ACL_KEY, roleAclCache);
    window.localStorage.setItem(AUTOMATIONS_ACL_PATCH_KEY, "1");
  }
  return roleAclCache;
}

/** Create ACL for a new role, optionally copying another role's matrix. */
export function ensureRoleAcl(role: RoleKey, templateRole?: RoleKey) {
  const all = getRoleAcl();
  if (templateRole && all[templateRole]) {
    all[role] = JSON.parse(JSON.stringify(all[templateRole])) as MenuAclMap;
  } else if (!all[role] || Object.keys(all[role]).length === 0) {
    all[role] = buildDefaultAclForRole(role);
  }
  if (!isSuperAdminRole(role)) all[role] = stripPlatformMenus(all[role]);
  roleAclCache = all;
  writeJson(ROLE_ACL_KEY, all);
}

/** Keep menu rights in sync when a role's module list changes. */
export function syncRoleAclModules(role: RoleKey, modules: ModuleKey[]) {
  const all = getRoleAcl();
  const allowed = new Set(modules);
  const current = { ...(all[role] ?? {}) };
  const next: MenuAclMap = {};

  for (const menu of menuRegistry) {
    const existing = current[menu.id];
    if (!allowed.has(menu.module)) {
      next[menu.id] = isCompanyDirectoryMenu(menu.id) ? viewOnly() : emptyRights();
      continue;
    }
    const hadView = Boolean(existing?.view);
    next[menu.id] = hadView ? { ...emptyRights(), ...existing } : defaultRightsFor(role, menu.id, menu.module, allowed);
  }

  if (!isSuperAdminRole(role)) {
    for (const menuId of SUPER_ADMIN_ONLY_MENU_IDS) next[menuId] = emptyRights();
  }

  if (role !== "super_admin" && role !== "company_admin") {
    next["settings.access_control"] = current["settings.access_control"] ?? emptyRights();
    if (!allowed.has("settings")) next["settings.access_control"] = emptyRights();
  } else {
    next["settings.access_control"] = fullRights();
  }

  all[role] = next;
  roleAclCache = all;
  writeJson(ROLE_ACL_KEY, all);
}

export function getUserAcl(): Record<string, MenuAclMap> {
  if (!userAclCache) {
    userAclCache = readJson<Record<string, MenuAclMap>>(USER_ACL_KEY, {});
  }
  return userAclCache;
}

export function saveRoleMenuRights(role: RoleKey, menuId: string, rights: MenuRightsMap) {
  const locked = !isSuperAdminRole(role) && isPlatformOnlyMenu(menuId) ? emptyRights() : rights;
  const all = getRoleAcl();
  all[role] = { ...all[role], [menuId]: { ...emptyRights(), ...locked } };
  roleAclCache = all;
  // Persist only overrides structure (full maps for simplicity in demo)
  writeJson(ROLE_ACL_KEY, all);
}

export function saveUserMenuRights(userEmail: string, menuId: string, rights: MenuRightsMap | null) {
  const all = getUserAcl();
  if (isPlatformOnlyMenu(menuId) || !rights) {
    if (all[userEmail]) {
      delete all[userEmail][menuId];
      if (Object.keys(all[userEmail]).length === 0) delete all[userEmail];
    }
  } else {
    all[userEmail] = { ...(all[userEmail] ?? {}), [menuId]: { ...emptyRights(), ...rights } };
  }
  userAclCache = all;
  writeJson(USER_ACL_KEY, all);
}

export function resetAclCaches() {
  roleAclCache = null;
  userAclCache = null;
}

export function getEffectiveMenuRights(role: RoleKey, userEmail: string, menuId: string): MenuRightsMap {
  if (!isSuperAdminRole(role) && isPlatformOnlyMenu(menuId)) return emptyRights();
  const roleMap = getRoleAcl()[role] ?? {};
  const roleRights = { ...emptyRights(), ...(roleMap[menuId] ?? {}) };
  const userOverride = getUserAcl()[userEmail]?.[menuId];

  if (!userOverride) return roleRights;

  // User-level override replaces rights for that menu
  return { ...emptyRights(), ...userOverride };
}

export function canMenu(
  role: RoleKey,
  userEmail: string,
  menuId: string,
  right: MenuRight = "view",
  tenantId?: string
) {
  if (tenantId && !isSuperAdminRole(role)) {
    const menu = getMenuById(menuId);
    if (menu && !tenantHasModule(tenantId, menu.module)) return false;
    if (!tenantHasMenuApp(tenantId, menuId)) return false;
  }
  if (!isSuperAdminRole(role) && isPlatformOnlyMenu(menuId)) return false;
  if (role === "super_admin") {
    const rights = getEffectiveMenuRights(role, userEmail, menuId);
    // Still honor explicit user revoke for demo flexibility
    if (getUserAcl()[userEmail]?.[menuId]) return Boolean(rights[right]);
    return true;
  }
  return Boolean(getEffectiveMenuRights(role, userEmail, menuId)[right]);
}

export function canViewModule(role: RoleKey, userEmail: string, module: string, tenantId?: string) {
  if (tenantId && !tenantHasModule(tenantId, module as ModuleKey)) return false;
  return menuRegistry.some((m) => m.module === module && canMenu(role, userEmail, m.id, "view", tenantId));
}

export function listVisibleMenus(role: RoleKey, userEmail: string, tenantId?: string) {
  return menuRegistry.filter((m) => canMenu(role, userEmail, m.id, "view", tenantId));
}

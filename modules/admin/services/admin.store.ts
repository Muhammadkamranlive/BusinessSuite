import { demoUsers, getRoleLabel, type DemoUser, type RoleKey } from "@/lib/permissions";
import { ensureAccount, findAccountByEmail, setAccountPassword } from "@/lib/auth/public-auth";
import { tenants as seedTenants } from "@/lib/demo-data";
import { notifyUserCredentials } from "@/lib/email/triggers";
import { logAction, getAuditLogs } from "@/modules/core/services/audit.service";
import { createNotification, getUserNotifications, markAsRead } from "@/modules/core/services/notification.service";

export type AdminUserStatus = "active" | "invited" | "blocked";

export type AdminUser = DemoUser & {
  id: string;
  phone?: string;
  status: AdminUserStatus;
  tenantId: string;
  invitedAt?: string;
  lastLoginAt?: string;
  avatar_data_url?: string | null;
  bio?: string;
  location?: string;
  timezone?: string;
};

export type AdminTenant = {
  id: string;
  name: string;
  industry: string;
  region: string;
  plan: "Demo Pro" | "Demo Growth" | "Demo Enterprise" | string;
  status: "active" | "inactive";
  email: string;
  phone: string;
  website?: string;
  address?: string;
  bio?: string;
};

export type SystemSettings = {
  companyName: string;
  legalName: string;
  supportEmail: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  invoicePrefix: string;
  poPrefix: string;
  leadPrefix: string;
  fiscalYearStart: string;
  allowUserInvites: boolean;
  requireMfa: boolean;
  sessionHours: number;
};

const USERS_KEY = "businesssuite:admin:users";
const TENANTS_KEY = "businesssuite:admin:tenants";
const SETTINGS_KEY = "businesssuite:admin:settings";

function now() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID();
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

const defaultUsers: AdminUser[] = demoUsers.map((u, index) => ({
  ...u,
  id: `user-${index + 1}`,
  phone: `+971 55 100 100${index}`,
  status: "active" as const,
  tenantId: "alpha",
  lastLoginAt: now()
}));

const defaultTenants: AdminTenant[] = seedTenants.map((t) => ({
  ...t,
  status: "active" as const,
  email: `info@${t.id}.example`,
  phone: "+971 4 000 0000"
}));

const defaultSettings: SystemSettings = {
  companyName: "Alpha Trading LLC",
  legalName: "Alpha Trading LLC",
  supportEmail: "support@businesssuite.app",
  timezone: "Asia/Dubai",
  currency: "USD",
  dateFormat: "YYYY-MM-DD",
  invoicePrefix: "INV",
  poPrefix: "PO",
  leadPrefix: "LEAD",
  fiscalYearStart: "01-01",
  allowUserInvites: true,
  requireMfa: false,
  sessionHours: 24
};

export function listAdminUsers(tenantId?: string) {
  const users = read<AdminUser[]>(USERS_KEY, defaultUsers);
  if (!tenantId) return users;
  return users.filter((u) => u.tenantId === tenantId);
}

export function listMembershipsByEmail(email: string) {
  const addr = email.trim().toLowerCase();
  return listAdminUsers().filter((u) => u.email.toLowerCase() === addr);
}

export function listCompanyDirectoryUsers(tenantId: string) {
  return listAdminUsers(tenantId).filter((u) => u.role !== "super_admin");
}

export function findCompanyHrEmail(tenantId: string, fallback = "") {
  const users = listCompanyDirectoryUsers(tenantId);
  const pick = (role: RoleKey) => users.find((u) => u.role === role && u.status !== "blocked")?.email;
  return pick("hr_manager") || pick("company_admin") || fallback;
}

export function ensureDemoAdminUsers() {
  const users = read<AdminUser[]>(USERS_KEY, defaultUsers);
  let changed = false;
  for (const seed of defaultUsers) {
    if (users.some((u) => u.email.toLowerCase() === seed.email.toLowerCase() && u.tenantId === seed.tenantId)) continue;
    users.push({ ...seed });
    changed = true;
  }
  if (changed) write(USERS_KEY, users);
  return users;
}

export function ensureAdminDirectoryUser(input: {
  name: string;
  email: string;
  role: RoleKey;
  title: string;
  tenantId: string;
  status?: AdminUserStatus;
}) {
  const users = read<AdminUser[]>(USERS_KEY, defaultUsers);
  const email = input.email.trim().toLowerCase();
  const existing = users.find((u) => u.email.toLowerCase() === email && u.tenantId === input.tenantId);
  if (existing) return existing;
  const user: AdminUser = {
    id: id(),
    name: input.name,
    email,
    role: input.role,
    title: input.title || getRoleLabel(input.role),
    status: input.status ?? "active",
    tenantId: input.tenantId,
    lastLoginAt: now()
  };
  users.unshift(user);
  write(USERS_KEY, users);
  return user;
}

export function inviteUser(input: {
  name: string;
  email: string;
  role: RoleKey;
  title: string;
  tenantId: string;
  actorEmail: string;
  password?: string;
}) {
  if (input.role === "super_admin") {
    throw new Error("Super Admin is the platform operator role. It is not assigned inside a company package.");
  }
  const email = input.email.trim().toLowerCase();
  const users = listAdminUsers();
  if (users.some((u) => u.email.toLowerCase() === email && u.tenantId === input.tenantId)) {
    throw new Error("This email is already a user in this company.");
  }
  const existingLogin = findAccountByEmail(email);
  if (!existingLogin) {
    const password = (input.password ?? "").trim();
    if (password.length < 8) {
      throw new Error("Set a password (at least 8 characters) so this person can sign in.");
    }
  }
  const user: AdminUser = {
    id: id(),
    name: input.name,
    email,
    role: input.role,
    title: input.title || getRoleLabel(input.role),
    status: "active",
    tenantId: input.tenantId,
    invitedAt: now(),
    lastLoginAt: undefined
  };
  users.unshift(user);
  write(USERS_KEY, users);
  ensureAccount({
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    title: user.title,
    password: existingLogin ? undefined : input.password,
    status: "active"
  });
  logAction({
    tenantId: input.tenantId,
    module: "admin",
    action: "create",
    entityName: "user",
    entityId: user.id,
    newData: { email: user.email, role: user.role, status: user.status, existingLogin: Boolean(existingLogin) }
  });
  createNotification({
    tenantId: input.tenantId,
    title: "User invited",
    message: `${input.actorEmail} invited ${user.email} as ${getRoleLabel(user.role)}`,
    type: "success",
    targetModule: "settings"
  });
  const issuedPassword = existingLogin ? null : (input.password ?? "").trim();
  if (issuedPassword) {
    const settings = getSystemSettings();
    notifyUserCredentials({
      to: user.email,
      tenantId: input.tenantId,
      companyName: settings.companyName || "BusinessSuite",
      userName: user.name,
      userEmail: user.email,
      password: issuedPassword,
      roleLabel: getRoleLabel(user.role)
    });
  }
  return {
    user,
    existingLogin: Boolean(existingLogin),
    password: issuedPassword
  };
}

export function setUserLoginPassword(email: string, password: string) {
  return setAccountPassword(email, password, { byAdmin: true });
}

export function updateUser(
  userId: string,
  patch: Partial<Pick<AdminUser, "name" | "role" | "title" | "status" | "phone" | "avatar_data_url" | "bio" | "location" | "timezone">>
) {
  const users = listAdminUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return null;
  if (patch.role === "super_admin" && users[index].role !== "super_admin") {
    throw new Error("Super Admin cannot be assigned to a company user.");
  }
  const old = { ...users[index] };
  users[index] = { ...users[index], ...patch };
  write(USERS_KEY, users);
  logAction({
    tenantId: users[index].tenantId,
    module: "admin",
    action: "update",
    entityName: "user",
    entityId: userId,
    oldData: old as unknown as Record<string, unknown>,
    newData: users[index] as unknown as Record<string, unknown>
  });
  return users[index];
}

export function findAdminUserByEmail(email: string, tenantId?: string) {
  const addr = email.trim().toLowerCase();
  return listAdminUsers(tenantId).find((u) => u.email.toLowerCase() === addr) ?? null;
}

export function getOrCreateDirectoryUser(input: {
  name: string;
  email: string;
  role: RoleKey;
  title: string;
  tenantId: string;
}) {
  return (
    findAdminUserByEmail(input.email, input.tenantId) ??
    ensureAdminDirectoryUser({
      name: input.name,
      email: input.email,
      role: input.role,
      title: input.title,
      tenantId: input.tenantId,
      status: "active"
    })
  );
}

function slugifyTenantId(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `company-${id().slice(0, 8)}`;
}

/** Prefer newest entry when duplicate ids exist (signup slug collisions). */
function dedupeTenants(items: AdminTenant[]) {
  const seen = new Set<string>();
  const unique: AdminTenant[] = [];
  for (const row of items) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    unique.push(row);
  }
  return unique;
}

export function listAdminTenants() {
  const items = read<AdminTenant[]>(TENANTS_KEY, defaultTenants);
  const unique = dedupeTenants(items);
  if (unique.length !== items.length) write(TENANTS_KEY, unique);
  return unique;
}

export function upsertTenant(input: Omit<AdminTenant, "id"> & { id?: string }) {
  const items = listAdminTenants();
  if (input.id) {
    const index = items.findIndex((t) => t.id === input.id);
    if (index >= 0) {
      items[index] = { ...items[index], ...input, id: input.id };
      write(TENANTS_KEY, items);
      logAction({
        tenantId: input.id,
        module: "admin",
        action: "update",
        entityName: "tenant",
        entityId: input.id,
        newData: items[index] as unknown as Record<string, unknown>
      });
      return items[index];
    }
  }

  let tenantId = input.id ?? slugifyTenantId(input.name);
  if (items.some((t) => t.id === tenantId)) {
    tenantId = `${slugifyTenantId(input.name)}-${id().slice(0, 6)}`;
  }

  const tenant: AdminTenant = {
    id: tenantId,
    name: input.name,
    industry: input.industry,
    region: input.region,
    plan: input.plan,
    status: input.status,
    email: input.email,
    phone: input.phone,
    website: input.website ?? "",
    address: input.address ?? "",
    bio: input.bio ?? ""
  };
  items.unshift(tenant);
  write(TENANTS_KEY, dedupeTenants(items));
  logAction({
    tenantId: tenant.id,
    module: "admin",
    action: "create",
    entityName: "tenant",
    entityId: tenant.id,
    newData: tenant as unknown as Record<string, unknown>
  });
  return tenant;
}

export function getSystemSettings(): SystemSettings {
  return { ...defaultSettings, ...read<Partial<SystemSettings>>(SETTINGS_KEY, {}) };
}

export function saveSystemSettings(patch: Partial<SystemSettings>, tenantId = "alpha") {
  const next = { ...getSystemSettings(), ...patch };
  write(SETTINGS_KEY, next);
  logAction({
    tenantId,
    module: "admin",
    action: "update",
    entityName: "system_settings",
    newData: patch as Record<string, unknown>
  });
  return next;
}

export function listCombinedAudit(tenantId?: string) {
  return getAuditLogs(tenantId ?? null);
}

export function listAdminNotifications(tenantId: string) {
  const existing = getUserNotifications(tenantId);
  if (existing.length > 0) return existing;
  // seed a few for empty state polish
  createNotification({
    tenantId,
    title: "Welcome to Administration",
    message: "Invite users, assign roles, and manage menu rights from Access Control.",
    type: "info",
    targetModule: "settings"
  });
  createNotification({
    tenantId,
    title: "Security tip",
    message: "Review audit logs weekly and block unused invited accounts.",
    type: "warning",
    targetModule: "settings"
  });
  return getUserNotifications(tenantId);
}

export function markNotificationRead(notificationId: string) {
  return markAsRead(notificationId);
}

export function adminStats(tenantId: string) {
  const users = listCompanyDirectoryUsers(tenantId);
  const tenants = listAdminTenants();
  const logs = listCombinedAudit(tenantId);
  const notifications = getUserNotifications(tenantId);
  return {
    users: users.length,
    activeUsers: users.filter((u) => u.status === "active").length,
    invitedUsers: users.filter((u) => u.status === "invited").length,
    blockedUsers: users.filter((u) => u.status === "blocked").length,
    tenants: tenants.length,
    auditEvents: logs.length,
    unreadNotifications: notifications.filter((n) => !n.is_read).length
  };
}

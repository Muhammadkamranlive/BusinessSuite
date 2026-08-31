/**
 * In-memory auth cache — no localStorage.
 * Source of truth: Supabase Auth + user_profiles via /api/auth/* routes.
 */
import { DEMO_PASSWORD } from "@/lib/auth/constants";
import { demoUsers, getRoleLabel, type RoleKey } from "@/lib/permissions";

export { DEMO_PASSWORD };

export type PublicAccount = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: RoleKey;
  title: string;
  tenantId: string;
  status: "active" | "invited" | "blocked";
  createdAt: string;
};

/** Runtime session cache (lost on full page reload until /api/auth/session rehydrates). */
const accountCache = new Map<string, PublicAccount>();

function now() {
  return new Date().toISOString();
}

function cacheKey(email: string) {
  return email.trim().toLowerCase();
}

export function cacheAccountFromProfile(input: {
  id: string;
  name: string;
  email: string;
  role: RoleKey;
  title: string;
  tenantId: string;
  status?: PublicAccount["status"];
}) {
  const email = cacheKey(input.email);
  const account: PublicAccount = {
    id: input.id,
    name: input.name,
    email,
    password: "",
    role: input.role,
    title: input.title,
    tenantId: input.tenantId,
    status: input.status ?? "active",
    createdAt: now()
  };
  accountCache.set(email, account);
  return account;
}

export function listAccounts() {
  return Array.from(accountCache.values());
}

export function findAccountByEmail(email: string) {
  return accountCache.get(cacheKey(email)) ?? null;
}

export function generateLoginPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  const body = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `Bs-${body}`;
}

/** @deprecated Password changes go through server admin API */
export function setAccountPassword(
  email: string,
  password: string,
  opts?: { byAdmin?: boolean; skipNotify?: boolean }
) {
  const next = password.trim();
  if (next.length < 8) throw new Error("Password must be at least 8 characters.");
  const key = cacheKey(email);
  const existing = accountCache.get(key);
  if (!existing) throw new Error("No login exists for this email yet.");
  accountCache.set(key, { ...existing, password: next });
  return accountCache.get(key)!;
}

/** Seed in-memory demo accounts for SSR / offline dev only (not persisted). */
export function ensureDemoAccounts() {
  for (const [i, u] of demoUsers.entries()) {
    const key = cacheKey(u.email);
    if (accountCache.has(key)) continue;
    accountCache.set(key, {
      id: `demo-${i + 1}`,
      name: u.name,
      email: key,
      password: DEMO_PASSWORD,
      role: u.role,
      title: u.title,
      tenantId: "alpha",
      status: "active",
      createdAt: now()
    });
  }
  return listAccounts();
}

/** @deprecated Use POST /api/admin/users */
export function ensureAccount(input: {
  name: string;
  email: string;
  role: RoleKey;
  tenantId?: string;
  title?: string;
  password?: string;
  status?: PublicAccount["status"];
}) {
  const email = cacheKey(input.email);
  const existing = accountCache.get(email);
  if (existing) return existing;
  const account: PublicAccount = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    email,
    password: input.password ?? DEMO_PASSWORD,
    role: input.role,
    title: input.title || getRoleLabel(input.role),
    tenantId: input.tenantId ?? "alpha",
    status: input.status ?? "active",
    createdAt: now()
  };
  accountCache.set(email, account);
  return account;
}

/** @deprecated Use POST /api/auth/signup */
export function signupAccount(input: {
  name: string;
  email: string;
  password: string;
  role: RoleKey;
  tenantId?: string;
}) {
  const email = cacheKey(input.email);
  if (accountCache.has(email)) {
    throw new Error("An account with this email already exists. Please sign in.");
  }
  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const account: PublicAccount = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    email,
    password: input.password,
    role: input.role === "super_admin" ? "company_admin" : input.role,
    title: getRoleLabel(input.role),
    tenantId: input.tenantId ?? "alpha",
    status: "active",
    createdAt: now()
  };
  accountCache.set(email, account);
  return account;
}

/** @deprecated Server validates password on login */
export function authenticateAccount(email: string, _password: string) {
  const account = findAccountByEmail(email);
  if (!account) throw new Error("No account found for this email.");
  return account;
}

export async function loginAccountViaServer(email: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = (await res.json()) as {
    ok?: boolean;
    error?: string;
    profile?: {
      id: string;
      email: string;
      name: string;
      role: RoleKey;
      title: string;
      tenantId: string;
      status: PublicAccount["status"];
    };
  };
  if (!res.ok || !data.ok || !data.profile) {
    throw new Error(data.error ?? "Login failed");
  }
  return cacheAccountFromProfile(data.profile);
}

export async function hydrateAuthFromSession() {
  const res = await fetch("/api/auth/session");
  if (!res.ok) return null;
  const data = (await res.json()) as {
    authenticated?: boolean;
    profile?: {
      id: string;
      email: string;
      name: string;
      role: RoleKey;
      title: string;
      tenantId: string;
      status: PublicAccount["status"];
    };
  };
  if (!data.authenticated || !data.profile) return null;
  return cacheAccountFromProfile(data.profile);
}

export function loginAccount(email: string, password: string) {
  return authenticateAccount(email, password);
}

export function updateAccountProfile(email: string, patch: Partial<Pick<PublicAccount, "name" | "title">>) {
  const key = cacheKey(email);
  const existing = accountCache.get(key);
  if (!existing) return null;
  const next = { ...existing, ...patch };
  accountCache.set(key, next);
  return next;
}

export const signupRoles: RoleKey[] = [
  "company_admin",
  "hr_manager",
  "sales_manager",
  "purchase_manager",
  "warehouse_manager",
  "finance_manager",
  "project_manager",
  "employee",
  "viewer"
];

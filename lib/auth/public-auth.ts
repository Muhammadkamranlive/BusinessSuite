import { demoUsers, getRoleLabel, type RoleKey } from "@/lib/permissions";
import { setDemoSession } from "@/lib/auth/session";

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

const ACCOUNTS_KEY = "businesssuite:auth:accounts";

export const DEMO_PASSWORD = "Demo@12345";

function now() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID();
}

function readAccounts(): PublicAccount[] {
  if (typeof window === "undefined") return seedAccounts();
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) {
      const seeded = seedAccounts();
      window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as PublicAccount[];
  } catch {
    return seedAccounts();
  }
}

function writeAccounts(accounts: PublicAccount[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function seedAccounts(): PublicAccount[] {
  return demoUsers.map((u, i) => ({
    id: `demo-${i + 1}`,
    name: u.name,
    email: u.email,
    password: DEMO_PASSWORD,
    role: u.role,
    title: u.title,
    tenantId: "alpha",
    status: "active",
    createdAt: now()
  }));
}

export function listAccounts() {
  return readAccounts();
}

export function findAccountByEmail(email: string) {
  return readAccounts().find((a) => a.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function generateLoginPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  const body = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `Bs-${body}`;
}

export function setAccountPassword(
  email: string,
  password: string,
  opts?: { byAdmin?: boolean; skipNotify?: boolean }
) {
  const next = password.trim();
  if (next.length < 8) throw new Error("Password must be at least 8 characters.");
  const accounts = readAccounts();
  const index = accounts.findIndex((a) => a.email.toLowerCase() === email.trim().toLowerCase());
  if (index === -1) throw new Error("No login exists for this email yet.");
  accounts[index] = { ...accounts[index], password: next };
  writeAccounts(accounts);
  const account = accounts[index];
  if (!opts?.skipNotify && typeof window !== "undefined") {
    void import("@/lib/notifications/automate").then(({ automatePasswordChanged }) => {
      automatePasswordChanged({
        email: account.email,
        name: account.name,
        tenantId: account.tenantId,
        byAdmin: Boolean(opts?.byAdmin)
      });
    });
  }
  return account;
}

export function ensureDemoAccounts() {
  const accounts = readAccounts();
  let changed = false;
  for (const [i, u] of demoUsers.entries()) {
    if (accounts.some((a) => a.email.toLowerCase() === u.email.toLowerCase())) continue;
    accounts.push({
      id: `demo-${i + 1}`,
      name: u.name,
      email: u.email,
      password: DEMO_PASSWORD,
      role: u.role,
      title: u.title,
      tenantId: "alpha",
      status: "active",
      createdAt: now()
    });
    changed = true;
  }
  if (changed) writeAccounts(accounts);
  return accounts;
}

export function ensureAccount(input: {
  name: string;
  email: string;
  role: RoleKey;
  tenantId?: string;
  title?: string;
  password?: string;
  status?: PublicAccount["status"];
}) {
  const email = input.email.trim().toLowerCase();
  const existing = findAccountByEmail(email);
  if (existing) return existing;
  const accounts = readAccounts();
  const account: PublicAccount = {
    id: id(),
    name: input.name.trim(),
    email,
    password: input.password ?? DEMO_PASSWORD,
    role: input.role,
    title: input.title || getRoleLabel(input.role),
    tenantId: input.tenantId ?? "alpha",
    status: input.status ?? "active",
    createdAt: now()
  };
  accounts.unshift(account);
  writeAccounts(accounts);
  return account;
}

export function signupAccount(input: {
  name: string;
  email: string;
  password: string;
  role: RoleKey;
  tenantId?: string;
}) {
  const accounts = readAccounts();
  if (accounts.some((a) => a.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error("An account with this email already exists. Please sign in.");
  }
  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const account: PublicAccount = {
    id: id(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
    role: input.role === "super_admin" ? "company_admin" : input.role,
    title: getRoleLabel(input.role),
    tenantId: input.tenantId ?? "alpha",
    status: "active",
    createdAt: now()
  };
  accounts.unshift(account);
  writeAccounts(accounts);
  if (typeof window !== "undefined") {
    void import("@/lib/notifications/automate").then(({ automateAccountCreated }) => {
      automateAccountCreated({
        email: account.email,
        name: account.name,
        tenantId: account.tenantId,
        roleLabel: getRoleLabel(account.role)
      });
    });
  }
  return account;
}

export function authenticateAccount(email: string, password: string) {
  const account = findAccountByEmail(email);
  if (!account) throw new Error("No account found for this email.");
  if (account.password !== password) throw new Error("Incorrect password.");
  return account;
}

export function loginAccount(email: string, password: string) {
  const account = authenticateAccount(email, password);
  setDemoSession(account.email, account.tenantId);
  return account;
}

export function updateAccountProfile(email: string, patch: Partial<Pick<PublicAccount, "name" | "title">>) {
  const accounts = readAccounts();
  const index = accounts.findIndex((a) => a.email.toLowerCase() === email.toLowerCase());
  if (index === -1) return null;
  accounts[index] = { ...accounts[index], ...patch };
  writeAccounts(accounts);
  return accounts[index];
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

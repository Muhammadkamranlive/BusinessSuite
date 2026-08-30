import { findAccountByEmail } from "@/lib/auth/public-auth";
import { getStoredTenantId, getStoredUserEmail } from "@/lib/auth/session";
import { demoUsers, type RoleKey } from "@/lib/permissions";
import { isSuperAdminRole } from "@/lib/platform-access";
import { findAdminUserByEmail } from "@/modules/admin/services/admin.store";

export type SessionProfile = {
  email: string;
  name: string;
  role: RoleKey;
  title: string;
};

export function getSessionProfile(): SessionProfile {
  const email = getStoredUserEmail() ?? "";
  const tenantId = getStoredTenantId();
  const account = email ? findAccountByEmail(email) : null;
  const directory = email ? findAdminUserByEmail(email, tenantId ?? undefined) : null;
  if (account && isSuperAdminRole(account.role) && !directory) {
    return { email: account.email, name: account.name, role: account.role, title: account.title };
  }
  if (directory) {
    return {
      email: directory.email,
      name: directory.name,
      role: directory.role,
      title: directory.title
    };
  }
  if (account) {
    return {
      email: account.email,
      name: account.name,
      role: account.role,
      title: account.title
    };
  }
  const demo = demoUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (demo) {
    return { email: demo.email, name: demo.name, role: demo.role, title: demo.title };
  }
  return { email, name: email || "Guest", role: "viewer", title: "Viewer" };
}

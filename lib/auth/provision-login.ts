import { DEMO_PASSWORD, ensureAccount, ensureDemoAccounts } from "@/lib/auth/public-auth";
import { ensureAdminDirectoryUser, ensureDemoAdminUsers, findAdminUserByEmail } from "@/modules/admin/services/admin.store";
import { listEmployees } from "@/modules/hrm/services/hrm.store";

/** Create (or reuse) a login so an HRM employee can sign in. */
export function provisionEmployeeLogin(input: {
  name: string;
  email: string;
  tenantId: string;
}) {
  const email = input.email.trim().toLowerCase();
  const account = ensureAccount({
    name: input.name.trim(),
    email,
    role: "employee",
    tenantId: input.tenantId,
    title: "Employee",
    password: DEMO_PASSWORD
  });
  ensureAdminDirectoryUser({
    name: input.name.trim(),
    email,
    role: "employee",
    title: "Employee",
    tenantId: input.tenantId,
    status: "active"
  });
  return { account, password: DEMO_PASSWORD };
}

/** Seed demo users + a login for every roster email so staff can sign in. */
export function hydrateEmployeeLogins(tenantId: string) {
  ensureDemoAccounts();
  ensureDemoAdminUsers();
  for (const emp of listEmployees(tenantId)) {
    if (!emp.email?.trim()) continue;
    ensureAccount({
      name: emp.full_name,
      email: emp.email,
      role: "employee",
      tenantId,
      title: "Employee",
      password: DEMO_PASSWORD
    });
    if (!findAdminUserByEmail(emp.email, tenantId)) {
      ensureAdminDirectoryUser({
        name: emp.full_name,
        email: emp.email,
        role: "employee",
        title: "Employee",
        tenantId,
        status: "active"
      });
    }
  }
}

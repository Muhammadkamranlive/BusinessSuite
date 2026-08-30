import { getStoredUserEmail } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { isSelfServiceRole } from "@/lib/employee-menus";
import { listEmployees } from "@/modules/hrm/services/hrm.store";
import type { Employee } from "@/modules/hrm/model";

export function resolveCurrentEmployee(tenantId: string, email?: string | null): Employee | null {
  const addr = (email ?? getStoredUserEmail() ?? "").trim().toLowerCase();
  if (!addr) return null;
  return listEmployees(tenantId).find((e) => e.email.toLowerCase() === addr) ?? null;
}

/** Match a free-text owner/person field to the logged-in employee. */
export function matchesOwnedBy(owner: string | null | undefined, employee: Employee | null, profileName?: string) {
  const value = (owner ?? "").trim().toLowerCase();
  if (!value || value === "—") return false;
  if (employee) {
    if (value === employee.full_name.toLowerCase()) return true;
    if (value === employee.email.toLowerCase()) return true;
  }
  const name = (profileName ?? "").trim().toLowerCase();
  return Boolean(name) && value === name;
}

export function getSelfServiceContext(tenantId: string) {
  const profile = getSessionProfile();
  const selfService = isSelfServiceRole(profile.role);
  const employee = resolveCurrentEmployee(tenantId, profile.email);
  return { profile, selfService, employee };
}

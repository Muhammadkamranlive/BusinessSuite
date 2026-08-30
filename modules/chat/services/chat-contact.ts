import { getRoleLabel } from "@/lib/permissions";
import { findAdminUserByEmail, type AdminUser } from "@/modules/admin/services/admin.store";
import {
  getDepartmentName,
  getDesignationName,
  getManager,
  listEmployees
} from "@/modules/hrm/services/hrm.store";
import type { Employee } from "@/modules/hrm/model";

export type ChatPresence = "available" | "away" | "busy" | "offline";

export type ChatContact = {
  email: string;
  name: string;
  title: string;
  roleLabel: string;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  timezone?: string | null;
  avatar?: string | null;
  department?: string | null;
  designation?: string | null;
  employeeId?: string | null;
  employeeNo?: string | null;
  managerName?: string | null;
  presence: ChatPresence;
};

export function presenceForUser(user: AdminUser | null | undefined): ChatPresence {
  if (!user || user.status === "blocked") return "offline";
  if (user.status === "invited") return "away";
  if (user.lastLoginAt) {
    const age = Date.now() - new Date(user.lastLoginAt).getTime();
    if (Number.isFinite(age) && age > 12 * 3600_000) return "away";
  }
  return "available";
}

export function presenceLabel(presence: ChatPresence) {
  if (presence === "available") return "Available";
  if (presence === "away") return "Away";
  if (presence === "busy") return "Busy";
  return "Offline";
}

export function resolveChatContact(tenantId: string, email: string, fallbackName?: string): ChatContact {
  const addr = email.trim().toLowerCase();
  const user = findAdminUserByEmail(addr, tenantId);
  const employee: Employee | undefined = listEmployees(tenantId).find((e) => e.email.toLowerCase() === addr);
  const manager = employee ? getManager(employee) : null;
  return {
    email: user?.email ?? addr,
    name: user?.name || employee?.full_name || fallbackName || addr,
    title: user?.title || employee?.business_title || getDesignationName(employee?.designation_id) || getRoleLabel(user?.role ?? "viewer"),
    roleLabel: getRoleLabel(user?.role ?? "viewer"),
    phone: user?.phone || employee?.phone || null,
    location: user?.location || employee?.location || employee?.address || null,
    bio: user?.bio || null,
    timezone: user?.timezone || null,
    avatar: user?.avatar_data_url ?? null,
    department: employee ? getDepartmentName(employee.department_id) : null,
    designation: employee ? getDesignationName(employee.designation_id) : null,
    employeeId: employee?.id ?? null,
    employeeNo: employee?.employee_no ?? null,
    managerName: manager?.full_name ?? null,
    presence: presenceForUser(user)
  };
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

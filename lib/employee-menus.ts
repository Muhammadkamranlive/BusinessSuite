/**
 * Every company user may open these (view) — org chart is shared directory,
 * not an HR-only tool. HRM module access is still required for other HR menus.
 */
export const COMPANY_DIRECTORY_MENU_IDS = ["hrm.root", "hrm.organization"] as const;

export function isCompanyDirectoryMenu(menuId: string) {
  return (COMPANY_DIRECTORY_MENU_IDS as readonly string[]).includes(menuId);
}

/** Menus an `employee` role can use by default (self-service only). */
export const EMPLOYEE_SELF_SERVICE_MENU_IDS = [
  "dashboard.root",
  "dashboard.overview",
  "dashboard.my_profile",
  "dashboard.flow_diagram",
  "hrm.root",
  "hrm.flow_diagram",
  "hrm.employees",
  "hrm.organization",
  "hrm.my_pay",
  "hrm.inbox",
  "hrm.team",
  "hrm.benefits",
  "hrm.talent",
  "hrm.job_changes",
  "hrm.attendance",
  "hrm.timesheets",
  "hrm.leave_requests",
  "hrm.my_forms",
  "hrm.notifications",
  "documents.root",
  "documents.flow_diagram",
  "documents.required_uploads",
  "projects.root",
  "projects.flow_diagram",
  "projects.tasks",
  "projects.timesheets"
] as const;

/** Directory / org / pay views — no create or edit from the employee role. */
export const EMPLOYEE_VIEW_ONLY_MENU_IDS = [
  "hrm.employees",
  "hrm.organization",
  "hrm.my_pay",
  "hrm.team"
] as const;

export type EmployeeSelfServiceMenuId = (typeof EMPLOYEE_SELF_SERVICE_MENU_IDS)[number];

export function isEmployeeSelfServiceMenu(menuId: string) {
  return (EMPLOYEE_SELF_SERVICE_MENU_IDS as readonly string[]).includes(menuId);
}

export function isEmployeeViewOnlyMenu(menuId: string) {
  return (EMPLOYEE_VIEW_ONLY_MENU_IDS as readonly string[]).includes(menuId);
}

export function isSelfServiceRole(role: string) {
  return role === "employee";
}

/** Extra-field form designer is company-level: HR and admins only. */
export function canDesignExtraFields(role: string) {
  return role === "super_admin" || role === "company_admin" || role === "hr_manager";
}

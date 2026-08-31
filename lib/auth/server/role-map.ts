import type { RoleKey } from "@/lib/permissions";

const ROLE_NAME_TO_KEY: Record<string, RoleKey> = {
  "super admin": "super_admin",
  "company admin": "company_admin",
  "hr manager": "hr_manager",
  "sales manager": "sales_manager",
  "purchase manager": "purchase_manager",
  "warehouse manager": "warehouse_manager",
  "finance manager": "finance_manager",
  "project manager": "project_manager",
  employee: "employee",
  viewer: "viewer"
};

const ROLE_KEY_TO_NAME: Record<string, string> = {
  super_admin: "Super Admin",
  company_admin: "Company Admin",
  hr_manager: "HR Manager",
  sales_manager: "Sales Manager",
  purchase_manager: "Purchase Manager",
  warehouse_manager: "Warehouse Manager",
  finance_manager: "Finance Manager",
  project_manager: "Project Manager",
  employee: "Employee",
  viewer: "Viewer"
};

export function roleKeyFromName(name: string): RoleKey {
  return ROLE_NAME_TO_KEY[name.trim().toLowerCase()] ?? name.trim().toLowerCase().replace(/\s+/g, "_");
}

export function roleNameFromKey(key: RoleKey): string {
  return ROLE_KEY_TO_NAME[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

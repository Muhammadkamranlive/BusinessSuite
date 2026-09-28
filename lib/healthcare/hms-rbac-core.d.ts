declare module "./hms-rbac-core.mjs" {
  export type HmsResource =
    | "patients_data"
    | "clinical_records"
    | "billing"
    | "inventory"
    | "staff_hr"
    | "admin_config"
    | "audit_logs";

  export type HmsAction = "read" | "write" | "create" | "delete" | "full";

  export type HmsRole =
    | "super_admin"
    | "hospital_admin"
    | "doctor"
    | "nurse"
    | "receptionist"
    | "lab_technician"
    | "pharmacist"
    | "billing_staff"
    | "patient"
    | "it_security";

  export const HMS_RBAC_MATRIX: Record<
    HmsRole,
    Record<HmsResource, "none" | "read" | "write" | "create" | "full">
  >;

  export function canHmsRoleAccess(role: HmsRole, resource: HmsResource, action: HmsAction): boolean;
  export function platformRoleToHmsRole(platformRole: string): HmsRole | null;
  export function exportRbacMatrixMarkdown(): string;
}

declare module "@/lib/healthcare/hms-rbac-core.mjs" {
  export * from "./hms-rbac-core.mjs";
}

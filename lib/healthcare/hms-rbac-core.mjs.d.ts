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

export declare const HMS_RBAC_MATRIX: Record<
  HmsRole,
  Record<HmsResource, "none" | "read" | "write" | "create" | "full">
>;

export declare function canHmsRoleAccess(
  role: HmsRole,
  resource: HmsResource,
  action: HmsAction
): boolean;

export declare function platformRoleToHmsRole(platformRole: string): HmsRole | null;

export declare function exportRbacMatrixMarkdown(): string;

/**
 * HMS RBAC matrix — AGENT_SPEC §3 (pure JS for Node scripts + TS re-export).
 */

/** @typedef {'super_admin'|'hospital_admin'|'doctor'|'nurse'|'receptionist'|'lab_technician'|'pharmacist'|'billing_staff'|'patient'|'it_security'} HmsRole */

/** @typedef {'patients_data'|'clinical_records'|'billing'|'inventory'|'staff_hr'|'admin_config'|'audit_logs'} HmsResource */

/** @typedef {'read'|'write'|'create'|'delete'|'full'} HmsAction */

/** @typedef {'none'|'read'|'write'|'create'|'full'} AccessLevel */

/** @type {Record<HmsRole, Record<HmsResource, AccessLevel>>} */
export const HMS_RBAC_MATRIX = {
  super_admin: {
    patients_data: "full",
    clinical_records: "full",
    billing: "full",
    inventory: "full",
    staff_hr: "full",
    admin_config: "full",
    audit_logs: "read"
  },
  hospital_admin: {
    patients_data: "full",
    clinical_records: "read",
    billing: "full",
    inventory: "full",
    staff_hr: "full",
    admin_config: "write",
    audit_logs: "read"
  },
  doctor: {
    patients_data: "write",
    clinical_records: "full",
    billing: "none",
    inventory: "none",
    staff_hr: "none",
    admin_config: "none",
    audit_logs: "none"
  },
  nurse: {
    patients_data: "write",
    clinical_records: "write",
    billing: "none",
    inventory: "none",
    staff_hr: "none",
    admin_config: "none",
    audit_logs: "none"
  },
  receptionist: {
    patients_data: "write",
    clinical_records: "none",
    billing: "create",
    inventory: "none",
    staff_hr: "none",
    admin_config: "none",
    audit_logs: "none"
  },
  lab_technician: {
    patients_data: "read",
    clinical_records: "write",
    billing: "none",
    inventory: "read",
    staff_hr: "none",
    admin_config: "none",
    audit_logs: "none"
  },
  pharmacist: {
    patients_data: "read",
    clinical_records: "read",
    billing: "none",
    inventory: "full",
    staff_hr: "none",
    admin_config: "none",
    audit_logs: "none"
  },
  billing_staff: {
    patients_data: "read",
    clinical_records: "none",
    billing: "full",
    inventory: "none",
    staff_hr: "none",
    admin_config: "none",
    audit_logs: "none"
  },
  patient: {
    patients_data: "read",
    clinical_records: "read",
    billing: "read",
    inventory: "none",
    staff_hr: "none",
    admin_config: "none",
    audit_logs: "none"
  },
  it_security: {
    patients_data: "none",
    clinical_records: "none",
    billing: "none",
    inventory: "none",
    staff_hr: "none",
    admin_config: "full",
    audit_logs: "full"
  }
};

/** @param {AccessLevel} level @param {HmsAction} action */
function levelAllows(level, action) {
  if (level === "none") return false;
  if (level === "full") return true;
  if (action === "read") return level === "read" || level === "write" || level === "full";
  if (action === "create") return level === "create" || level === "write" || level === "full";
  if (action === "write") return level === "write" || level === "full";
  if (action === "delete") return level === "full";
  return false;
}

/**
 * @param {HmsRole} role
 * @param {HmsResource} resource
 * @param {HmsAction} action
 */
export function canHmsRoleAccess(role, resource, action) {
  const row = HMS_RBAC_MATRIX[role];
  if (!row) return false;
  const level = row[resource] ?? "none";
  if (action === "full") return level === "full";
  return levelAllows(level, action);
}

/** Map platform ERP role keys → HMS clinical roles (best-effort). */
export function platformRoleToHmsRole(platformRole) {
  /** @type {Record<string, HmsRole>} */
  const map = {
    super_admin: "super_admin",
    company_admin: "hospital_admin",
    admin: "hospital_admin",
    hospital_admin: "hospital_admin",
    hr_manager: "hospital_admin",
    doctor: "doctor",
    nurse: "nurse",
    receptionist: "receptionist",
    lab_technician: "lab_technician",
    pharmacist: "pharmacist",
    billing_staff: "billing_staff",
    finance_manager: "billing_staff",
    accountant: "billing_staff",
    it_security: "it_security",
    patient: "patient"
  };
  return map[platformRole] ?? null;
}

/** Markdown table for documentation export. */
export function exportRbacMatrixMarkdown() {
  const resources = /** @type {HmsResource[]} */ ([
    "patients_data",
    "clinical_records",
    "billing",
    "inventory",
    "staff_hr",
    "admin_config",
    "audit_logs"
  ]);
  const headers = ["Role", ...resources];
  const lines = [
    "| " + headers.join(" | ") + " |",
    "| " + headers.map(() => "---").join(" | ") + " |"
  ];
  for (const [role, row] of Object.entries(HMS_RBAC_MATRIX)) {
    lines.push("| " + [role, ...resources.map((r) => row[r])].join(" | ") + " |");
  }
  return lines.join("\n");
}

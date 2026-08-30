import { getSupabaseAdminClient, hasSecretKey } from "@/lib/supabase/server";
import { toDbTenantId, toUiTenantId } from "@/lib/tenants/ids";

export type HrmRemoteSnapshot = {
  version: number;
  departments: Record<string, unknown>[];
  designations: Record<string, unknown>[];
  shifts: Record<string, unknown>[];
  holidays: Record<string, unknown>[];
  companyProfiles: Record<string, unknown>[];
  employees: Record<string, unknown>[];
  candidates: Record<string, unknown>[];
  onboardingTasks: Record<string, unknown>[];
  attendanceRecords: Record<string, unknown>[];
  timesheets: Record<string, unknown>[];
  leaveTypes: Record<string, unknown>[];
  leaveRequests: Record<string, unknown>[];
  assets: Record<string, unknown>[];
  hrDocuments: Record<string, unknown>[];
  payrollRuns: Record<string, unknown>[];
  payrollItems: Record<string, unknown>[];
  pfSettings: Record<string, unknown>[];
  pfContributions: Record<string, unknown>[];
  eobiSettings: Record<string, unknown>[];
  loans: Record<string, unknown>[];
  loanPolicies: Record<string, unknown>[];
  loanInstallments: Record<string, unknown>[];
  disciplinaryActions: Record<string, unknown>[];
  hrNotifications: Record<string, unknown>[];
  paymentTxns: Record<string, unknown>[];
  workflowIntegrations: Record<string, unknown>[];
  securityPolicies: Record<string, unknown>[];
};

type TableMap = {
  key: keyof HrmRemoteSnapshot;
  table: string;
  /** Drop columns that don't exist / break FKs on remote */
  omit?: string[];
  /** Rewrite row before upsert */
  mapRow?: (row: Record<string, unknown>) => Record<string, unknown>;
};

const TABLES: TableMap[] = [
  { key: "departments", table: "departments", omit: ["manager_id"], mapRow: stripManager },
  { key: "designations", table: "hrm_designations" },
  { key: "shifts", table: "hrm_shifts" },
  { key: "holidays", table: "hrm_holidays" },
  { key: "companyProfiles", table: "hrm_company_profiles" },
  { key: "leaveTypes", table: "hrm_leave_types" },
  { key: "employees", table: "employees" },
  { key: "candidates", table: "hrm_candidates" },
  { key: "onboardingTasks", table: "hrm_onboarding_tasks" },
  { key: "attendanceRecords", table: "attendance", omit: ["created_by"], mapRow: mapAttendance },
  { key: "timesheets", table: "hrm_timesheets" },
  { key: "leaveRequests", table: "leave_requests", omit: ["approved_by", "approved_at"] },
  { key: "assets", table: "hrm_assets" },
  { key: "hrDocuments", table: "hrm_documents" },
  { key: "payrollRuns", table: "hrm_payroll_runs" },
  { key: "payrollItems", table: "hrm_payroll_items" },
  { key: "pfSettings", table: "hrm_pf_settings" },
  { key: "pfContributions", table: "hrm_pf_contributions" },
  { key: "eobiSettings", table: "hrm_eobi_settings" },
  { key: "loans", table: "hrm_loans" },
  { key: "loanPolicies", table: "hrm_loan_policies" },
  { key: "loanInstallments", table: "hrm_loan_installments" },
  { key: "disciplinaryActions", table: "hrm_disciplinary_actions" },
  { key: "hrNotifications", table: "hrm_notifications" },
  { key: "paymentTxns", table: "hrm_payment_txns" },
  { key: "workflowIntegrations", table: "hrm_workflow_integrations" },
  { key: "securityPolicies", table: "hrm_security_policies" }
];

function stripManager(row: Record<string, unknown>) {
  const next = { ...row };
  delete next.manager_id;
  return next;
}

function mapAttendance(row: Record<string, unknown>) {
  const next = { ...row };
  delete next.created_by;
  // Local may store "09:00"; DB expects timestamptz — keep null if not ISO-ish
  for (const key of ["check_in", "check_out"] as const) {
    const v = next[key];
    if (typeof v === "string" && v && !v.includes("T") && v.length <= 8) {
      const date = String(next.attendance_date ?? "").slice(0, 10);
      next[key] = date ? `${date}T${v.length === 5 ? `${v}:00` : v}Z` : null;
    }
  }
  return next;
}

function remapTenantId(row: Record<string, unknown>, toDb: boolean) {
  const next = { ...row };
  if (typeof next.tenant_id === "string") {
    next.tenant_id = toDb ? toDbTenantId(next.tenant_id) : toUiTenantId(next.tenant_id);
  }
  return next;
}

function prepareRows(rows: Record<string, unknown>[] | undefined, map: TableMap, toDb: boolean) {
  if (!rows?.length) return [];
  return rows.map((row) => {
    let next = remapTenantId(row, toDb);
    if (map.mapRow && toDb) next = map.mapRow(next);
    if (map.omit) {
      for (const key of map.omit) delete next[key];
    }
    return next;
  });
}

export function isHrmSupabaseSyncEnabled() {
  return hasSecretKey() && process.env.NEXT_PUBLIC_HRM_USE_SUPABASE !== "false";
}

export async function pushHrmSnapshot(snapshot: HrmRemoteSnapshot) {
  if (!isHrmSupabaseSyncEnabled()) {
    return { ok: false as const, reason: "Supabase secret key missing or HRM sync disabled" };
  }

  const admin = getSupabaseAdminClient();
  const errors: string[] = [];

  for (const map of TABLES) {
    const rows = prepareRows(snapshot[map.key] as Record<string, unknown>[], map, true);
    if (!rows.length) continue;
    const { error } = await admin.from(map.table).upsert(rows, { onConflict: "id" });
    if (error) errors.push(`${map.table}: ${error.message}`);
  }

  return { ok: errors.length === 0, errors };
}

export async function pullHrmSnapshot(uiTenantId?: string): Promise<{
  ok: boolean;
  snapshot?: HrmRemoteSnapshot;
  reason?: string;
  errors?: string[];
}> {
  if (!isHrmSupabaseSyncEnabled()) {
    return { ok: false, reason: "Supabase secret key missing or HRM sync disabled" };
  }

  const admin = getSupabaseAdminClient();
  const dbTenant = uiTenantId ? toDbTenantId(uiTenantId) : null;
  const errors: string[] = [];
  const snapshot: HrmRemoteSnapshot = {
    version: 1,
    departments: [],
    designations: [],
    shifts: [],
    holidays: [],
    companyProfiles: [],
    employees: [],
    candidates: [],
    onboardingTasks: [],
    attendanceRecords: [],
    timesheets: [],
    leaveTypes: [],
    leaveRequests: [],
    assets: [],
    hrDocuments: [],
    payrollRuns: [],
    payrollItems: [],
    pfSettings: [],
    pfContributions: [],
    eobiSettings: [],
    loans: [],
    loanPolicies: [],
    loanInstallments: [],
    disciplinaryActions: [],
    hrNotifications: [],
    paymentTxns: [],
    workflowIntegrations: [],
    securityPolicies: []
  };

  await Promise.all(
    TABLES.map(async (map) => {
      let query = admin.from(map.table).select("*");
      if (dbTenant) query = query.eq("tenant_id", dbTenant);
      const { data, error } = await query;
      if (error) {
        errors.push(`${map.table}: ${error.message}`);
        return;
      }
      snapshot[map.key] = prepareRows((data ?? []) as Record<string, unknown>[], map, false) as never;
    })
  );

  return { ok: true, snapshot, errors: errors.length ? errors : undefined };
}

import { getSupabaseAdminClient, hasSecretKey } from "@/lib/supabase/server";
import { toDbTenantId, toUiTenantId } from "@/lib/tenants/ids";

export type WorkdayRemoteSnapshot = {
  version: number;
  locations: Record<string, unknown>[];
  costCenters: Record<string, unknown>[];
  jobFamilies: Record<string, unknown>[];
  jobProfiles: Record<string, unknown>[];
  payGrades: Record<string, unknown>[];
  positions: Record<string, unknown>[];
  workerProfiles: Record<string, unknown>[];
  dependents: Record<string, unknown>[];
  emergencyContacts: Record<string, unknown>[];
  education: Record<string, unknown>[];
  experience: Record<string, unknown>[];
  certifications: Record<string, unknown>[];
  identityDocs: Record<string, unknown>[];
  paymentElections: Record<string, unknown>[];
  benefitPlans: Record<string, unknown>[];
  enrollments: Record<string, unknown>[];
  leaveBalances: Record<string, unknown>[];
  jobChanges: Record<string, unknown>[];
  inbox: Record<string, unknown>[];
  personalRequests: Record<string, unknown>[];
  goals: Record<string, unknown>[];
  reviews: Record<string, unknown>[];
  requisitions: Record<string, unknown>[];
  offboarding: Record<string, unknown>[];
  costing: Record<string, unknown>[];
};

type TableMap = {
  key: keyof WorkdayRemoteSnapshot;
  table: string;
};

/** Parent tables first so FK upserts succeed. */
const TABLES: TableMap[] = [
  { key: "locations", table: "hrm_work_locations" },
  { key: "costCenters", table: "hrm_cost_centers" },
  { key: "jobFamilies", table: "hrm_job_families" },
  { key: "payGrades", table: "hrm_pay_grades" },
  { key: "jobProfiles", table: "hrm_job_profiles" },
  { key: "positions", table: "hrm_positions" },
  { key: "workerProfiles", table: "hrm_worker_profiles" },
  { key: "dependents", table: "hrm_worker_dependents" },
  { key: "emergencyContacts", table: "hrm_emergency_contacts" },
  { key: "education", table: "hrm_worker_education" },
  { key: "experience", table: "hrm_worker_experience" },
  { key: "certifications", table: "hrm_worker_certifications" },
  { key: "identityDocs", table: "hrm_identity_documents" },
  { key: "paymentElections", table: "hrm_payment_elections" },
  { key: "costing", table: "hrm_costing_allocations" },
  { key: "benefitPlans", table: "hrm_benefit_plans" },
  { key: "enrollments", table: "hrm_benefit_enrollments" },
  { key: "leaveBalances", table: "hrm_leave_balances" },
  { key: "goals", table: "hrm_goals" },
  { key: "reviews", table: "hrm_performance_reviews" },
  { key: "jobChanges", table: "hrm_job_changes" },
  { key: "inbox", table: "hrm_inbox_tasks" },
  { key: "personalRequests", table: "hrm_personal_data_requests" },
  { key: "requisitions", table: "hrm_job_requisitions" },
  { key: "offboarding", table: "hrm_offboarding_tasks" }
];

const UUID_KEYS = new Set([
  "tenant_id",
  "family_id",
  "pay_grade_id",
  "job_profile_id",
  "department_id",
  "location_id",
  "cost_center_id",
  "worker_id",
  "employee_id",
  "position_id",
  "matrix_manager_id",
  "plan_id",
  "leave_type_id",
  "from_department_id",
  "to_department_id",
  "from_manager_id",
  "to_manager_id",
  "from_designation_id",
  "to_designation_id",
  "from_location_id",
  "to_location_id",
  "subject_employee_id",
  "ref_id"
]);

function emptySnapshot(): WorkdayRemoteSnapshot {
  return {
    version: 1,
    locations: [],
    costCenters: [],
    jobFamilies: [],
    jobProfiles: [],
    payGrades: [],
    positions: [],
    workerProfiles: [],
    dependents: [],
    emergencyContacts: [],
    education: [],
    experience: [],
    certifications: [],
    identityDocs: [],
    paymentElections: [],
    benefitPlans: [],
    enrollments: [],
    leaveBalances: [],
    jobChanges: [],
    inbox: [],
    personalRequests: [],
    goals: [],
    reviews: [],
    requisitions: [],
    offboarding: [],
    costing: []
  };
}

function remapTenantId(row: Record<string, unknown>, toDb: boolean) {
  const next = { ...row };
  if (typeof next.tenant_id === "string") {
    next.tenant_id = toDb ? toDbTenantId(next.tenant_id) : toUiTenantId(next.tenant_id);
  }
  if (toDb) {
    for (const key of UUID_KEYS) {
      if (next[key] === "") next[key] = null;
    }
  }
  return next;
}

function prepareRows(rows: Record<string, unknown>[] | undefined, toDb: boolean) {
  if (!rows?.length) return [];
  return rows.map((row) => remapTenantId(row, toDb));
}

export function isWorkdaySupabaseSyncEnabled() {
  return hasSecretKey() && process.env.NEXT_PUBLIC_HRM_USE_SUPABASE !== "false";
}

export async function pushWorkdaySnapshot(snapshot: WorkdayRemoteSnapshot) {
  if (!isWorkdaySupabaseSyncEnabled()) {
    return { ok: false as const, reason: "Supabase secret key missing or HRM sync disabled" };
  }

  const admin = getSupabaseAdminClient();
  const errors: string[] = [];

  for (const map of TABLES) {
    const rows = prepareRows(snapshot[map.key] as Record<string, unknown>[], true);
    if (!rows.length) continue;
    const { error } = await admin.from(map.table).upsert(rows, { onConflict: "id" });
    if (error) errors.push(`${map.table}: ${error.message}`);
  }

  return { ok: errors.length === 0, errors };
}

export async function pullWorkdaySnapshot(uiTenantId?: string): Promise<{
  ok: boolean;
  snapshot?: WorkdayRemoteSnapshot;
  reason?: string;
  errors?: string[];
}> {
  if (!isWorkdaySupabaseSyncEnabled()) {
    return { ok: false, reason: "Supabase secret key missing or HRM sync disabled" };
  }

  const admin = getSupabaseAdminClient();
  const dbTenant = uiTenantId ? toDbTenantId(uiTenantId) : null;
  const errors: string[] = [];
  const snapshot = emptySnapshot();

  for (const map of TABLES) {
    let query = admin.from(map.table).select("*");
    if (dbTenant) query = query.eq("tenant_id", dbTenant);
    const { data, error } = await query;
    if (error) {
      errors.push(`${map.table}: ${error.message}`);
      continue;
    }
    snapshot[map.key] = prepareRows((data ?? []) as Record<string, unknown>[], false) as never;
  }

  return { ok: errors.length === 0, snapshot, errors: errors.length ? errors : undefined };
}

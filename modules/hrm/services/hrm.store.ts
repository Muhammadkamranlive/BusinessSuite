import type { TenantEntity, UUID } from "@/modules/core/types";
import { generateDocumentNumber } from "@/modules/core/services/numbering.service";
import { logCreate, logUpdate, logDelete, logAction } from "@/modules/core/services/audit.service";
import { moveToTrash, registerRestoreHandler } from "@/modules/core/services/trash.store";
import { remoteHrmHasRows } from "@/modules/ops/services/ops-merge";
import { isClientDatabasePrimary } from "@/lib/database-mode";
import { notifyLeaveDecision, notifyLeaveSubmitted } from "@/lib/email/triggers";
import { fetchJson } from "@/lib/sync-fetch";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";
import { getSystemSettings } from "@/modules/admin/services/admin.store";
import type {
  Department,
  Designation,
  Shift,
  Holiday,
  CompanyProfile,
  Employee,
  Candidate,
  OnboardingTask,
  AttendanceRecord,
  Timesheet,
  LeaveType,
  LeaveRequest,
  Asset,
  HrDocument,
  PayrollRun,
  PayrollItem,
  PfSetting,
  PfContribution,
  EobiSetting,
  Loan,
  LoanPolicy,
  LoanInstallment,
  DisciplinaryAction,
  HrNotification,
  PaymentTxn,
  WorkflowIntegration,
  SecurityPolicy,
  HrmStats,
  PaymentPurpose
} from "@/modules/hrm/model";
import {
  allowanceTotal,
  estimatedIncomeTax,
  housingAllowance,
  isEobiEnrolled,
  isPfEnrolled,
  medicalAllowance,
  transportAllowance
} from "@/modules/hrm/services/compensation";
import { postLedgerPair } from "@/modules/finance/services/finance.store";
import {
  countWorkingDays,
  isLateVsShift,
  periodBounds,
  workingDates
} from "@/modules/hrm/services/leave-logic";
import {
  buildInstallmentSchedule,
  checkLoanEligibility,
  computeEmi,
  defaultLoanPolicy,
  loanOutstandingFromSchedule,
  normalizeLoanFields
} from "@/modules/hrm/services/loan-logic";

const STORAGE_KEY = "businesssuite:hrm:v3";
const STORAGE_VERSION = 3;

const ALPHA: UUID = "alpha";
const BETA: UUID = "beta";

function now() {
  return new Date().toISOString();
}

function today() {
  return now().slice(0, 10);
}

function id() {
  return crypto.randomUUID();
}

function seed<T extends Record<string, unknown>>(tenantId: UUID, data: T): T & TenantEntity {
  return { id: id(), tenant_id: tenantId, created_at: now(), updated_at: now(), is_active: true, ...data } as T & TenantEntity;
}

/* =========================================================================
 * In-memory collections (hydrated from memory cache + Supabase sync)
 * ========================================================================= */

const departments: Department[] = [];
const designations: Designation[] = [];
const shifts: Shift[] = [];
const holidays: Holiday[] = [];
const companyProfiles: CompanyProfile[] = [];
const employees: Employee[] = [];
const candidates: Candidate[] = [];
const onboardingTasks: OnboardingTask[] = [];
const attendanceRecords: AttendanceRecord[] = [];
const timesheets: Timesheet[] = [];
const leaveTypes: LeaveType[] = [];
const leaveRequests: LeaveRequest[] = [];
const assets: Asset[] = [];
const hrDocuments: HrDocument[] = [];
const payrollRuns: PayrollRun[] = [];
const payrollItems: PayrollItem[] = [];
const pfSettings: PfSetting[] = [];
const pfContributions: PfContribution[] = [];
const eobiSettings: EobiSetting[] = [];
const loans: Loan[] = [];
const loanPolicies: LoanPolicy[] = [];
const loanInstallments: LoanInstallment[] = [];
const disciplinaryActions: DisciplinaryAction[] = [];
const hrNotifications: HrNotification[] = [];
const paymentTxns: PaymentTxn[] = [];
const workflowIntegrations: WorkflowIntegration[] = [];
const securityPolicies: SecurityPolicy[] = [];

interface HrmSnapshot {
  version: number;
  departments: Department[];
  designations: Designation[];
  shifts: Shift[];
  holidays: Holiday[];
  companyProfiles: CompanyProfile[];
  employees: Employee[];
  candidates: Candidate[];
  onboardingTasks: OnboardingTask[];
  attendanceRecords: AttendanceRecord[];
  timesheets: Timesheet[];
  leaveTypes: LeaveType[];
  leaveRequests: LeaveRequest[];
  assets: Asset[];
  hrDocuments: HrDocument[];
  payrollRuns: PayrollRun[];
  payrollItems: PayrollItem[];
  pfSettings: PfSetting[];
  pfContributions: PfContribution[];
  eobiSettings: EobiSetting[];
  loans: Loan[];
  loanPolicies?: LoanPolicy[];
  loanInstallments?: LoanInstallment[];
  disciplinaryActions: DisciplinaryAction[];
  hrNotifications: HrNotification[];
  paymentTxns: PaymentTxn[];
  workflowIntegrations: WorkflowIntegration[];
  securityPolicies: SecurityPolicy[];
}

function buildSnapshot(): HrmSnapshot {
  return {
    version: STORAGE_VERSION,
    departments,
    designations,
    shifts,
    holidays,
    companyProfiles,
    employees,
    candidates,
    onboardingTasks,
    attendanceRecords,
    timesheets,
    leaveTypes,
    leaveRequests,
    assets,
    hrDocuments,
    payrollRuns,
    payrollItems,
    pfSettings,
    pfContributions,
    eobiSettings,
    loans,
    loanPolicies,
    loanInstallments,
    disciplinaryActions,
    hrNotifications,
    paymentTxns,
    workflowIntegrations,
    securityPolicies
  };
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

function queueRemoteSync() {
  if (typeof window === "undefined") return;
  // Opt-in only — requires SUPABASE_SECRET_KEY on the server or every save hits 503.
  if (process.env.NEXT_PUBLIC_HRM_USE_SUPABASE === "false") return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    const snapshot = buildSnapshot();
    void fetch("/api/hrm/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot)
    })
      .then(async (res) => {
        if (res.status === 503) return; // secret not configured — ignore quietly
        if (!res.ok) {
          /* keep localStorage as source of truth */
        }
      })
      .catch(() => {
        /* offline */
      });
  }, 1200);
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    savePersisted(STORAGE_KEY, buildSnapshot());
    queueRemoteSync();
  } catch {
    /* storage may be unavailable (quota, private mode) - fail silently */
  }
}

/** Pull tenant data from Supabase into local store (when sync API is configured). */
export async function pullHrmFromSupabase(tenantId?: string) {
  ensureHydrated();
  const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
  const result = await fetchJson<{ ok?: boolean; skipped?: boolean; snapshot?: HrmSnapshot; reason?: string }>(
    `/api/hrm/sync${qs}`
  );
  if (!result.ok) {
    if (!isClientDatabasePrimary()) ensureDemoHrmSeed(tenantId);
    return buildSnapshot();
  }
  const json = result.json;
  if (json.skipped || !json.ok || !json.snapshot) {
    if (!isClientDatabasePrimary()) ensureDemoHrmSeed(tenantId);
    return buildSnapshot();
  }
  const snapshot = json.snapshot;
  if (!isClientDatabasePrimary() && !remoteHrmHasRows(snapshot)) {
    ensureDemoHrmSeed(tenantId);
    return buildSnapshot();
  }
  mergeHrmTenantSnapshot(snapshot, tenantId);
  if (typeof window !== "undefined") {
    savePersisted(STORAGE_KEY, buildSnapshot());
  }
  return buildSnapshot();
}

function mergeHrmTenantSnapshot(snapshot: HrmSnapshot, uiTenantId?: string) {
  const tid = uiTenantId ?? snapshot.employees?.[0]?.tenant_id ?? snapshot.departments?.[0]?.tenant_id;
  const mergeTenant = <T extends { tenant_id?: string }>(target: T[], incoming: T[] | undefined) => {
    if (!incoming?.length) return;
    if (!tid) {
      replaceAll(target, incoming);
      return;
    }
    const kept = target.filter((row) => row.tenant_id !== tid);
    target.length = 0;
    target.push(...kept, ...incoming);
  };

  if (!tid) {
    replaceAll(departments, snapshot.departments);
    replaceAll(designations, snapshot.designations);
    replaceAll(shifts, snapshot.shifts);
    replaceAll(holidays, snapshot.holidays);
    replaceAll(companyProfiles, snapshot.companyProfiles);
    replaceAll(employees, snapshot.employees);
    replaceAll(candidates, snapshot.candidates);
    replaceAll(onboardingTasks, snapshot.onboardingTasks);
    replaceAll(attendanceRecords, snapshot.attendanceRecords);
    replaceAll(timesheets, snapshot.timesheets);
    replaceAll(leaveTypes, snapshot.leaveTypes);
    replaceAll(leaveRequests, snapshot.leaveRequests);
    replaceAll(assets, snapshot.assets);
    replaceAll(hrDocuments, snapshot.hrDocuments);
    replaceAll(payrollRuns, snapshot.payrollRuns);
    replaceAll(payrollItems, snapshot.payrollItems);
    replaceAll(pfSettings, snapshot.pfSettings);
    replaceAll(pfContributions, snapshot.pfContributions);
    replaceAll(eobiSettings, snapshot.eobiSettings);
    replaceAll(loans, snapshot.loans);
    replaceAll(loanPolicies, snapshot.loanPolicies ?? []);
    replaceAll(loanInstallments, snapshot.loanInstallments ?? []);
    replaceAll(disciplinaryActions, snapshot.disciplinaryActions);
    replaceAll(hrNotifications, snapshot.hrNotifications);
    replaceAll(paymentTxns, snapshot.paymentTxns);
    replaceAll(workflowIntegrations, snapshot.workflowIntegrations);
    replaceAll(securityPolicies, snapshot.securityPolicies);
    return;
  }

  mergeTenant(departments, snapshot.departments);
  mergeTenant(designations, snapshot.designations);
  mergeTenant(shifts, snapshot.shifts);
  mergeTenant(holidays, snapshot.holidays);
  mergeTenant(companyProfiles, snapshot.companyProfiles);
  mergeTenant(employees, snapshot.employees);
  mergeTenant(candidates, snapshot.candidates);
  mergeTenant(onboardingTasks, snapshot.onboardingTasks);
  mergeTenant(attendanceRecords, snapshot.attendanceRecords);
  mergeTenant(timesheets, snapshot.timesheets);
  mergeTenant(leaveTypes, snapshot.leaveTypes);
  mergeTenant(leaveRequests, snapshot.leaveRequests);
  mergeTenant(assets, snapshot.assets);
  mergeTenant(hrDocuments, snapshot.hrDocuments);
  mergeTenant(payrollRuns, snapshot.payrollRuns);
  mergeTenant(payrollItems, snapshot.payrollItems);
  mergeTenant(pfSettings, snapshot.pfSettings);
  mergeTenant(pfContributions, snapshot.pfContributions);
  mergeTenant(eobiSettings, snapshot.eobiSettings);
  mergeTenant(loans, snapshot.loans);
  mergeTenant(loanPolicies, snapshot.loanPolicies ?? []);
  mergeTenant(loanInstallments, snapshot.loanInstallments ?? []);
  mergeTenant(disciplinaryActions, snapshot.disciplinaryActions);
  mergeTenant(hrNotifications, snapshot.hrNotifications);
  mergeTenant(paymentTxns, snapshot.paymentTxns);
  mergeTenant(workflowIntegrations, snapshot.workflowIntegrations);
  mergeTenant(securityPolicies, snapshot.securityPolicies);
}

function ensureDemoHrmSeed(tenantId?: string) {
  const tid = tenantId ?? ALPHA;
  if (tid !== ALPHA) return;
  if (employees.some((e) => e.tenant_id === ALPHA && e.is_active !== false)) return;
  seedAlpha();
  persist();
}

/** Push current local snapshot to Supabase. */
export async function pushHrmToSupabase() {
  ensureHydrated();
  const res = await fetch("/api/hrm/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildSnapshot())
  });
  const json = (await res.json()) as { ok?: boolean; reason?: string; errors?: string[] };
  if (!res.ok || !json.ok) {
    throw new Error(json.reason ?? json.errors?.join("; ") ?? "Failed to push HRM data");
  }
  return json;
}

function replaceAll<T>(target: T[], source: T[] | undefined) {
  if (!source) return;
  target.length = 0;
  target.push(...source);
}

let hydrated = false;

/** Loads persisted state on first client access. SSR-safe. */
function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === "undefined") return;
  try {
    const snapshot = loadPersisted<Partial<HrmSnapshot>>(STORAGE_KEY);
    if (snapshot) {
      if (snapshot && snapshot.version === STORAGE_VERSION) {
        replaceAll(departments, snapshot.departments);
        replaceAll(designations, snapshot.designations);
        replaceAll(shifts, snapshot.shifts);
        replaceAll(holidays, snapshot.holidays);
        replaceAll(companyProfiles, snapshot.companyProfiles);
        replaceAll(employees, snapshot.employees);
        replaceAll(candidates, snapshot.candidates);
        replaceAll(onboardingTasks, snapshot.onboardingTasks);
        replaceAll(attendanceRecords, snapshot.attendanceRecords);
        replaceAll(timesheets, snapshot.timesheets);
        replaceAll(leaveTypes, snapshot.leaveTypes);
        replaceAll(leaveRequests, snapshot.leaveRequests);
        replaceAll(assets, snapshot.assets);
        replaceAll(hrDocuments, snapshot.hrDocuments);
        replaceAll(payrollRuns, snapshot.payrollRuns);
        replaceAll(payrollItems, snapshot.payrollItems);
        replaceAll(pfSettings, snapshot.pfSettings);
        replaceAll(pfContributions, snapshot.pfContributions);
        replaceAll(eobiSettings, snapshot.eobiSettings);
        replaceAll(loans, snapshot.loans);
        replaceAll(loanPolicies, snapshot.loanPolicies ?? []);
        replaceAll(loanInstallments, snapshot.loanInstallments ?? []);
        replaceAll(disciplinaryActions, snapshot.disciplinaryActions);
        replaceAll(hrNotifications, snapshot.hrNotifications);
        replaceAll(paymentTxns, snapshot.paymentTxns);
        replaceAll(workflowIntegrations, snapshot.workflowIntegrations);
        replaceAll(securityPolicies, snapshot.securityPolicies);
        let linkedHassan = false;
        for (const emp of employees) {
          if (emp.email.toLowerCase() === "hassan@alpha.example") {
            emp.email = "employee@demo.com";
            linkedHassan = true;
          }
        }
        if (linkedHassan) persist();
        migrateWorkdayWorkerFields();
        if (!isClientDatabasePrimary()) ensureDemoHrmSeed(ALPHA);
        return;
      }
    }
  } catch {
    /* corrupt storage - fall through and persist freshly seeded defaults */
  }
  if (!isClientDatabasePrimary()) ensureDemoHrmSeed(ALPHA);
  persist();
  migrateWorkdayWorkerFields();
}

function stampPayDefaults(emp: Employee) {
  emp.housing_allowance = emp.housing_allowance ?? Math.round(emp.basic_salary * 0.1);
  emp.transport_allowance = emp.transport_allowance ?? Math.round(emp.basic_salary * 0.05);
  emp.medical_allowance = emp.medical_allowance ?? Math.round(emp.basic_salary * 0.03);
  emp.other_allowance = emp.other_allowance ?? 0;
  emp.pf_enrolled = emp.pf_enrolled ?? (emp.status === "active" || emp.status === "onboarding");
  emp.eobi_enrolled = emp.eobi_enrolled ?? (emp.status === "active" || emp.status === "onboarding");
  emp.tax_status = emp.tax_status ?? "filer";
  if (!emp.location && emp.address) {
    emp.location = emp.address.split(",").slice(-2).join(",").trim();
  }
}

function ensureAlphaCeo(): { ceo: Employee | null; created: boolean } {
  let ceo = employees.find((e) => e.full_name === "Omar Farooq" && e.tenant_id === ALPHA) ?? null;
  if (ceo) return { ceo, created: false };
  if (!employees.some((e) => e.tenant_id === ALPHA)) return { ceo: null, created: false };

  let dept = departments.find((d) => d.tenant_id === ALPHA && d.code === "EXC");
  if (!dept) {
    dept = seed(ALPHA, { name: "Executive", code: "EXC", description: "Company leadership", manager_id: null }) as Department;
    departments.push(dept);
  }
  let desig = designations.find((d) => d.tenant_id === ALPHA && d.code === "GM");
  if (!desig) {
    desig = seed(ALPHA, { name: "General Manager", code: "GM", description: "Company lead" }) as Designation;
    designations.push(desig);
  }
  const shift = shifts.find((s) => s.tenant_id === ALPHA) ?? null;
  ceo = seed(ALPHA, {
    employee_no: generateDocumentNumber(ALPHA, "employee"),
    full_name: "Omar Farooq",
    email: "omar.farooq@alpha.example",
    phone: "+971 55 100 1001",
    father_name: "Farooq Ahmed",
    cnic: "35202-1000001-1",
    bank_name: "Emirates NBD",
    bank_account: "PK00ENBD0001000001",
    department_id: dept.id,
    designation_id: desig.id,
    shift_id: shift?.id ?? null,
    employment_type: "full_time",
    status: "active",
    basic_salary: 12000,
    housing_allowance: 1200,
    transport_allowance: 600,
    medical_allowance: 360,
    other_allowance: 0,
    manager_id: null,
    location: "Dubai Investment Park, UAE",
    business_title: "General Manager",
    tax_status: "filer",
    tax_ntn: "1234567-8",
    pf_enrolled: true,
    eobi_enrolled: true,
    joining_date: "2018-01-10",
    resignation_date: null,
    emergency_contact: "+971 55 200 1000",
    address: "Palm Jumeirah, Dubai, UAE",
    machine_id: "BM-1000"
  }) as Employee;
  employees.unshift(ceo);
  dept.manager_id = ceo.id;
  return { ceo, created: true };
}

function migrateWorkdayWorkerFields() {
  const { ceo, created } = ensureAlphaCeo();
  let changed = created;
  for (const emp of employees) {
    if (emp.manager_id === undefined) {
      if (ceo && emp.id === ceo.id) {
        emp.manager_id = null;
      } else {
        const dept = departments.find((d) => d.id === emp.department_id);
        const deptManager = dept?.manager_id && dept.manager_id !== emp.id ? dept.manager_id : null;
        emp.manager_id = deptManager ?? ceo?.id ?? null;
      }
      changed = true;
    }
    if (created && ceo && emp.id !== ceo.id && emp.manager_id == null) {
      const isDeptHead = departments.some((d) => d.manager_id === emp.id);
      if (isDeptHead) {
        emp.manager_id = ceo.id;
        changed = true;
      }
    }
    if (emp.housing_allowance == null) {
      stampPayDefaults(emp);
      changed = true;
    } else if (!emp.location && emp.address) {
      emp.location = emp.address.split(",").slice(-2).join(",").trim();
      changed = true;
    }
  }
  if (changed) persist();
}

/* =========================================================================
 * Generic tenant-scoped CRUD factory
 * ========================================================================= */

function makeCrud<T extends TenantEntity>(list: T[], entityName: string) {
  function listAll(tenantId: UUID): T[] {
    ensureHydrated();
    return list.filter((item) => item.tenant_id === tenantId && item.is_active !== false);
  }

  function getById(itemId: UUID): T | undefined {
    ensureHydrated();
    return list.find((item) => item.id === itemId);
  }

  function create(tenantId: UUID, data: Omit<T, keyof TenantEntity>): T {
    ensureHydrated();
    const record = {
      ...data,
      id: id(),
      tenant_id: tenantId,
      created_at: now(),
      updated_at: now(),
      is_active: true
    } as unknown as T;
    list.unshift(record);
    logCreate({ tenantId, module: "hrm", entityName, entityId: record.id, newData: record as unknown as Record<string, unknown> });
    persist();
    return record;
  }

  function update(itemId: UUID, patch: Partial<Omit<T, "id" | "tenant_id" | "created_at">>): T | null {
    ensureHydrated();
    const index = list.findIndex((item) => item.id === itemId);
    if (index === -1) return null;
    const old = { ...list[index] };
    list[index] = { ...list[index], ...patch, updated_at: now() } as T;
    logUpdate({
      tenantId: old.tenant_id,
      module: "hrm",
      entityName,
      entityId: itemId,
      oldData: old as unknown as Record<string, unknown>,
      newData: list[index] as unknown as Record<string, unknown>
    });
    persist();
    return list[index];
  }

  function remove(itemId: UUID): boolean {
    ensureHydrated();
    const item = list.find((entry) => entry.id === itemId);
    if (!item) return false;
    const snapshot = { ...(item as unknown as Record<string, unknown>) };
    item.is_active = false;
    item.updated_at = now();
    moveToTrash({
      tenantId: item.tenant_id,
      module: "hrm",
      entityName,
      entityId: itemId,
      label: String((item as { name?: string; full_name?: string; title?: string; code?: string }).full_name
        || (item as { name?: string }).name
        || (item as { title?: string }).title
        || (item as { code?: string }).code
        || entityName),
      snapshot
    });
    persist();
    return true;
  }

  registerRestoreHandler("hrm", entityName, (snapshot) => {
    ensureHydrated();
    const id = String(snapshot.id ?? "");
    if (!id) return false;
    const idx = list.findIndex((entry) => entry.id === id);
    const restored = { ...(snapshot as unknown as T), is_active: true, updated_at: now() };
    if (idx >= 0) list[idx] = restored;
    else list.unshift(restored);
    persist();
    return true;
  });

  return { listAll, getById, create, update, remove };
}

/* =========================================================================
 * Seed data - tenant "alpha" (rich demo data) + tenant "beta" (minimal)
 * ========================================================================= */

function seedAlpha() {
  const deptExecutive = seed(ALPHA, { name: "Executive", code: "EXC", description: "Company leadership", manager_id: null }) as Department;
  const deptSales = seed(ALPHA, { name: "Sales", code: "SAL", description: "Sales & business development", manager_id: null }) as Department;
  const deptWarehouse = seed(ALPHA, { name: "Warehouse", code: "WH", description: "Warehouse & logistics operations", manager_id: null }) as Department;
  const deptFinance = seed(ALPHA, { name: "Finance", code: "FIN", description: "Finance & accounts", manager_id: null }) as Department;
  const deptHr = seed(ALPHA, { name: "HR", code: "HR", description: "Human resources", manager_id: null }) as Department;
  const deptEngineering = seed(ALPHA, { name: "Engineering", code: "ENG", description: "Product & engineering", manager_id: null }) as Department;
  departments.push(deptExecutive, deptSales, deptWarehouse, deptFinance, deptHr, deptEngineering);

  const desigGm = seed(ALPHA, { name: "General Manager", code: "GM", description: "Company lead" }) as Designation;
  const desigManager = seed(ALPHA, { name: "Manager", code: "MGR", description: "People manager" }) as Designation;
  const desigTeamLead = seed(ALPHA, { name: "Team Lead", code: "TL", description: "Team lead" }) as Designation;
  const desigSeniorExec = seed(ALPHA, { name: "Senior Executive", code: "SR-EXEC", description: "Senior individual contributor" }) as Designation;
  const desigExec = seed(ALPHA, { name: "Executive", code: "EXEC", description: "Individual contributor" }) as Designation;
  const desigIntern = seed(ALPHA, { name: "Intern", code: "INT", description: "Intern / trainee" }) as Designation;
  designations.push(desigGm, desigManager, desigTeamLead, desigSeniorExec, desigExec, desigIntern);

  const shiftGeneral = seed(ALPHA, { name: "General Shift", start_time: "09:00", end_time: "18:00", grace_minutes: 10 }) as Shift;
  const shiftMorning = seed(ALPHA, { name: "Morning Shift", start_time: "08:00", end_time: "16:00", grace_minutes: 5 }) as Shift;
  const shiftEvening = seed(ALPHA, { name: "Evening Shift", start_time: "14:00", end_time: "22:00", grace_minutes: 10 }) as Shift;
  shifts.push(shiftGeneral, shiftMorning, shiftEvening);

  holidays.push(
    seed(ALPHA, { name: "Kashmir Solidarity Day", date: "2026-02-05", type: "gazetted" }) as Holiday,
    seed(ALPHA, { name: "Pakistan Day", date: "2026-03-23", type: "gazetted" }) as Holiday,
    seed(ALPHA, { name: "Eid-ul-Fitr", date: "2026-03-20", type: "gazetted" }) as Holiday,
    seed(ALPHA, { name: "Independence Day", date: "2026-08-14", type: "gazetted" }) as Holiday,
    seed(ALPHA, { name: "Company Foundation Day", date: "2026-09-05", type: "company" }) as Holiday
  );

  companyProfiles.push(
    seed(ALPHA, {
      legal_name: "Alpha Trading LLC",
      ntn: "1234567-8",
      address: "Plot 14, Sector B, Dubai Investment Park, UAE",
      phone: "+971 4 555 0100",
      email: "hr@alpha.example",
      logo_data_url: null,
      letterhead_title: "Alpha Trading LLC",
      letterhead_tagline: "People & Culture",
      letterhead_footer: "Confidential — for internal HR use only",
      brand_color: "#1877f2"
    }) as CompanyProfile
  );

  const empCeo = seed(ALPHA, {
    employee_no: generateDocumentNumber(ALPHA, "employee"),
    full_name: "Omar Farooq",
    email: "omar.farooq@alpha.example",
    phone: "+971 55 100 1001",
    father_name: "Farooq Ahmed",
    cnic: "35202-1000001-1",
    bank_name: "Emirates NBD",
    bank_account: "PK00ENBD0001000001",
    department_id: deptExecutive.id,
    designation_id: desigGm.id,
    shift_id: shiftGeneral.id,
    employment_type: "full_time",
    status: "active",
    basic_salary: 12000,
    housing_allowance: 1200,
    transport_allowance: 600,
    medical_allowance: 360,
    other_allowance: 0,
    manager_id: null,
    location: "Dubai Investment Park, UAE",
    business_title: "General Manager",
    tax_status: "filer",
    tax_ntn: "1234567-8",
    pf_enrolled: true,
    eobi_enrolled: true,
    joining_date: "2018-01-10",
    resignation_date: null,
    emergency_contact: "+971 55 200 1000",
    address: "Palm Jumeirah, Dubai, UAE",
    machine_id: "BM-1000"
  }) as Employee;

  const empSana = seed(ALPHA, {
    employee_no: generateDocumentNumber(ALPHA, "employee"),
    full_name: "Sana Malik",
    email: "sana@alpha.example",
    phone: "+971 55 100 1003",
    father_name: "Aslam Malik",
    cnic: "35202-1234567-1",
    bank_name: "Meezan Bank",
    bank_account: "PK00MEZN0001234567",
    department_id: deptHr.id,
    designation_id: desigManager.id,
    shift_id: shiftGeneral.id,
    employment_type: "full_time",
    status: "active",
    basic_salary: 4200,
    joining_date: "2024-01-15",
    resignation_date: null,
    emergency_contact: "+971 55 200 1001",
    address: "Al Barsha, Dubai, UAE",
    machine_id: "BM-1001"
  }) as Employee;

  const empBilal = seed(ALPHA, {
    employee_no: generateDocumentNumber(ALPHA, "employee"),
    full_name: "Bilal Ahmed",
    email: "bilal@alpha.example",
    phone: "+971 55 100 1004",
    father_name: "Rasheed Ahmed",
    cnic: "35201-2345678-2",
    bank_name: "HBL",
    bank_account: "PK00HABB0002345678",
    department_id: deptSales.id,
    designation_id: desigTeamLead.id,
    shift_id: shiftMorning.id,
    employment_type: "full_time",
    status: "active",
    basic_salary: 5100,
    joining_date: "2023-06-01",
    resignation_date: null,
    emergency_contact: "+971 55 200 1002",
    address: "Deira, Dubai, UAE",
    machine_id: "BM-1002"
  }) as Employee;

  const empNadia = seed(ALPHA, {
    employee_no: generateDocumentNumber(ALPHA, "employee"),
    full_name: "Nadia Raza",
    email: "nadia@alpha.example",
    phone: "+971 55 100 1005",
    father_name: "Iqbal Raza",
    cnic: "42101-3456789-3",
    bank_name: "UBL",
    bank_account: "PK00UNIL0003456789",
    department_id: deptWarehouse.id,
    designation_id: desigExec.id,
    shift_id: shiftEvening.id,
    employment_type: "full_time",
    status: "active",
    basic_salary: 3900,
    joining_date: "2023-09-10",
    resignation_date: null,
    emergency_contact: "+971 55 200 1003",
    address: "Jebel Ali, Dubai, UAE",
    machine_id: "BM-1003"
  }) as Employee;

  const empMariam = seed(ALPHA, {
    employee_no: generateDocumentNumber(ALPHA, "employee"),
    full_name: "Mariam Ali",
    email: "mariam@alpha.example",
    phone: "+971 55 100 1006",
    father_name: "Nasir Ali",
    cnic: "35202-4567890-4",
    bank_name: "Meezan Bank",
    bank_account: "PK00MEZN0004567890",
    department_id: deptFinance.id,
    designation_id: desigSeniorExec.id,
    shift_id: shiftGeneral.id,
    employment_type: "full_time",
    status: "active",
    basic_salary: 4700,
    joining_date: "2022-11-20",
    resignation_date: null,
    emergency_contact: "+971 55 200 1004",
    address: "Al Qusais, Dubai, UAE",
    machine_id: "BM-1004"
  }) as Employee;

  const empHassan = seed(ALPHA, {
    employee_no: generateDocumentNumber(ALPHA, "employee"),
    full_name: "Hassan Tariq",
    email: "employee@demo.com",
    phone: "+971 55 100 1007",
    father_name: "Tariq Mehmood",
    cnic: "35202-5678901-5",
    bank_name: "Bank Alfalah",
    bank_account: "PK00ALFH0005678901",
    department_id: deptEngineering.id,
    designation_id: desigManager.id,
    shift_id: shiftGeneral.id,
    employment_type: "full_time",
    status: "active",
    basic_salary: 6200,
    joining_date: "2021-03-05",
    resignation_date: null,
    emergency_contact: "+971 55 200 1005",
    address: "Business Bay, Dubai, UAE",
    machine_id: "BM-1005"
  }) as Employee;

  const empAyesha = seed(ALPHA, {
    employee_no: generateDocumentNumber(ALPHA, "employee"),
    full_name: "Ayesha Noor",
    email: "ayesha@alpha.example",
    phone: "+971 55 100 1008",
    father_name: "Noor Hassan",
    cnic: "35202-6789012-6",
    bank_name: "HBL",
    bank_account: "PK00HABB0006789012",
    department_id: deptSales.id,
    designation_id: desigExec.id,
    shift_id: shiftMorning.id,
    employment_type: "full_time",
    status: "onboarding",
    basic_salary: 3200,
    joining_date: "2026-08-01",
    resignation_date: null,
    emergency_contact: "+971 55 200 1006",
    address: "Al Nahda, Dubai, UAE",
    machine_id: null
  }) as Employee;

  const empUsman = seed(ALPHA, {
    employee_no: generateDocumentNumber(ALPHA, "employee"),
    full_name: "Usman Farooq",
    email: "usman@alpha.example",
    phone: "+971 55 100 1009",
    father_name: "Farooq Anwar",
    cnic: "35202-7890123-7",
    bank_name: "UBL",
    bank_account: "PK00UNIL0007890123",
    department_id: deptWarehouse.id,
    designation_id: desigIntern.id,
    shift_id: shiftEvening.id,
    employment_type: "contract",
    status: "active",
    basic_salary: 1800,
    joining_date: "2025-12-01",
    resignation_date: null,
    emergency_contact: "+971 55 200 1007",
    address: "Al Quoz, Dubai, UAE",
    machine_id: "BM-1006"
  }) as Employee;

  const empOmar = seed(ALPHA, {
    employee_no: generateDocumentNumber(ALPHA, "employee"),
    full_name: "Omar Sheikh",
    email: "omar@alpha.example",
    phone: "+971 55 100 1010",
    father_name: "Sheikh Anwar",
    cnic: "35202-8901234-8",
    bank_name: "Bank Alfalah",
    bank_account: "PK00ALFH0008901234",
    department_id: deptFinance.id,
    designation_id: desigExec.id,
    shift_id: shiftGeneral.id,
    employment_type: "full_time",
    status: "terminated",
    basic_salary: 4000,
    joining_date: "2020-05-10",
    resignation_date: "2026-07-15",
    emergency_contact: "+971 55 200 1008",
    address: "Karama, Dubai, UAE",
    machine_id: "BM-1007"
  }) as Employee;

  employees.push(empCeo, empSana, empBilal, empNadia, empMariam, empHassan, empAyesha, empUsman, empOmar);

  empCeo.manager_id = null;
  empSana.manager_id = empCeo.id;
  empBilal.manager_id = empCeo.id;
  empNadia.manager_id = empCeo.id;
  empMariam.manager_id = empCeo.id;
  empHassan.manager_id = empCeo.id;
  empAyesha.manager_id = empBilal.id;
  empUsman.manager_id = empNadia.id;
  empOmar.manager_id = empMariam.id;

  empSana.business_title = "HR Manager";
  empBilal.business_title = "Sales Team Lead";
  empNadia.business_title = "Warehouse Executive";
  empMariam.business_title = "Senior Finance Executive";
  empHassan.business_title = "Engineering Manager";
  empAyesha.business_title = "Sales Executive";
  empUsman.business_title = "Warehouse Intern";
  empOmar.business_title = "Finance Executive";

  for (const emp of [empSana, empBilal, empNadia, empMariam, empHassan, empAyesha, empUsman, empOmar]) {
    stampPayDefaults(emp);
  }

  deptExecutive.manager_id = empCeo.id;
  deptHr.manager_id = empSana.id;
  deptSales.manager_id = empBilal.id;
  deptWarehouse.manager_id = empNadia.id;
  deptFinance.manager_id = empMariam.id;
  deptEngineering.manager_id = empHassan.id;

  candidates.push(
    seed(ALPHA, { full_name: "Zara Khan", email: "zara.khan@example.com", phone: "+971 50 200 1101", position: "Frontend Engineer", stage: "interview", source: "linkedin", notes: "Strong React background" }) as Candidate,
    seed(ALPHA, { full_name: "Adeel Baig", email: "adeel.baig@example.com", phone: "+971 50 200 1102", position: "Warehouse Supervisor", stage: "screening", source: "referral", notes: null }) as Candidate,
    seed(ALPHA, { full_name: "Fatima Sheikh", email: "fatima.sheikh@example.com", phone: "+971 50 200 1103", position: "Accountant", stage: "offer", source: "job_board", notes: "Offer sent, awaiting response" }) as Candidate,
    seed(ALPHA, { full_name: "Kamal Iqbal", email: "kamal.iqbal@example.com", phone: "+971 50 200 1104", position: "Sales Executive", stage: "applied", source: "website", notes: null }) as Candidate
  );

  onboardingTasks.push(
    seed(ALPHA, { employee_id: empAyesha.id, title: "Complete HR paperwork", status: "pending", due_date: "2026-08-10" }) as OnboardingTask,
    seed(ALPHA, { employee_id: empAyesha.id, title: "IT equipment setup", status: "done", due_date: null }) as OnboardingTask,
    seed(ALPHA, { employee_id: empAyesha.id, title: "Department orientation", status: "pending", due_date: "2026-08-12" }) as OnboardingTask
  );

  attendanceRecords.push(
    seed(ALPHA, { employee_id: empSana.id, attendance_date: "2026-08-04", check_in: "2026-08-04T08:52:00Z", check_out: "2026-08-04T17:30:00Z", status: "present", working_hours: 8.5, notes: null }) as AttendanceRecord,
    seed(ALPHA, { employee_id: empBilal.id, attendance_date: "2026-08-04", check_in: "2026-08-04T09:05:00Z", check_out: "2026-08-04T17:45:00Z", status: "present", working_hours: 8.5, notes: null }) as AttendanceRecord,
    seed(ALPHA, { employee_id: empNadia.id, attendance_date: "2026-08-04", check_in: "2026-08-04T09:34:00Z", check_out: "2026-08-04T17:20:00Z", status: "late", working_hours: 7.5, notes: null }) as AttendanceRecord,
    seed(ALPHA, { employee_id: empSana.id, attendance_date: today(), check_in: `${today()}T08:55:00Z`, check_out: null, status: "present", working_hours: 0, notes: null }) as AttendanceRecord,
    seed(ALPHA, { employee_id: empBilal.id, attendance_date: today(), check_in: `${today()}T09:10:00Z`, check_out: null, status: "present", working_hours: 0, notes: null }) as AttendanceRecord,
    seed(ALPHA, { employee_id: empNadia.id, attendance_date: today(), check_in: `${today()}T09:40:00Z`, check_out: null, status: "late", working_hours: 0, notes: "Traffic delay" }) as AttendanceRecord,
    seed(ALPHA, { employee_id: empMariam.id, attendance_date: today(), check_in: null, check_out: null, status: "absent", working_hours: 0, notes: null }) as AttendanceRecord,
    seed(ALPHA, { employee_id: empHassan.id, attendance_date: today(), check_in: `${today()}T09:00:00Z`, check_out: `${today()}T13:00:00Z`, status: "half_day", working_hours: 4, notes: "Half day - personal errand" }) as AttendanceRecord
  );

  timesheets.push(
    seed(ALPHA, { employee_id: empHassan.id, work_date: "2026-08-03", hours: 8, project: "ERP Cloud Rollout", notes: "Backend API work", status: "approved" }) as Timesheet,
    seed(ALPHA, { employee_id: empHassan.id, work_date: "2026-08-04", hours: 7.5, project: "ERP Cloud Rollout", notes: "Bug fixes", status: "submitted" }) as Timesheet,
    seed(ALPHA, { employee_id: empBilal.id, work_date: "2026-08-04", hours: 8, project: "Client onboarding", notes: null, status: "draft" }) as Timesheet,
    seed(ALPHA, { employee_id: empNadia.id, work_date: "2026-08-03", hours: 8, project: "Warehouse audit", notes: null, status: "submitted" }) as Timesheet
  );

  const leaveAnnual = seed(ALPHA, { name: "Annual", code: "ANNUAL", days_per_year: 14, paid: true }) as LeaveType;
  const leaveSick = seed(ALPHA, { name: "Sick", code: "SICK", days_per_year: 10, paid: true }) as LeaveType;
  const leaveCasual = seed(ALPHA, { name: "Casual", code: "CASUAL", days_per_year: 8, paid: true }) as LeaveType;
  const leaveUnpaid = seed(ALPHA, { name: "Unpaid", code: "UNPAID", days_per_year: 0, paid: false }) as LeaveType;
  leaveTypes.push(leaveAnnual, leaveSick, leaveCasual, leaveUnpaid);

  leaveRequests.push(
    seed(ALPHA, {
      employee_id: empSana.id,
      leave_type_id: leaveAnnual.id,
      leave_type: "annual",
      start_date: "2026-08-10",
      end_date: "2026-08-12",
      total_days: 3,
      reason: "Family visit",
      status: "pending",
      manager_status: "pending",
      hr_status: "pending"
    }) as LeaveRequest,
    seed(ALPHA, {
      employee_id: empNadia.id,
      leave_type_id: leaveSick.id,
      leave_type: "sick",
      start_date: "2026-07-28",
      end_date: "2026-07-28",
      total_days: 1,
      reason: "Medical",
      status: "approved",
      manager_status: "approved",
      hr_status: "approved"
    }) as LeaveRequest,
    seed(ALPHA, {
      employee_id: empBilal.id,
      leave_type_id: leaveCasual.id,
      leave_type: "casual",
      start_date: "2026-08-20",
      end_date: "2026-08-21",
      total_days: 2,
      reason: "Personal matters",
      status: "pending",
      manager_status: "approved",
      hr_status: "pending"
    }) as LeaveRequest
  );

  assets.push(
    seed(ALPHA, { name: "Dell Latitude 5420", tag_code: "AST-0001", category: "Laptop", assigned_employee_id: empSana.id, status: "assigned", notes: null }) as Asset,
    seed(ALPHA, { name: "iPhone 13", tag_code: "AST-0002", category: "Mobile", assigned_employee_id: empBilal.id, status: "assigned", notes: null }) as Asset,
    seed(ALPHA, { name: "HP LaserJet Printer", tag_code: "AST-0003", category: "Office Equipment", assigned_employee_id: null, status: "available", notes: null }) as Asset,
    seed(ALPHA, { name: "ThinkPad T480", tag_code: "AST-0004", category: "Laptop", assigned_employee_id: null, status: "retired", notes: "Retired - battery failure" }) as Asset
  );

  hrDocuments.push(
    seed(ALPHA, { title: "Employment Contract - Sana Malik", category: "Contract", employee_id: empSana.id, file_name: "sana_contract.pdf", status: "active" }) as HrDocument,
    seed(ALPHA, { title: "HR Policy Handbook", category: "Policy", employee_id: null, file_name: "hr_policy_handbook.pdf", status: "active" }) as HrDocument,
    seed(ALPHA, { title: "Offer Letter - Ayesha Noor", category: "Offer Letter", employee_id: empAyesha.id, file_name: "ayesha_offer.pdf", status: "active" }) as HrDocument
  );

  const pfSetting = seed(ALPHA, { percent: 5, effective_from: "2024-01-01" }) as PfSetting;
  pfSettings.push(pfSetting);
  const eobiSetting = seed(ALPHA, { amount: 370, effective_from: "2024-01-01" }) as EobiSetting;
  eobiSettings.push(eobiSetting);

  const julyActiveEmployees = [empSana, empBilal, empNadia, empMariam, empHassan, empUsman];
  const julyItems = julyActiveEmployees.map((employee) => {
    const basic = employee.basic_salary;
    const allowances = Math.round(basic * 0.1);
    const pf = Math.round((basic * pfSetting.percent) / 100);
    const net = basic + allowances - pf;
    return { employee, basic, allowances, pf, net };
  });
  const julyTotalGross = julyItems.reduce((sum, i) => sum + i.basic + i.allowances, 0);
  const julyTotalNet = julyItems.reduce((sum, i) => sum + i.net, 0);

  const julyRun = seed(ALPHA, {
    period: "2026-07",
    status: "finalized",
    total_gross: julyTotalGross,
    total_net: julyTotalNet,
    employee_count: julyItems.length
  }) as PayrollRun;
  payrollRuns.push(julyRun);

  for (const item of julyItems) {
    payrollItems.push(
      seed(ALPHA, {
        run_id: julyRun.id,
        employee_id: item.employee.id,
        basic: item.basic,
        allowances: item.allowances,
        deductions: 0,
        pf: item.pf,
        net: item.net
      }) as PayrollItem
    );
    pfContributions.push(
      seed(ALPHA, { employee_id: item.employee.id, period: "2026-07", employee_amount: item.pf, employer_amount: item.pf }) as PfContribution
    );
  }

  loans.push(
    seed(ALPHA, {
      employee_id: empNadia.id,
      amount: 50000,
      repayment_amount: 5000,
      start_date: "2026-06-01",
      reason: "Medical emergency",
      status: "active",
      loan_type: "emergency",
      interest_rate: 0,
      tenure_months: 10,
      outstanding_balance: 45000,
      disbursed_at: "2026-06-01T09:00:00.000Z",
      approved_by: "hr@demo.com",
      approved_at: "2026-05-28T10:00:00.000Z"
    }) as Loan,
    seed(ALPHA, {
      employee_id: empUsman.id,
      amount: 20000,
      repayment_amount: 2000,
      start_date: "2026-09-01",
      reason: "Personal advance",
      status: "pending",
      loan_type: "salary_advance",
      interest_rate: 0,
      tenure_months: 10,
      outstanding_balance: 0
    }) as Loan
  );

  loanPolicies.push(seed(ALPHA, defaultLoanPolicy(ALPHA)) as LoanPolicy);

  const nadiaLoan = loans.find((l) => l.employee_id === empNadia.id && l.status === "active");
  if (nadiaLoan) {
    const schedule = buildInstallmentSchedule(50000, 0, 10, "2026-06-01");
    for (const row of schedule) {
      loanInstallments.push(
        seed(ALPHA, {
          ...row,
          loan_id: nadiaLoan.id,
          status: row.installment_no === 1 ? "paid" : "pending",
          paid_at: row.installment_no === 1 ? "2026-07-01T00:00:00.000Z" : null
        }) as LoanInstallment
      );
    }
  }

  disciplinaryActions.push(
    seed(ALPHA, { employee_id: empOmar.id, action_date: "2026-06-10", reason: "Repeated late arrivals", severity: "warning" }) as DisciplinaryAction,
    seed(ALPHA, { employee_id: empUsman.id, action_date: "2026-07-02", reason: "Policy violation", severity: "written" }) as DisciplinaryAction
  );

  hrNotifications.push(
    seed(ALPHA, { title: "Leave request pending", body: "Sana Malik requested annual leave (10-12 Aug).", read: false }) as HrNotification,
    seed(ALPHA, { title: "Payroll finalized", body: "July 2026 payroll has been finalized.", read: true }) as HrNotification,
    seed(ALPHA, { title: "New candidate applied", body: "Kamal Iqbal applied for Sales Executive.", read: false }) as HrNotification
  );

  paymentTxns.push(
    ...julyItems.map(
      (item) =>
        seed(ALPHA, {
          employee_id: item.employee.id,
          amount: item.net,
          method: "bank_transfer",
          purpose: "salary" as const,
          reference: `SAL-2026-07-${item.employee.employee_no}`,
          status: "paid" as const,
          notes: "July 2026 salary disbursement",
          payroll_run_id: julyRun.id,
          payroll_item_id: null,
          bank_name: item.employee.bank_name ?? null,
          bank_account: item.employee.bank_account ?? null
        }) as PaymentTxn
    ),
    seed(ALPHA, {
      employee_id: empNadia.id,
      amount: 50000,
      method: "bank_transfer",
      purpose: "loan" as const,
      reference: "LOAN-DISBURSEMENT",
      status: "paid" as const,
      notes: "Loan disbursement — Medical emergency",
      payroll_run_id: null,
      payroll_item_id: null,
      bank_name: empNadia.bank_name ?? null,
      bank_account: empNadia.bank_account ?? null,
      loan_id: nadiaLoan?.id ?? null
    }) as PaymentTxn
  );

  workflowIntegrations.push(
    seed(ALPHA, { name: "Zoom", provider: "zoom", enabled: true, config_note: "Used for interview scheduling" }) as WorkflowIntegration,
    seed(ALPHA, { name: "Company Email", provider: "email", enabled: true, config_note: null }) as WorkflowIntegration,
    seed(ALPHA, { name: "Google Drive", provider: "google_drive", enabled: false, config_note: "Pending IT approval" }) as WorkflowIntegration,
    seed(ALPHA, { name: "Shared Calendar", provider: "calendar", enabled: true, config_note: null }) as WorkflowIntegration
  );

  securityPolicies.push(seed(ALPHA, { mfa_required: false, session_hours: 24, password_min_length: 8 }) as SecurityPolicy);
}

function seedBeta() {
  const deptGeneral = seed(BETA, { name: "General", code: "GEN", description: "General department", manager_id: null }) as Department;
  departments.push(deptGeneral);

  const desigStaff = seed(BETA, { name: "Staff", code: "STF", description: "General staff" }) as Designation;
  designations.push(desigStaff);

  const shiftGeneral = seed(BETA, { name: "General Shift", start_time: "09:00", end_time: "17:00", grace_minutes: 10 }) as Shift;
  shifts.push(shiftGeneral);

  companyProfiles.push(seed(BETA, { legal_name: "Beta Ventures Ltd", ntn: null, address: null, phone: null, email: "hr@beta.example" }) as CompanyProfile);

  employees.push(
    seed(BETA, {
      employee_no: generateDocumentNumber(BETA, "employee"),
      full_name: "Layla Haddad",
      email: "layla@beta.example",
      phone: "+971 55 900 2001",
      father_name: null,
      cnic: null,
      bank_name: null,
      bank_account: null,
      department_id: deptGeneral.id,
      designation_id: desigStaff.id,
      shift_id: shiftGeneral.id,
      employment_type: "full_time",
      status: "active",
      basic_salary: 3000,
      joining_date: "2025-01-10",
      resignation_date: null,
      emergency_contact: null,
      address: null,
      machine_id: null
    }) as Employee
  );

  leaveTypes.push(seed(BETA, { name: "Annual", code: "ANNUAL", days_per_year: 14, paid: true }) as LeaveType);
  pfSettings.push(seed(BETA, { percent: 5, effective_from: "2024-01-01" }) as PfSetting);
  eobiSettings.push(seed(BETA, { amount: 370, effective_from: "2024-01-01" }) as EobiSetting);
  workflowIntegrations.push(seed(BETA, { name: "Company Email", provider: "email", enabled: true, config_note: null }) as WorkflowIntegration);
  securityPolicies.push(seed(BETA, { mfa_required: false, session_hours: 24, password_min_length: 8 }) as SecurityPolicy);
}

if (typeof window !== "undefined" && !isClientDatabasePrimary()) {
  seedAlpha();
  seedBeta();
}

/* =========================================================================
 * Departments
 * ========================================================================= */

const departmentCrud = makeCrud(departments, "department");
export const listDepartments = departmentCrud.listAll;
export const getDepartment = departmentCrud.getById;
export const createDepartment = departmentCrud.create;
export const updateDepartment = departmentCrud.update;
export const deleteDepartment = departmentCrud.remove;

export function getDepartmentName(departmentId?: UUID | null): string {
  ensureHydrated();
  if (!departmentId) return "—";
  return departments.find((d) => d.id === departmentId)?.name ?? "—";
}

/* =========================================================================
 * Designations
 * ========================================================================= */

const designationCrud = makeCrud(designations, "designation");
export const listDesignations = designationCrud.listAll;
export const getDesignation = designationCrud.getById;
export const createDesignation = designationCrud.create;
export const updateDesignation = designationCrud.update;
export const deleteDesignation = designationCrud.remove;

export function getDesignationName(designationId?: UUID | null): string {
  ensureHydrated();
  if (!designationId) return "—";
  return designations.find((d) => d.id === designationId)?.name ?? "—";
}

/* =========================================================================
 * Shifts
 * ========================================================================= */

const shiftCrud = makeCrud(shifts, "shift");
export const listShifts = shiftCrud.listAll;
export const getShift = shiftCrud.getById;
export const createShift = shiftCrud.create;
export const updateShift = shiftCrud.update;
export const deleteShift = shiftCrud.remove;

/* =========================================================================
 * Holidays
 * ========================================================================= */

const holidayCrud = makeCrud(holidays, "holiday");
export const listHolidays = holidayCrud.listAll;
export const getHoliday = holidayCrud.getById;
export const createHoliday = holidayCrud.create;
export const updateHoliday = holidayCrud.update;
export const deleteHoliday = holidayCrud.remove;

/* =========================================================================
 * Company profile (one per tenant)
 * ========================================================================= */

const companyProfileCrud = makeCrud(companyProfiles, "company_profile");

export function getCompanyProfile(tenantId: UUID): CompanyProfile | undefined {
  ensureHydrated();
  return companyProfiles.find((c) => c.tenant_id === tenantId && c.is_active !== false);
}

export function upsertCompanyProfile(tenantId: UUID, data: Omit<CompanyProfile, keyof TenantEntity>): CompanyProfile {
  const existing = getCompanyProfile(tenantId);
  if (existing) return companyProfileCrud.update(existing.id, data) as CompanyProfile;
  return companyProfileCrud.create(tenantId, data);
}

/* =========================================================================
 * Employees
 * ========================================================================= */

const employeeCrud = makeCrud(employees, "employee");
export const listEmployees = employeeCrud.listAll;
export const getEmployee = employeeCrud.getById;
export const updateEmployee = employeeCrud.update;
export const deleteEmployee = employeeCrud.remove;
export const trashEmployee = employeeCrud.remove;

export function createEmployee(tenantId: UUID, data: Omit<Employee, keyof TenantEntity | "employee_no">): Employee {
  const employee_no = generateDocumentNumber(tenantId, "employee");
  const dept = departments.find((d) => d.id === data.department_id);
  const basic = data.basic_salary;
  return employeeCrud.create(tenantId, {
    ...data,
    employee_no,
    housing_allowance: data.housing_allowance ?? Math.round(basic * 0.1),
    transport_allowance: data.transport_allowance ?? Math.round(basic * 0.05),
    medical_allowance: data.medical_allowance ?? Math.round(basic * 0.03),
    other_allowance: data.other_allowance ?? 0,
    manager_id: data.manager_id !== undefined ? data.manager_id : (dept?.manager_id ?? null),
    pf_enrolled: data.pf_enrolled ?? true,
    eobi_enrolled: data.eobi_enrolled ?? true,
    tax_status: data.tax_status ?? "filer"
  });
}

export function getEmployeeName(employeeId?: UUID | null): string {
  ensureHydrated();
  if (!employeeId) return "—";
  return employees.find((e) => e.id === employeeId)?.full_name ?? "—";
}

export function getShiftName(shiftId?: UUID | null): string {
  ensureHydrated();
  if (!shiftId) return "—";
  return shifts.find((s) => s.id === shiftId)?.name ?? "—";
}

export function listDirectReports(employeeId: UUID): Employee[] {
  ensureHydrated();
  return employees.filter((e) => e.manager_id === employeeId && e.is_active !== false);
}

export function getManager(employee: Employee): Employee | null {
  ensureHydrated();
  if (!employee.manager_id) return null;
  return employees.find((e) => e.id === employee.manager_id) ?? null;
}

export function listOrgRoots(tenantId: UUID, includeInactive = false): Employee[] {
  ensureHydrated();
  const people = employees.filter((e) => {
    if (e.tenant_id !== tenantId || e.is_active === false) return false;
    if (!includeInactive && (e.status === "terminated" || e.status === "inactive")) return false;
    return true;
  });
  const ids = new Set(people.map((e) => e.id));
  return people.filter((e) => !e.manager_id || !ids.has(e.manager_id));
}

export function listPayrollItemsForEmployee(employeeId: UUID): PayrollItem[] {
  ensureHydrated();
  return payrollItems.filter((p) => p.employee_id === employeeId);
}

export function resignEmployee(employeeId: UUID, resignationDate: string): Employee | null {
  return employeeCrud.update(employeeId, { status: "offboarding", resignation_date: resignationDate });
}

export function terminateEmployee(employeeId: UUID, resignationDate: string = today()): Employee | null {
  return employeeCrud.update(employeeId, { status: "terminated", resignation_date: resignationDate });
}

export function reactivateEmployee(employeeId: UUID): Employee | null {
  return employeeCrud.update(employeeId, { status: "active", resignation_date: null });
}

/* =========================================================================
 * Recruitment
 * ========================================================================= */

const candidateCrud = makeCrud(candidates, "candidate");
export const listCandidates = candidateCrud.listAll;
export const getCandidate = candidateCrud.getById;
export const createCandidate = candidateCrud.create;
export const updateCandidate = candidateCrud.update;
export const deleteCandidate = candidateCrud.remove;

export function moveCandidateStage(candidateId: UUID, stage: Candidate["stage"]): Candidate | null {
  return candidateCrud.update(candidateId, { stage });
}

/* =========================================================================
 * Onboarding
 * ========================================================================= */

const onboardingTaskCrud = makeCrud(onboardingTasks, "onboarding_task");
export const listOnboardingTasks = onboardingTaskCrud.listAll;
export const createOnboardingTask = onboardingTaskCrud.create;
export const updateOnboardingTask = onboardingTaskCrud.update;
export const deleteOnboardingTask = onboardingTaskCrud.remove;

export function listOnboardingTasksForEmployee(employeeId: UUID): OnboardingTask[] {
  ensureHydrated();
  return onboardingTasks.filter((t) => t.employee_id === employeeId && t.is_active !== false);
}

export function completeOnboardingTask(taskId: UUID): OnboardingTask | null {
  return onboardingTaskCrud.update(taskId, { status: "done" });
}

/* =========================================================================
 * Attendance
 * ========================================================================= */

const attendanceCrud = makeCrud(attendanceRecords, "attendance");
export const listAttendance = attendanceCrud.listAll;
export const getAttendanceRecord = attendanceCrud.getById;
export const deleteAttendanceRecord = attendanceCrud.remove;

function computeWorkingHours(checkIn?: string | null, checkOut?: string | null): number {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.round(((end - start) / (1000 * 60 * 60)) * 100) / 100;
}

export function markAttendance(
  tenantId: UUID,
  data: {
    employee_id: UUID;
    attendance_date: string;
    check_in?: string | null;
    check_out?: string | null;
    status: AttendanceRecord["status"];
    notes?: string | null;
  }
): AttendanceRecord {
  ensureHydrated();
  const working_hours = computeWorkingHours(data.check_in, data.check_out);
  const existing = attendanceRecords.find(
    (a) => a.tenant_id === tenantId && a.employee_id === data.employee_id && a.attendance_date === data.attendance_date
  );
  if (existing) {
    return attendanceCrud.update(existing.id, { ...data, working_hours }) as AttendanceRecord;
  }
  return attendanceCrud.create(tenantId, { ...data, working_hours, notes: data.notes ?? null });
}

export function holidayDates(tenantId: UUID): Set<string> {
  ensureHydrated();
  return new Set(holidays.filter((h) => h.tenant_id === tenantId && h.is_active !== false).map((h) => h.date));
}

export function remainingLeaveDays(tenantId: UUID, employeeId: UUID, leaveTypeId: UUID | null | undefined, excludeRequestId?: UUID): number {
  ensureHydrated();
  if (!leaveTypeId) return Number.POSITIVE_INFINITY;
  const type = leaveTypes.find((t) => t.id === leaveTypeId);
  if (!type) return 0;
  const year = new Date().getFullYear();
  const used = leaveRequests
    .filter(
      (r) =>
        r.employee_id === employeeId &&
        r.leave_type_id === leaveTypeId &&
        r.id !== excludeRequestId &&
        r.is_active !== false &&
        (r.status === "pending" || r.status === "approved") &&
        r.start_date.slice(0, 4) === String(year)
    )
    .reduce((s, r) => s + (r.total_days || 0), 0);
  return Math.max(0, type.days_per_year - used);
}

export function evaluateLeaveEligibility(
  tenantId: UUID,
  employeeId: UUID,
  leaveTypeId: UUID | null | undefined,
  start: string,
  end: string
) {
  ensureHydrated();
  const errors: string[] = [];
  const employee = employees.find((e) => e.id === employeeId && e.tenant_id === tenantId);
  if (!employee) return { ok: false, errors: ["Employee not found."], workingDays: 0, remaining: 0 };
  if (employee.status !== "active" && employee.status !== "onboarding") {
    errors.push("Leave is only allowed for active employees.");
  }
  const workingDays = countWorkingDays(start, end, holidayDates(tenantId));
  if (workingDays <= 0) errors.push("Selected range has no working days (weekends/holidays excluded).");
  const remaining = remainingLeaveDays(tenantId, employeeId, leaveTypeId);
  if (leaveTypeId && workingDays > remaining) {
    errors.push(`Insufficient leave balance (${remaining} day(s) remaining, ${workingDays} requested).`);
  }
  return { ok: errors.length === 0, errors, workingDays, remaining };
}

function writeLeaveAttendance(tenantId: UUID, employeeId: UUID, start: string, end: string) {
  for (const date of workingDates(start, end, holidayDates(tenantId))) {
    markAttendance(tenantId, {
      employee_id: employeeId,
      attendance_date: date,
      status: "leave",
      notes: "Approved leave"
    });
  }
}

export function unpaidLeaveDaysInPeriod(tenantId: UUID, employeeId: UUID, period: string): number {
  ensureHydrated();
  const { start, end } = periodBounds(period);
  const holidays = holidayDates(tenantId);
  let days = 0;
  for (const req of leaveRequests.filter(
    (r) => r.employee_id === employeeId && r.tenant_id === tenantId && r.status === "approved" && r.is_active !== false
  )) {
    const type = leaveTypes.find((t) => t.id === req.leave_type_id);
    if (type?.paid !== false && req.leave_type.toLowerCase() !== "unpaid") continue;
    const overlapStart = req.start_date > start ? req.start_date : start;
    const overlapEnd = req.end_date < end ? req.end_date : end;
    if (overlapStart <= overlapEnd) days += countWorkingDays(overlapStart, overlapEnd, holidays);
  }
  const leaveDates = new Set(
    leaveRequests
      .filter((r) => r.employee_id === employeeId && r.status === "approved")
      .flatMap((r) => workingDates(r.start_date, r.end_date, holidays))
  );
  days += attendanceRecords.filter(
    (a) =>
      a.employee_id === employeeId &&
      a.attendance_date >= start &&
      a.attendance_date <= end &&
      a.status === "absent" &&
      !leaveDates.has(a.attendance_date)
  ).length;
  return days;
}

export function checkInEmployee(tenantId: UUID, employeeId: UUID, at: string = now()): AttendanceRecord {
  const employee = employees.find((e) => e.id === employeeId);
  const shift = employee?.shift_id ? shifts.find((s) => s.id === employee.shift_id) : undefined;
  const late = shift ? isLateVsShift(at, shift.start_time, shift.grace_minutes) : false;
  return markAttendance(tenantId, {
    employee_id: employeeId,
    attendance_date: at.slice(0, 10),
    check_in: at,
    check_out: null,
    status: late ? "late" : "present",
    notes: late ? `Late vs shift ${shift?.name} (grace ${shift?.grace_minutes}m)` : null
  });
}

export function checkOutEmployee(tenantId: UUID, employeeId: UUID, at: string = now()): AttendanceRecord | null {
  ensureHydrated();
  const attendanceDate = at.slice(0, 10);
  const record = attendanceRecords.find((a) => a.tenant_id === tenantId && a.employee_id === employeeId && a.attendance_date === attendanceDate);
  if (!record) return null;
  return markAttendance(tenantId, {
    employee_id: employeeId,
    attendance_date: attendanceDate,
    check_in: record.check_in,
    check_out: at,
    status: record.status,
    notes: record.notes
  });
}

export function listAttendanceForEmployee(employeeId: UUID): AttendanceRecord[] {
  ensureHydrated();
  return attendanceRecords.filter((a) => a.employee_id === employeeId);
}

/* =========================================================================
 * Timesheets
 * ========================================================================= */

const timesheetCrud = makeCrud(timesheets, "timesheet");
export const listTimesheets = timesheetCrud.listAll;
export const createTimesheet = timesheetCrud.create;
export const updateTimesheet = timesheetCrud.update;
export const deleteTimesheet = timesheetCrud.remove;

export function listTimesheetsForEmployee(tenantId: UUID, employeeId: UUID) {
  return listTimesheets(tenantId).filter((t) => t.employee_id === employeeId);
}

export function submitTimesheet(timesheetId: UUID): Timesheet | null {
  return timesheetCrud.update(timesheetId, { status: "submitted" });
}

export function approveTimesheet(timesheetId: UUID): Timesheet | null {
  return timesheetCrud.update(timesheetId, { status: "approved" });
}

export function rejectTimesheet(timesheetId: UUID): Timesheet | null {
  return timesheetCrud.update(timesheetId, { status: "rejected" });
}

/* =========================================================================
 * Leave types & requests
 * ========================================================================= */

const leaveTypeCrud = makeCrud(leaveTypes, "leave_type");
export const listLeaveTypes = leaveTypeCrud.listAll;
export const createLeaveType = leaveTypeCrud.create;
export const updateLeaveType = leaveTypeCrud.update;
export const deleteLeaveType = leaveTypeCrud.remove;

const leaveRequestCrud = makeCrud(leaveRequests, "leave_request");
export const listLeaveRequests = leaveRequestCrud.listAll;
export const getLeaveRequest = leaveRequestCrud.getById;
export const deleteLeaveRequest = leaveRequestCrud.remove;

export function createLeaveRequest(tenantId: UUID, data: Omit<LeaveRequest, keyof TenantEntity | "status">): LeaveRequest {
  const eligibility = evaluateLeaveEligibility(tenantId, data.employee_id, data.leave_type_id, data.start_date, data.end_date);
  if (!eligibility.ok) throw new Error(eligibility.errors.join(" "));
  const row = leaveRequestCrud.create(tenantId, {
    ...data,
    total_days: eligibility.workingDays,
    status: "pending",
    manager_status: "pending",
    hr_status: "pending"
  });
  const employee = employees.find((e) => e.id === row.employee_id);
  const leaveType = leaveTypes.find((t) => t.id === row.leave_type_id);
  const manager = employee?.manager_id ? employees.find((e) => e.id === employee.manager_id) : null;
  const support = getSystemSettings().supportEmail;
  const notifyTo = [manager?.email, support].filter((e): e is string => Boolean(e && e.includes("@")));
  if (notifyTo.length && employee) {
    notifyLeaveSubmitted({
      to: [...new Set(notifyTo)],
      tenantId,
      employeeName: employee.full_name,
      leaveType: leaveType?.name || "Leave",
      startDate: row.start_date,
      endDate: row.end_date,
      totalDays: row.total_days,
      reason: row.reason
    });
  }
  return row;
}

export function listLeaveRequestsForEmployee(employeeId: UUID): LeaveRequest[] {
  ensureHydrated();
  return leaveRequests.filter((l) => l.employee_id === employeeId);
}

export function approveLeave(leaveId: UUID, approver?: "manager" | "hr"): LeaveRequest | null {
  ensureHydrated();
  const request = leaveRequests.find((l) => l.id === leaveId);
  if (!request) return null;
  const old = { ...request };
  if (approver === "manager") request.manager_status = "approved";
  else if (approver === "hr") request.hr_status = "approved";
  else {
    request.manager_status = "approved";
    request.hr_status = "approved";
  }
  if (request.manager_status === "approved" && request.hr_status === "approved") {
    request.status = "approved";
    writeLeaveAttendance(request.tenant_id, request.employee_id, request.start_date, request.end_date);
  }
  request.updated_at = now();
  logAction({
    tenantId: request.tenant_id,
    module: "hrm",
    action: "approve",
    entityName: "leave_request",
    entityId: leaveId,
    oldData: old as unknown as Record<string, unknown>,
    newData: request as unknown as Record<string, unknown>
  });
  persist();
  if (request.status === "approved" && old.status !== "approved") {
    const employee = employees.find((e) => e.id === request.employee_id);
    const leaveType = leaveTypes.find((t) => t.id === request.leave_type_id);
    if (employee?.email) {
      notifyLeaveDecision({
        approved: true,
        to: employee.email,
        tenantId: request.tenant_id,
        employeeName: employee.full_name,
        leaveType: leaveType?.name || "Leave",
        startDate: request.start_date,
        endDate: request.end_date,
        totalDays: request.total_days,
        approverName: approver === "manager" ? "Manager" : approver === "hr" ? "HR" : "Manager & HR"
      });
    }
  }
  return request;
}

export function rejectLeave(leaveId: UUID, approver?: "manager" | "hr"): LeaveRequest | null {
  ensureHydrated();
  const request = leaveRequests.find((l) => l.id === leaveId);
  if (!request) return null;
  const old = { ...request };
  if (approver === "manager") request.manager_status = "rejected";
  else if (approver === "hr") request.hr_status = "rejected";
  else {
    request.manager_status = "rejected";
    request.hr_status = "rejected";
  }
  request.status = "rejected";
  request.updated_at = now();
  logAction({
    tenantId: request.tenant_id,
    module: "hrm",
    action: "reject",
    entityName: "leave_request",
    entityId: leaveId,
    oldData: old as unknown as Record<string, unknown>,
    newData: request as unknown as Record<string, unknown>
  });
  persist();
  if (old.status !== "rejected") {
    const employee = employees.find((e) => e.id === request.employee_id);
    const leaveType = leaveTypes.find((t) => t.id === request.leave_type_id);
    if (employee?.email) {
      notifyLeaveDecision({
        approved: false,
        to: employee.email,
        tenantId: request.tenant_id,
        employeeName: employee.full_name,
        leaveType: leaveType?.name || "Leave",
        startDate: request.start_date,
        endDate: request.end_date,
        totalDays: request.total_days,
        approverName: approver === "manager" ? "Manager" : approver === "hr" ? "HR" : "Manager & HR"
      });
    }
  }
  return request;
}

export function cancelLeave(leaveId: UUID): LeaveRequest | null {
  return leaveRequestCrud.update(leaveId, { status: "cancelled" });
}

/* =========================================================================
 * Assets
 * ========================================================================= */

const assetCrud = makeCrud(assets, "asset");
export const listAssets = assetCrud.listAll;
export const getAsset = assetCrud.getById;
export const createAsset = assetCrud.create;
export const updateAsset = assetCrud.update;
export const deleteAsset = assetCrud.remove;

export function assignAsset(assetId: UUID, employeeId: UUID): Asset | null {
  return assetCrud.update(assetId, { assigned_employee_id: employeeId, status: "assigned" });
}

export function unassignAsset(assetId: UUID): Asset | null {
  return assetCrud.update(assetId, { assigned_employee_id: null, status: "available" });
}

export function retireAsset(assetId: UUID): Asset | null {
  return assetCrud.update(assetId, { assigned_employee_id: null, status: "retired" });
}

/* =========================================================================
 * HR documents
 * ========================================================================= */

const hrDocumentCrud = makeCrud(hrDocuments, "hr_document");
export const listHrDocuments = hrDocumentCrud.listAll;
export const createHrDocument = hrDocumentCrud.create;
export const updateHrDocument = hrDocumentCrud.update;
export const deleteHrDocument = hrDocumentCrud.remove;

export function archiveHrDocument(documentId: UUID): HrDocument | null {
  return hrDocumentCrud.update(documentId, { status: "archived" });
}

/* =========================================================================
 * Provident fund & EOBI settings
 * ========================================================================= */

const pfSettingCrud = makeCrud(pfSettings, "pf_setting");
export const listPfSettings = pfSettingCrud.listAll;

export function setPfPercent(tenantId: UUID, percent: number, effectiveFrom: string): PfSetting {
  return pfSettingCrud.create(tenantId, { percent, effective_from: effectiveFrom });
}

export function getCurrentPfPercent(tenantId: UUID, asOf: string = today()): number {
  ensureHydrated();
  const applicable = pfSettings
    .filter((p) => p.tenant_id === tenantId && p.is_active !== false && p.effective_from <= asOf)
    .sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1));
  return applicable[0]?.percent ?? 0;
}

const pfContributionCrud = makeCrud(pfContributions, "pf_contribution");
export const listPfContributions = pfContributionCrud.listAll;

export function listPfContributionsForEmployee(employeeId: UUID): PfContribution[] {
  ensureHydrated();
  return pfContributions.filter((p) => p.employee_id === employeeId);
}

const eobiSettingCrud = makeCrud(eobiSettings, "eobi_setting");
export const listEobiSettings = eobiSettingCrud.listAll;

export function setEobiAmount(tenantId: UUID, amount: number, effectiveFrom: string): EobiSetting {
  return eobiSettingCrud.create(tenantId, { amount, effective_from: effectiveFrom });
}

export function getCurrentEobiAmount(tenantId: UUID, asOf: string = today()): number {
  ensureHydrated();
  const applicable = eobiSettings
    .filter((e) => e.tenant_id === tenantId && e.is_active !== false && e.effective_from <= asOf)
    .sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1));
  return applicable[0]?.amount ?? 0;
}

/* =========================================================================
 * Payroll
 * ========================================================================= */

const payrollRunCrud = makeCrud(payrollRuns, "payroll_run");
export const listPayrollRuns = payrollRunCrud.listAll;
export const getPayrollRun = payrollRunCrud.getById;

const payrollItemCrud = makeCrud(payrollItems, "payroll_item");
export const listPayrollItems = payrollItemCrud.listAll;
export const updatePayrollItem = payrollItemCrud.update;
export const updatePayrollRun = payrollRunCrud.update;

export function getPayrollItemsForRun(runId: UUID): PayrollItem[] {
  ensureHydrated();
  return payrollItems.filter((p) => p.run_id === runId);
}

export function finalizePayrollRun(runId: UUID): PayrollRun | null {
  ensureHydrated();
  const run = payrollRuns.find((r) => r.id === runId);
  if (!run || run.status === "finalized") return run ?? null;
  const items = payrollItems.filter((p) => p.run_id === runId);
  markLoanInstallmentsPaidForRun(run.tenant_id, run.id, items);
  const date = `${run.period}-28`;
  const gross = items.reduce((s, i) => s + i.basic + i.allowances + (i.overtime_pay ?? 0), 0);
  const tax = items.reduce((s, i) => s + (i.tax ?? 0), 0);
  const eobi = items.reduce((s, i) => s + (i.eobi ?? 0), 0);
  const pfEmp = items.reduce((s, i) => s + i.pf, 0);
  const loan = items.reduce((s, i) => s + (i.loan_deduction ?? 0), 0);
  const benefits = items.reduce((s, i) => s + (i.benefits ?? 0), 0);
  const lwp = items.reduce((s, i) => s + (i.lwp_amount ?? 0), 0);
  const net = items.reduce((s, i) => s + i.net, 0);
  postLedgerPair(run.tenant_id, date, `Payroll ${run.period} gross`, "Salaries Expense", "Salaries Payable", Math.max(0, gross - lwp), "payroll", run.id);
  if (tax) postLedgerPair(run.tenant_id, date, `Payroll ${run.period} PAYE`, "Salaries Payable", "Tax Payable", tax, "payroll", run.id);
  if (eobi) postLedgerPair(run.tenant_id, date, `Payroll ${run.period} EOBI`, "Salaries Payable", "EOBI Payable", eobi, "payroll", run.id);
  if (pfEmp) {
    postLedgerPair(run.tenant_id, date, `Payroll ${run.period} PF employee`, "Salaries Payable", "PF Payable", pfEmp, "payroll", run.id);
    postLedgerPair(run.tenant_id, date, `Payroll ${run.period} PF employer`, "PF Expense", "PF Payable", pfEmp, "payroll", run.id);
  }
  if (loan) postLedgerPair(run.tenant_id, date, `Payroll ${run.period} loan recovery`, "Salaries Payable", "Staff Loans Receivable", loan, "payroll", run.id);
  if (benefits) postLedgerPair(run.tenant_id, date, `Payroll ${run.period} benefits`, "Salaries Payable", "Benefits Payable", benefits, "payroll", run.id);
  if (net) postLedgerPair(run.tenant_id, date, `Payroll ${run.period} net payable`, "Salaries Payable", "Net Salaries Payable", net, "payroll", run.id);
  run.status = "finalized";
  run.updated_at = now();
  persist();
  return run;
}

export function generatePayroll(tenantId: UUID, period: string): { run: PayrollRun; items: PayrollItem[] } {
  ensureHydrated();
  const activeEmployees = employees.filter((e) => e.tenant_id === tenantId && e.is_active !== false && e.status === "active");
  const pfPercent = getCurrentPfPercent(tenantId);
  const eobiFlat = getCurrentEobiAmount(tenantId);

  const computed = activeEmployees.map((employee) => {
    const basic = employee.basic_salary;
    const housing = housingAllowance(employee);
    const transport = transportAllowance(employee);
    const medical = medicalAllowance(employee);
    const allowances = allowanceTotal(employee);
    const tax = estimatedIncomeTax(employee);
    const eobi = isEobiEnrolled(employee) ? eobiFlat : 0;
    const pf = isPfEnrolled(employee) ? Math.round((basic * pfPercent) / 100) : 0;
    const loanDeduction = sumDueLoanInstallments(tenantId, employee.id, period);
    const lwpDays = unpaidLeaveDaysInPeriod(tenantId, employee.id, period);
    const lwpAmount = Math.round((basic / 26) * lwpDays);
    const deductions = tax + eobi;
    const net = basic + allowances - deductions - pf - loanDeduction - lwpAmount;
    return { employee, basic, allowances, deductions, pf, net, tax, eobi, housing, transport, medical, loanDeduction, lwpDays, lwpAmount };
  });

  const total_gross = computed.reduce((sum, c) => sum + c.basic + c.allowances, 0);
  const total_net = computed.reduce((sum, c) => sum + c.net, 0);

  const run = payrollRunCrud.create(tenantId, {
    period,
    status: "draft",
    total_gross,
    total_net,
    employee_count: computed.length
  });

  const items = computed.map((c) =>
    payrollItemCrud.create(tenantId, {
      run_id: run.id,
      employee_id: c.employee.id,
      basic: c.basic,
      allowances: c.allowances,
      deductions: c.deductions,
      pf: c.pf,
      tax: c.tax,
      eobi: c.eobi,
      housing: c.housing,
      transport: c.transport,
      medical: c.medical,
      loan_deduction: c.loanDeduction,
      lwp_days: c.lwpDays,
      lwp_amount: c.lwpAmount,
      net: c.net
    })
  );

  for (const c of computed) {
    if (c.pf <= 0) continue;
    pfContributionCrud.create(tenantId, {
      employee_id: c.employee.id,
      period,
      employee_amount: c.pf,
      employer_amount: c.pf
    });
  }

  return { run, items };
}

/* =========================================================================
 * Loans — policy, eligibility, EMI schedule, payroll recovery
 * ========================================================================= */

function ensureLoanPolicy(tenantId: UUID): LoanPolicy {
  ensureHydrated();
  let policy = loanPolicies.find((p) => p.tenant_id === tenantId && p.is_active !== false);
  if (!policy) {
    policy = {
      ...defaultLoanPolicy(tenantId),
      id: id(),
      created_at: now(),
      updated_at: now()
    } as LoanPolicy;
    loanPolicies.push(policy);
    persist();
  }
  return policy;
}

export function getLoanPolicy(tenantId: UUID) {
  ensureHydrated();
  return ensureLoanPolicy(tenantId);
}

export function saveLoanPolicy(tenantId: UUID, data: Partial<LoanPolicy>) {
  ensureHydrated();
  const policy = ensureLoanPolicy(tenantId);
  Object.assign(policy, data, { updated_at: now() });
  persist();
  return policy;
}

export function listLoanInstallments(loanId: UUID) {
  ensureHydrated();
  return loanInstallments
    .filter((i) => i.loan_id === loanId && i.is_active !== false)
    .sort((a, b) => a.installment_no - b.installment_no);
}

function countActiveLoans(tenantId: UUID, employeeId: UUID) {
  return loans.filter(
    (l) =>
      l.tenant_id === tenantId &&
      l.employee_id === employeeId &&
      l.is_active !== false &&
      (l.status === "approved" || l.status === "active")
  ).length;
}

export function evaluateLoanEligibility(tenantId: UUID, employeeId: UUID, amount: number, tenureMonths: number) {
  ensureHydrated();
  const employee = employees.find((e) => e.id === employeeId && e.tenant_id === tenantId);
  if (!employee) return { ok: false, errors: ["Employee not found."], warnings: [], grossSalary: 0, tenureMonths: 0, maxAllowedAmount: 0 };
  const policy = ensureLoanPolicy(tenantId);
  return checkLoanEligibility(policy, employee, amount, tenureMonths, countActiveLoans(tenantId, employeeId));
}

export function previewLoanEmi(tenantId: UUID, amount: number, tenureMonths: number, interestRate?: number) {
  ensureHydrated();
  const policy = ensureLoanPolicy(tenantId);
  const rate = interestRate ?? policy.default_interest_rate;
  return computeEmi(amount, rate, tenureMonths);
}

const loanCrud = makeCrud(loans, "loan");
export const listLoans = loanCrud.listAll;

export function createLoan(
  tenantId: UUID,
  data: Omit<Loan, "id" | "tenant_id" | "created_at" | "updated_at" | "repayment_amount" | "outstanding_balance"> & {
    tenure_months: number;
    interest_rate?: number;
  }
) {
  ensureHydrated();
  const policy = ensureLoanPolicy(tenantId);
  const eligibility = evaluateLoanEligibility(tenantId, data.employee_id, data.amount, data.tenure_months);
  if (!eligibility.ok) {
    throw new Error(eligibility.errors.join(" "));
  }
  const interest = data.interest_rate ?? policy.default_interest_rate;
  const emi = computeEmi(data.amount, interest, data.tenure_months);
  const row = loanCrud.create(tenantId, {
    ...data,
    loan_type: data.loan_type ?? "salary_advance",
    interest_rate: interest,
    repayment_amount: emi,
    outstanding_balance: 0,
    policy_id: policy.id,
    status: data.status ?? "pending"
  });
  return normalizeLoanFields(row!);
}

export const updateLoan = loanCrud.update;

export function approveLoan(loanId: UUID, approvedBy: string): Loan | null {
  ensureHydrated();
  const loan = loans.find((l) => l.id === loanId);
  if (!loan || loan.status !== "pending") return null;
  loan.status = "approved";
  loan.approved_by = approvedBy;
  loan.approved_at = now();
  loan.updated_at = now();
  persist();
  logAction({ tenantId: loan.tenant_id, module: "hrm", entityName: "loan", entityId: loan.id, action: "update", newData: { approved_by: approvedBy } });
  return normalizeLoanFields(loan);
}

export function rejectLoan(loanId: UUID): Loan | null {
  ensureHydrated();
  return loanCrud.update(loanId, { status: "rejected" });
}

function persistInstallmentSchedule(tenantId: UUID, loanId: UUID, rows: ReturnType<typeof buildInstallmentSchedule>) {
  for (const row of loanInstallments.filter((i) => i.loan_id === loanId)) {
    row.is_active = false;
  }
  for (const row of rows) {
    loanInstallments.push({
      ...row,
      id: id(),
      tenant_id: tenantId,
      loan_id: loanId,
      created_at: now(),
      updated_at: now(),
      is_active: true,
      paid_at: null,
      payroll_run_id: null,
      payroll_item_id: null
    });
  }
}

export function activateLoan(loanId: UUID): Loan | null {
  ensureHydrated();
  const loan = loans.find((l) => l.id === loanId);
  if (!loan || loan.status !== "approved") return null;
  const normalized = normalizeLoanFields(loan);
  const schedule = buildInstallmentSchedule(
    normalized.amount,
    normalized.interest_rate ?? 0,
    normalized.tenure_months ?? 12,
    normalized.start_date
  );
  persistInstallmentSchedule(loan.tenant_id, loan.id, schedule);
  loan.status = "active";
  loan.outstanding_balance = loanOutstandingFromSchedule(loanInstallments.filter((i) => i.loan_id === loan.id && i.is_active !== false));
  loan.disbursed_at = now();
  loan.repayment_amount = schedule[0]?.total_amount ?? loan.repayment_amount;
  loan.updated_at = now();
  createEmployeeDisbursement(loan.tenant_id, {
    employee_id: loan.employee_id,
    amount: loan.amount,
    purpose: "loan",
    reference: `LOAN-${loan.id.slice(0, 8).toUpperCase()}`,
    notes: `Loan disbursement — ${loan.reason}`,
    loan_id: loan.id
  });
  persist();
  return normalizeLoanFields(loan);
}

export function closeLoan(loanId: UUID): Loan | null {
  ensureHydrated();
  const loan = loans.find((l) => l.id === loanId);
  if (!loan || loan.status !== "active") return null;
  const pending = listLoanInstallments(loanId).filter((i) => i.status === "pending" || i.status === "overdue");
  if (pending.length > 0) {
    throw new Error("Cannot close loan with unpaid installments.");
  }
  loan.status = "closed";
  loan.outstanding_balance = 0;
  loan.updated_at = now();
  persist();
  return normalizeLoanFields(loan);
}

function sumDueLoanInstallments(tenantId: UUID, employeeId: UUID, period: string) {
  ensureHydrated();
  const periodEnd = new Date(`${period}-28`);
  let total = 0;
  for (const loan of loans.filter((l) => l.tenant_id === tenantId && l.employee_id === employeeId && l.status === "active")) {
    for (const inst of listLoanInstallments(loan.id)) {
      if (inst.status !== "pending" && inst.status !== "overdue") continue;
      const due = new Date(inst.due_date);
      if (due <= periodEnd) total += inst.total_amount;
    }
  }
  return Math.round(total * 100) / 100;
}

function markLoanInstallmentsPaidForRun(tenantId: UUID, runId: UUID, items: PayrollItem[]) {
  for (const item of items) {
    const deduction = item.loan_deduction ?? 0;
    if (deduction <= 0) continue;
    let remaining = deduction;
    for (const loan of loans.filter((l) => l.tenant_id === tenantId && l.employee_id === item.employee_id && l.status === "active")) {
      for (const inst of listLoanInstallments(loan.id)) {
        if (remaining <= 0) break;
        if (inst.status !== "pending" && inst.status !== "overdue") continue;
        inst.status = "paid";
        inst.paid_at = now();
        inst.payroll_run_id = runId;
        inst.payroll_item_id = item.id;
        inst.updated_at = now();
        remaining -= inst.total_amount;
        loan.outstanding_balance = Math.max(0, Math.round(((loan.outstanding_balance ?? 0) - inst.total_amount) * 100) / 100);
        loan.updated_at = now();
        if ((loan.outstanding_balance ?? 0) <= 0) {
          loan.status = "closed";
        }
      }
    }
  }
  persist();
}

export function getLoanOutstandingTotal(tenantId: UUID) {
  ensureHydrated();
  return loans
    .filter((l) => l.tenant_id === tenantId && l.status === "active")
    .reduce((sum, l) => sum + (l.outstanding_balance ?? 0), 0);
}

/* =========================================================================
 * Disciplinary actions
 * ========================================================================= */

const disciplinaryActionCrud = makeCrud(disciplinaryActions, "disciplinary_action");
export const listDisciplinaryActions = disciplinaryActionCrud.listAll;
export const createDisciplinaryAction = disciplinaryActionCrud.create;
export const deleteDisciplinaryAction = disciplinaryActionCrud.remove;

/* =========================================================================
 * HR notifications
 * ========================================================================= */

const hrNotificationCrud = makeCrud(hrNotifications, "hr_notification");
export const listHrNotifications = hrNotificationCrud.listAll;
export const createHrNotification = hrNotificationCrud.create;

export function markHrNotificationRead(notificationId: UUID): HrNotification | null {
  return hrNotificationCrud.update(notificationId, { read: true });
}

/* =========================================================================
 * Salary / employee disbursements (company pays employee bank accounts)
 * ========================================================================= */

const paymentTxnCrud = makeCrud(paymentTxns, "payment_txn");
export const listPaymentTxns = paymentTxnCrud.listAll;
export const createPaymentTxn = paymentTxnCrud.create;

export function markPaymentPaid(txnId: UUID, opts?: { reference?: string | null; notes?: string | null }): PaymentTxn | null {
  const patch: Partial<PaymentTxn> = { status: "paid" };
  if (opts?.reference !== undefined) patch.reference = opts.reference;
  if (opts?.notes !== undefined) patch.notes = opts.notes;
  return paymentTxnCrud.update(txnId, patch);
}

/** Apply a successful demo payout from any platform. */
export function completePayoutFromProvider(
  txnId: UUID,
  data: { provider: string; reference: string; message?: string }
): PaymentTxn | null {
  ensureHydrated();
  const txn = paymentTxns.find((t) => t.id === txnId);
  if (!txn) return null;
  return paymentTxnCrud.update(txnId, {
    status: "paid",
    method: data.provider,
    reference: data.reference,
    notes: [txn.notes, data.message ?? `Paid via ${data.provider}`].filter(Boolean).join(" · ")
  });
}

/** Local-only demo transfer (no external API). */
export function simulateBankTransfer(txnId: UUID): PaymentTxn | null {
  ensureHydrated();
  const txn = paymentTxns.find((t) => t.id === txnId);
  if (!txn) return null;
  if (txn.status !== "pending") return txn;
  const empKey = typeof txn.employee_id === "string" ? txn.employee_id.slice(0, 8).toUpperCase() : "EMP";
  const ref = `DEMO-XFER-${today().replace(/-/g, "")}-${empKey}`;
  return completePayoutFromProvider(txnId, {
    provider: "ach",
    reference: ref,
    message: "Simulated ACH transfer (local demo)"
  });
}

export function markPaymentFailed(txnId: UUID): PaymentTxn | null {
  return paymentTxnCrud.update(txnId, { status: "failed" });
}

/**
 * Create one pending bank disbursement per payroll line item.
 * Use after a payroll run is finalized — this is the “pay employees” step.
 */
export function createSalaryDisbursementsFromPayroll(tenantId: UUID, runId: UUID): PaymentTxn[] {
  ensureHydrated();
  const run = payrollRuns.find((r) => r.id === runId && r.tenant_id === tenantId);
  if (!run) throw new Error("Payroll run not found.");
  if (run.status !== "finalized") throw new Error("Finalize the payroll run before creating salary disbursements.");

  const existing = paymentTxns.filter(
    (t) => t.tenant_id === tenantId && t.payroll_run_id === runId && t.is_active !== false
  );
  if (existing.length) {
    throw new Error("Salary disbursements for this payroll period already exist.");
  }

  const items = payrollItems.filter((i) => i.run_id === runId && i.is_active !== false);
  const created: PaymentTxn[] = [];
  for (const item of items) {
    const employee = employees.find((e) => e.id === item.employee_id);
    if (!employee) continue;
    created.push(
      paymentTxnCrud.create(tenantId, {
        employee_id: employee.id,
        amount: item.net,
        method: "bank_transfer",
        purpose: "salary",
        reference: `SAL-${run.period}-${employee.employee_no}`,
        status: "pending",
        notes: `Salary for ${run.period}`,
        payroll_run_id: run.id,
        payroll_item_id: item.id,
        bank_name: employee.bank_name ?? null,
        bank_account: employee.bank_account ?? null
      })
    );
  }
  return created;
}

/** Ad-hoc company → employee payout (loan, advance, reimbursement). */
export function createEmployeeDisbursement(
  tenantId: UUID,
  data: {
    employee_id: UUID;
    amount: number;
    purpose: PaymentPurpose;
    method?: string;
    reference?: string | null;
    notes?: string | null;
    loan_id?: UUID | null;
  }
): PaymentTxn {
  ensureHydrated();
  const employee = employees.find((e) => e.id === data.employee_id && e.tenant_id === tenantId);
  if (!employee) throw new Error("Employee not found.");
  if (!data.amount || data.amount <= 0) throw new Error("Amount must be greater than zero.");

  return paymentTxnCrud.create(tenantId, {
    employee_id: employee.id,
    amount: data.amount,
    method: data.method ?? "bank_transfer",
    purpose: data.purpose,
    reference: data.reference?.trim() || null,
    status: "pending",
    notes: data.notes?.trim() || null,
    payroll_run_id: null,
    payroll_item_id: null,
    bank_name: employee.bank_name ?? null,
    bank_account: employee.bank_account ?? null,
    loan_id: data.loan_id ?? null
  });
}

export function markPayrollDisbursementsPaid(tenantId: UUID, runId: UUID): number {
  ensureHydrated();
  let count = 0;
  for (const txn of paymentTxns) {
    if (txn.tenant_id !== tenantId || txn.payroll_run_id !== runId || txn.status !== "pending") continue;
    paymentTxnCrud.update(txn.id, { status: "paid" });
    count += 1;
  }
  return count;
}

/* =========================================================================
 * Workflow integrations
 * ========================================================================= */

const workflowIntegrationCrud = makeCrud(workflowIntegrations, "workflow_integration");
export const listWorkflowIntegrations = workflowIntegrationCrud.listAll;
export const createWorkflowIntegration = workflowIntegrationCrud.create;
export const updateWorkflowIntegration = workflowIntegrationCrud.update;

export function toggleWorkflowIntegration(integrationId: UUID, enabled: boolean): WorkflowIntegration | null {
  return workflowIntegrationCrud.update(integrationId, { enabled });
}

/* =========================================================================
 * Security policy (one per tenant)
 * ========================================================================= */

const securityPolicyCrud = makeCrud(securityPolicies, "security_policy");

export function getSecurityPolicy(tenantId: UUID): SecurityPolicy | undefined {
  ensureHydrated();
  return securityPolicies.find((s) => s.tenant_id === tenantId && s.is_active !== false);
}

export function upsertSecurityPolicy(tenantId: UUID, data: Omit<SecurityPolicy, keyof TenantEntity>): SecurityPolicy {
  const existing = getSecurityPolicy(tenantId);
  if (existing) return securityPolicyCrud.update(existing.id, data) as SecurityPolicy;
  return securityPolicyCrud.create(tenantId, data);
}

/* =========================================================================
 * Dashboard stats
 * ========================================================================= */

export function hrmStats(tenantId: UUID): HrmStats {
  ensureHydrated();
  const tenantEmployees = employees.filter((e) => e.tenant_id === tenantId && e.is_active !== false);
  const activeEmployees = tenantEmployees.filter((e) => e.status === "active");
  const todayDate = today();
  const todaysAttendance = attendanceRecords.filter((a) => a.tenant_id === tenantId && a.attendance_date === todayDate);
  const presentToday = todaysAttendance.filter((a) => a.status === "present" || a.status === "late" || a.status === "half_day").length;
  const attendanceTodayPct = activeEmployees.length > 0 ? Math.round((presentToday / activeEmployees.length) * 100) : 0;
  const pendingLeaves = leaveRequests.filter((l) => l.tenant_id === tenantId && l.status === "pending").length;
  const payrollTotal = payrollRuns.filter((p) => p.tenant_id === tenantId).reduce((sum, p) => sum + p.total_net, 0);
  const openCandidates = candidates.filter((c) => c.tenant_id === tenantId && c.stage !== "hired" && c.stage !== "rejected").length;
  const pendingTimesheets = timesheets.filter((t) => t.tenant_id === tenantId && t.status === "submitted").length;

  return {
    employees: tenantEmployees.length,
    activeEmployees: activeEmployees.length,
    pendingLeaves,
    attendanceTodayPct,
    payrollTotal,
    openCandidates,
    pendingTimesheets
  };
}

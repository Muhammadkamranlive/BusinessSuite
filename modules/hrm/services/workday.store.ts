import type { TenantEntity, UUID } from "@/modules/core/types";
import { logAction, logCreate, logUpdate } from "@/modules/core/services/audit.service";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";
import {
  createTimesheet,
  createEmployee,
  createOnboardingTask,
  generatePayroll,
  getCandidate,
  getEmployee,
  getPayrollItemsForRun,
  getPayrollRun,
  listDepartments,
  listDesignations,
  listEmployees,
  listLeaveTypes,
  listTimesheets,
  updateCandidate,
  updateEmployee,
  updatePayrollItem,
  updatePayrollRun
} from "@/modules/hrm/services/hrm.store";
import type {
  BenefitEnrollment,
  BenefitPlan,
  CostCenter,
  CostingAllocation,
  Goal,
  IdentityDocument,
  InboxTask,
  JobChange,
  JobFamily,
  JobProfile,
  JobRequisition,
  LeaveBalance,
  OffboardingTask,
  PayGrade,
  PaymentElection,
  PerformanceReview,
  PersonalDataRequest,
  Position,
  WorkLocation,
  WorkerCertification,
  WorkerDependent,
  WorkerEducation,
  WorkerEmergencyContact,
  WorkerExperience,
  WorkerProfile
} from "@/modules/hrm/workday-model";

const STORAGE_KEY = "businesssuite:hrm-workday:v1";
const STORAGE_VERSION = 1;
const ALPHA = "alpha";

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

const locations: WorkLocation[] = [];
const costCenters: CostCenter[] = [];
const jobFamilies: JobFamily[] = [];
const jobProfiles: JobProfile[] = [];
const payGrades: PayGrade[] = [];
const positions: Position[] = [];
const workerProfiles: WorkerProfile[] = [];
const dependents: WorkerDependent[] = [];
const emergencyContacts: WorkerEmergencyContact[] = [];
const education: WorkerEducation[] = [];
const experience: WorkerExperience[] = [];
const certifications: WorkerCertification[] = [];
const identityDocs: IdentityDocument[] = [];
const paymentElections: PaymentElection[] = [];
const benefitPlans: BenefitPlan[] = [];
const enrollments: BenefitEnrollment[] = [];
const leaveBalances: LeaveBalance[] = [];
const jobChanges: JobChange[] = [];
const inbox: InboxTask[] = [];
const personalRequests: PersonalDataRequest[] = [];
const goals: Goal[] = [];
const reviews: PerformanceReview[] = [];
const requisitions: JobRequisition[] = [];
const offboarding: OffboardingTask[] = [];
const costing: CostingAllocation[] = [];

type Snapshot = {
  version: number;
  locations: WorkLocation[];
  costCenters: CostCenter[];
  jobFamilies: JobFamily[];
  jobProfiles: JobProfile[];
  payGrades: PayGrade[];
  positions: Position[];
  workerProfiles: WorkerProfile[];
  dependents: WorkerDependent[];
  emergencyContacts: WorkerEmergencyContact[];
  education: WorkerEducation[];
  experience: WorkerExperience[];
  certifications: WorkerCertification[];
  identityDocs: IdentityDocument[];
  paymentElections: PaymentElection[];
  benefitPlans: BenefitPlan[];
  enrollments: BenefitEnrollment[];
  leaveBalances: LeaveBalance[];
  jobChanges: JobChange[];
  inbox: InboxTask[];
  personalRequests: PersonalDataRequest[];
  goals: Goal[];
  reviews: PerformanceReview[];
  requisitions: JobRequisition[];
  offboarding: OffboardingTask[];
  costing: CostingAllocation[];
};

function buildSnapshot(): Snapshot {
  return {
    version: STORAGE_VERSION,
    locations,
    costCenters,
    jobFamilies,
    jobProfiles,
    payGrades,
    positions,
    workerProfiles,
    dependents,
    emergencyContacts,
    education,
    experience,
    certifications,
    identityDocs,
    paymentElections,
    benefitPlans,
    enrollments,
    leaveBalances,
    jobChanges,
    inbox,
    personalRequests,
    goals,
    reviews,
    requisitions,
    offboarding,
    costing
  };
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

function queueRemoteSync() {
  if (typeof window === "undefined") return;
  if (process.env.NEXT_PUBLIC_HRM_USE_SUPABASE === "false") return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void fetch("/api/hrm/workday-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildSnapshot())
    }).catch(() => {
      /* offline — localStorage remains source of truth */
    });
  }, 1200);
}

function persist() {
  savePersisted(STORAGE_KEY, buildSnapshot());
  queueRemoteSync();
}

function replaceAll<T>(target: T[], source?: T[]) {
  target.length = 0;
  if (source?.length) target.push(...source);
}

let hydrated = false;

function empByEmail(email: string) {
  return listEmployees(ALPHA).find((e) => e.email.toLowerCase() === email.toLowerCase()) ?? null;
}

function seedAlphaWorkday() {
  if (locations.some((l) => l.tenant_id === ALPHA)) return;

  const locDip = seed(ALPHA, { name: "Dubai Investment Park", code: "DIP", city: "Dubai", country: "UAE", address: "Plot 14, Sector B" }) as WorkLocation;
  const locDxb = seed(ALPHA, { name: "Business Bay", code: "BAY", city: "Dubai", country: "UAE", address: "Bay Avenue" }) as WorkLocation;
  locations.push(locDip, locDxb);

  const ccCorp = seed(ALPHA, { name: "Corporate", code: "CC-100", description: "HQ overhead" }) as CostCenter;
  const ccEng = seed(ALPHA, { name: "Engineering", code: "CC-200", description: "Product delivery" }) as CostCenter;
  const ccSales = seed(ALPHA, { name: "Sales", code: "CC-300", description: "Revenue" }) as CostCenter;
  costCenters.push(ccCorp, ccEng, ccSales);

  const famLead = seed(ALPHA, { name: "Leadership", code: "FAM-LEAD", description: "Company officers" }) as JobFamily;
  const famEng = seed(ALPHA, { name: "Engineering", code: "FAM-ENG", description: "Build and run product" }) as JobFamily;
  const famHr = seed(ALPHA, { name: "People", code: "FAM-HR", description: "HR and culture" }) as JobFamily;
  const famCom = seed(ALPHA, { name: "Commercial", code: "FAM-COM", description: "Sales and warehouse" }) as JobFamily;
  jobFamilies.push(famLead, famEng, famHr, famCom);

  const g1 = seed(ALPHA, { name: "Grade 1 — Officer", code: "G1", min_salary: 1500, mid_salary: 2500, max_salary: 3500 }) as PayGrade;
  const g2 = seed(ALPHA, { name: "Grade 2 — Professional", code: "G2", min_salary: 3000, mid_salary: 4500, max_salary: 6000 }) as PayGrade;
  const g3 = seed(ALPHA, { name: "Grade 3 — Manager", code: "G3", min_salary: 5500, mid_salary: 7500, max_salary: 10000 }) as PayGrade;
  const g4 = seed(ALPHA, { name: "Grade 4 — Executive", code: "G4", min_salary: 9000, mid_salary: 12000, max_salary: 18000 }) as PayGrade;
  payGrades.push(g1, g2, g3, g4);

  const jpGm = seed(ALPHA, { family_id: famLead.id, title: "General Manager", code: "JP-GM", job_level: "M4", description: "P&L owner", pay_grade_id: g4.id }) as JobProfile;
  const jpHr = seed(ALPHA, { family_id: famHr.id, title: "HR Manager", code: "JP-HRM", job_level: "M2", pay_grade_id: g3.id, description: "People operations" }) as JobProfile;
  const jpEng = seed(ALPHA, { family_id: famEng.id, title: "Engineering Manager", code: "JP-EM", job_level: "M2", pay_grade_id: g3.id, description: "Engineering lead" }) as JobProfile;
  const jpSales = seed(ALPHA, { family_id: famCom.id, title: "Sales Team Lead", code: "JP-STL", job_level: "M1", pay_grade_id: g3.id, description: "Sales pod" }) as JobProfile;
  const jpSe = seed(ALPHA, { family_id: famEng.id, title: "Software Engineer", code: "JP-SE", job_level: "P2", pay_grade_id: g2.id, description: "IC engineer" }) as JobProfile;
  jobProfiles.push(jpGm, jpHr, jpEng, jpSales, jpSe);

  const depts = listDepartments(ALPHA);
  const dept = (code: string) => depts.find((d) => d.code === code)?.id ?? depts[0]?.id ?? "";

  const omar = empByEmail("omar.farooq@alpha.example") ?? empByEmail("manager@demo.com");
  const sana = empByEmail("sana@alpha.example") ?? empByEmail("hr@demo.com");
  const hassan = empByEmail("employee@demo.com");
  const bilal = empByEmail("bilal@alpha.example");
  const ayesha = empByEmail("ayesha@alpha.example");

  const pos = (
    code: string,
    title: string,
    profile: JobProfile,
    departmentId: UUID,
    worker: typeof omar,
    loc: WorkLocation,
    cc: CostCenter
  ) =>
    seed(ALPHA, {
      code,
      title,
      job_profile_id: profile.id,
      department_id: departmentId,
      location_id: loc.id,
      cost_center_id: cc.id,
      worker_id: worker?.id ?? null,
      status: worker ? "filled" : "open",
      fte: 1,
      headcount: 1
    }) as Position;

  const pGm = pos("POS-001", "General Manager", jpGm, dept("EXC") || dept("HR"), omar, locDip, ccCorp);
  const pHr = pos("POS-002", "HR Manager", jpHr, dept("HR"), sana, locDip, ccCorp);
  const pEm = pos("POS-003", "Engineering Manager", jpEng, dept("ENG"), hassan, locDxb, ccEng);
  const pSt = pos("POS-004", "Sales Team Lead", jpSales, dept("SAL"), bilal, locDip, ccSales);
  const pVac = pos("POS-005", "Software Engineer", jpSe, dept("ENG"), null, locDxb, ccEng);
  positions.push(pGm, pHr, pEm, pSt, pVac);

  function attachWorker(
    emp: NonNullable<typeof hassan>,
    extras: Partial<WorkerProfile> & { position: Position; grade: PayGrade; loc: WorkLocation; cc: CostCenter }
  ) {
    workerProfiles.push(
      seed(ALPHA, {
        employee_id: emp.id,
        preferred_name: emp.full_name.split(" ")[0],
        legal_name: emp.full_name,
        pronouns: "they/them",
        worker_type: emp.employment_type === "contract" ? "contingent" : "employee",
        position_id: extras.position.id,
        location_id: extras.loc.id,
        cost_center_id: extras.cc.id,
        matrix_manager_id: extras.matrix_manager_id ?? null,
        pay_grade_id: extras.grade.id,
        probation_end: extras.probation_end ?? null,
        contract_end: extras.contract_end ?? null,
        confirmation_date: extras.confirmation_date ?? emp.joining_date,
        notice_days: 30,
        overtime_eligible: extras.overtime_eligible ?? true
      }) as WorkerProfile
    );
    paymentElections.push(
      seed(ALPHA, {
        employee_id: emp.id,
        bank_name: emp.bank_name ?? "HBL",
        bank_account: emp.bank_account ?? "PK00",
        percent: 100,
        is_primary: true
      }) as PaymentElection
    );
    costing.push(
      seed(ALPHA, {
        employee_id: emp.id,
        cost_center_id: extras.cc.id,
        percent: 100,
        effective_from: emp.joining_date
      }) as CostingAllocation
    );
  }

  if (omar) attachWorker(omar, { position: pGm, grade: g4, loc: locDip, cc: ccCorp, overtime_eligible: false, confirmation_date: "2018-07-10" });
  if (sana) attachWorker(sana, { position: pHr, grade: g3, loc: locDip, cc: ccCorp, confirmation_date: "2024-07-15" });
  if (hassan) {
    attachWorker(hassan, { position: pEm, grade: g3, loc: locDxb, cc: ccEng, confirmation_date: "2021-09-05" });
    dependents.push(
      seed(ALPHA, { employee_id: hassan.id, full_name: "Noor Tariq", relation: "Spouse", date_of_birth: "1994-04-12", national_id: "35202-1111222-3" }) as WorkerDependent
    );
    emergencyContacts.push(
      seed(ALPHA, {
        employee_id: hassan.id,
        full_name: "Tariq Mehmood",
        relation: "Father",
        phone: "+971 55 200 1005",
        email: "tariq.mehmood@example.com",
        is_primary: true
      }) as WorkerEmergencyContact
    );
    education.push(seed(ALPHA, { employee_id: hassan.id, school: "NUST", degree: "BSc", field: "Computer Science", year: "2016" }) as WorkerEducation);
    experience.push(
      seed(ALPHA, { employee_id: hassan.id, company: "Delta Systems", title: "Senior Engineer", start_date: "2016-08-01", end_date: "2021-02-28" }) as WorkerExperience
    );
    certifications.push(seed(ALPHA, { employee_id: hassan.id, name: "PMP", issuer: "PMI", expiry: "2027-03-01" }) as WorkerCertification);
    identityDocs.push(
      seed(ALPHA, { employee_id: hassan.id, kind: "passport", number: "AB1234567", country: "PK", issued_on: "2022-01-10", expiry: "2032-01-09" }) as IdentityDocument,
      seed(ALPHA, { employee_id: hassan.id, kind: "visa", number: "UAE-RES-77881", country: "AE", issued_on: "2024-02-01", expiry: "2026-12-31" }) as IdentityDocument,
      seed(ALPHA, { employee_id: hassan.id, kind: "labour_card", number: "LC-88901", country: "AE", issued_on: "2024-02-01", expiry: "2026-12-31" }) as IdentityDocument
    );
    goals.push(
      seed(ALPHA, { employee_id: hassan.id, title: "Ship ERP Cloud Rollout v1", period: "2026-H2", progress: 65, status: "in_progress", notes: "Payroll + HRM" }) as Goal
    );
    reviews.push(
      seed(ALPHA, {
        employee_id: hassan.id,
        cycle: "2025 Annual",
        rating: "exceeds",
        comments: "Delivered engineering roadmap and coached two ICs.",
        status: "completed",
        reviewer_name: omar?.full_name ?? "Omar Farooq"
      }) as PerformanceReview
    );
  }
  if (bilal) attachWorker(bilal, { position: pSt, grade: g3, loc: locDip, cc: ccSales, confirmation_date: "2023-12-01" });
  if (ayesha) {
    workerProfiles.push(
      seed(ALPHA, {
        employee_id: ayesha.id,
        preferred_name: "Ayesha",
        legal_name: ayesha.full_name,
        pronouns: "she/her",
        worker_type: "employee",
        position_id: null,
        location_id: locDip.id,
        cost_center_id: ccSales.id,
        matrix_manager_id: hassan?.id ?? null,
        pay_grade_id: g2.id,
        probation_end: "2026-11-01",
        contract_end: null,
        confirmation_date: null,
        notice_days: 30,
        overtime_eligible: true
      }) as WorkerProfile
    );
  }

  benefitPlans.push(
    seed(ALPHA, { name: "Daman Enhanced Medical", category: "medical", employee_cost: 120, employer_cost: 380, description: "Inpatient + outpatient UAE" }) as BenefitPlan,
    seed(ALPHA, { name: "Basic Dental", category: "dental", employee_cost: 25, employer_cost: 40, description: "Preventive dental" }) as BenefitPlan,
    seed(ALPHA, { name: "Group Life 24x", category: "life", employee_cost: 0, employer_cost: 55, description: "24 months of basic" }) as BenefitPlan
  );
  const med = benefitPlans[0];
  const life = benefitPlans[2];
  for (const emp of [omar, sana, hassan, bilal].filter(Boolean)) {
    enrollments.push(
      seed(ALPHA, { employee_id: emp!.id, plan_id: med.id, coverage: emp === hassan ? "family" : "self", status: "enrolled", effective_from: emp!.joining_date }) as BenefitEnrollment,
      seed(ALPHA, { employee_id: emp!.id, plan_id: life.id, coverage: "self", status: "enrolled", effective_from: emp!.joining_date }) as BenefitEnrollment
    );
  }

  requisitions.push(
    seed(ALPHA, {
      title: "Software Engineer",
      department_id: dept("ENG"),
      position_id: pVac.id,
      location_id: locDxb.id,
      openings: 1,
      status: "open",
      reason: "Backfill for product squad"
    }) as JobRequisition
  );

  if (hassan && omar) {
    const change = seed(ALPHA, {
      employee_id: hassan.id,
      type: "promote",
      effective_date: "2021-09-05",
      status: "completed",
      reason: "Promotion to Engineering Manager",
      from_designation_id: hassan.designation_id,
      to_designation_id: hassan.designation_id,
      from_salary: 5200,
      to_salary: 6200,
      requested_by: "hr@demo.com"
    }) as JobChange;
    jobChanges.push(change);
  }

  inbox.push(
    seed(ALPHA, {
      kind: "requisition",
      title: "Approve job requisition: Software Engineer",
      body: "Engineering requested 1 opening on POS-005.",
      status: "pending",
      assignee_email: "hr@demo.com",
      subject_employee_id: hassan?.id ?? null,
      ref_id: requisitions[0].id,
      requested_by: "manager@demo.com"
    }) as InboxTask
  );

  accrueLeaveForTenant(ALPHA, new Date().getFullYear());
}

function accrueLeaveForTenant(tenantId: UUID, year: number) {
  const types = listLeaveTypes(tenantId);
  const people = listEmployees(tenantId).filter((e) => e.status === "active" || e.status === "onboarding");
  for (const emp of people) {
    for (const type of types) {
      const exists = leaveBalances.some((b) => b.employee_id === emp.id && b.leave_type_id === type.id && b.year === year);
      if (exists) continue;
      leaveBalances.push(
        seed(tenantId, {
          employee_id: emp.id,
          leave_type_id: type.id,
          year,
          entitled: type.days_per_year,
          used: 0,
          pending: 0
        }) as LeaveBalance
      );
    }
  }
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  const snap = loadPersisted<Snapshot>(STORAGE_KEY);
  if (snap?.version === STORAGE_VERSION && Array.isArray(snap.locations) && snap.locations.length) {
    replaceAll(locations, snap.locations);
    replaceAll(costCenters, snap.costCenters);
    replaceAll(jobFamilies, snap.jobFamilies);
    replaceAll(jobProfiles, snap.jobProfiles);
    replaceAll(payGrades, snap.payGrades);
    replaceAll(positions, snap.positions);
    replaceAll(workerProfiles, snap.workerProfiles);
    replaceAll(dependents, snap.dependents);
    replaceAll(emergencyContacts, snap.emergencyContacts);
    replaceAll(education, snap.education);
    replaceAll(experience, snap.experience);
    replaceAll(certifications, snap.certifications);
    replaceAll(identityDocs, snap.identityDocs);
    replaceAll(paymentElections, snap.paymentElections);
    replaceAll(benefitPlans, snap.benefitPlans);
    replaceAll(enrollments, snap.enrollments);
    replaceAll(leaveBalances, snap.leaveBalances);
    replaceAll(jobChanges, snap.jobChanges);
    replaceAll(inbox, snap.inbox);
    replaceAll(personalRequests, snap.personalRequests);
    replaceAll(goals, snap.goals);
    replaceAll(reviews, snap.reviews);
    replaceAll(requisitions, snap.requisitions);
    replaceAll(offboarding, snap.offboarding);
    replaceAll(costing, snap.costing);
    accrueLeaveForTenant(ALPHA, new Date().getFullYear());
    persist();
    ensureDemoOtTimesheets();
    return;
  }
  seedAlphaWorkday();
  persist();
  ensureDemoOtTimesheets();
}

function ensureDemoOtTimesheets() {
  const hassan = empByEmail("employee@demo.com");
  if (!hassan) return;
  const ot = listTimesheets(ALPHA).filter((t) => t.employee_id === hassan.id && t.hours > 8);
  if (ot.length) return;
  createTimesheet(ALPHA, {
    employee_id: hassan.id,
    work_date: "2026-08-05",
    hours: 11,
    project: "ERP Cloud Rollout",
    notes: "Release overtime",
    status: "approved"
  });
  createTimesheet(ALPHA, {
    employee_id: hassan.id,
    work_date: "2026-08-06",
    hours: 10.5,
    project: "ERP Cloud Rollout",
    notes: "Cutover weekend",
    status: "approved"
  });
}

function makeCrud<T extends TenantEntity>(list: T[], entityName: string) {
  function listAll(tenantId: UUID) {
    ensureHydrated();
    return list.filter((r) => r.tenant_id === tenantId && r.is_active !== false);
  }
  function getById(itemId: UUID) {
    ensureHydrated();
    return list.find((r) => r.id === itemId) ?? null;
  }
  function create(tenantId: UUID, data: Omit<T, keyof TenantEntity>): T {
    ensureHydrated();
    const record = { ...data, id: id(), tenant_id: tenantId, created_at: now(), updated_at: now(), is_active: true } as unknown as T;
    list.unshift(record);
    logCreate({ tenantId, module: "hrm", entityName, entityId: record.id, newData: record as unknown as Record<string, unknown> });
    persist();
    return record;
  }
  function update(itemId: UUID, patch: Partial<T>): T | null {
    ensureHydrated();
    const index = list.findIndex((r) => r.id === itemId);
    if (index < 0) return null;
    const old = { ...list[index] };
    list[index] = { ...list[index], ...patch, updated_at: now() };
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
  function remove(itemId: UUID) {
    ensureHydrated();
    const row = list.find((r) => r.id === itemId);
    if (!row) return false;
    row.is_active = false;
    row.updated_at = now();
    persist();
    return true;
  }
  return { listAll, getById, create, update, remove };
}

const locationCrud = makeCrud(locations, "work_location");
export const listWorkLocations = locationCrud.listAll;
export const createWorkLocation = locationCrud.create;
export const updateWorkLocation = locationCrud.update;
export const trashWorkLocation = locationCrud.remove;
export function getWorkLocationName(id?: UUID | null) {
  ensureHydrated();
  if (!id) return "—";
  return locations.find((l) => l.id === id)?.name ?? "—";
}

const costCrud = makeCrud(costCenters, "cost_center");
export const listCostCenters = costCrud.listAll;
export const createCostCenter = costCrud.create;
export const updateCostCenter = costCrud.update;
export const trashCostCenter = costCrud.remove;
export function getCostCenterName(id?: UUID | null) {
  ensureHydrated();
  if (!id) return "—";
  return costCenters.find((c) => c.id === id)?.name ?? "—";
}

const familyCrud = makeCrud(jobFamilies, "job_family");
export const listJobFamilies = familyCrud.listAll;
export const createJobFamily = familyCrud.create;
export const updateJobFamily = familyCrud.update;
export const trashJobFamily = familyCrud.remove;

const profileCrud = makeCrud(jobProfiles, "job_profile");
export const listJobProfiles = profileCrud.listAll;
export const createJobProfile = profileCrud.create;
export const updateJobProfile = profileCrud.update;
export const trashJobProfile = profileCrud.remove;
export function getJobProfileTitle(id?: UUID | null) {
  ensureHydrated();
  if (!id) return "—";
  return jobProfiles.find((j) => j.id === id)?.title ?? "—";
}

const gradeCrud = makeCrud(payGrades, "pay_grade");
export const listPayGrades = gradeCrud.listAll;
export const createPayGrade = gradeCrud.create;
export const updatePayGrade = gradeCrud.update;
export const trashPayGrade = gradeCrud.remove;
export function getPayGradeName(id?: UUID | null) {
  ensureHydrated();
  if (!id) return "—";
  return payGrades.find((g) => g.id === id)?.name ?? "—";
}

const positionCrud = makeCrud(positions, "position");
export const listPositions = positionCrud.listAll;
export const createPosition = positionCrud.create;
export const updatePosition = positionCrud.update;
export const trashPosition = positionCrud.remove;
export function getPositionTitle(id?: UUID | null) {
  ensureHydrated();
  if (!id) return "—";
  return positions.find((p) => p.id === id)?.title ?? "—";
}

const wpCrud = makeCrud(workerProfiles, "worker_profile");
export function getWorkerProfile(employeeId: UUID) {
  ensureHydrated();
  return workerProfiles.find((w) => w.employee_id === employeeId && w.is_active !== false) ?? null;
}
export function upsertWorkerProfile(tenantId: UUID, employeeId: UUID, patch: Partial<WorkerProfile>) {
  const existing = getWorkerProfile(employeeId);
  if (existing) return wpCrud.update(existing.id, patch);
  return wpCrud.create(tenantId, {
    employee_id: employeeId,
    worker_type: "employee",
    overtime_eligible: true,
    ...patch
  } as Omit<WorkerProfile, keyof TenantEntity>);
}

const depCrud = makeCrud(dependents, "worker_dependent");
export const listDependents = (tenantId: UUID, employeeId?: UUID) =>
  depCrud.listAll(tenantId).filter((d) => !employeeId || d.employee_id === employeeId);
export const createDependent = depCrud.create;
export const trashDependent = depCrud.remove;

const emCrud = makeCrud(emergencyContacts, "emergency_contact");
export const listEmergencyContacts = (tenantId: UUID, employeeId?: UUID) =>
  emCrud.listAll(tenantId).filter((d) => !employeeId || d.employee_id === employeeId);
export const createEmergencyContact = emCrud.create;
export const trashEmergencyContact = emCrud.remove;

const eduCrud = makeCrud(education, "education");
export const listEducation = (tenantId: UUID, employeeId?: UUID) =>
  eduCrud.listAll(tenantId).filter((d) => !employeeId || d.employee_id === employeeId);
export const createEducation = eduCrud.create;
export const trashEducation = eduCrud.remove;

const expCrud = makeCrud(experience, "experience");
export const listExperience = (tenantId: UUID, employeeId?: UUID) =>
  expCrud.listAll(tenantId).filter((d) => !employeeId || d.employee_id === employeeId);
export const createExperience = expCrud.create;
export const trashExperience = expCrud.remove;

const certCrud = makeCrud(certifications, "certification");
export const listCertifications = (tenantId: UUID, employeeId?: UUID) =>
  certCrud.listAll(tenantId).filter((d) => !employeeId || d.employee_id === employeeId);
export const createCertification = certCrud.create;
export const trashCertification = certCrud.remove;

const idCrud = makeCrud(identityDocs, "identity_document");
export const listIdentityDocs = (tenantId: UUID, employeeId?: UUID) =>
  idCrud.listAll(tenantId).filter((d) => !employeeId || d.employee_id === employeeId);
export const createIdentityDoc = idCrud.create;
export const trashIdentityDoc = idCrud.remove;

export function expiringIdentityDocs(tenantId: UUID, withinDays = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);
  return listIdentityDocs(tenantId).filter((d) => {
    if (!d.expiry) return false;
    const exp = new Date(d.expiry);
    return exp <= cutoff;
  });
}

const payElCrud = makeCrud(paymentElections, "payment_election");
export const listPaymentElections = (tenantId: UUID, employeeId?: UUID) =>
  payElCrud.listAll(tenantId).filter((d) => !employeeId || d.employee_id === employeeId);
export const createPaymentElection = payElCrud.create;
export const trashPaymentElection = payElCrud.remove;

const planCrud = makeCrud(benefitPlans, "benefit_plan");
export const listBenefitPlans = planCrud.listAll;
export const createBenefitPlan = planCrud.create;
export const updateBenefitPlan = planCrud.update;
export const trashBenefitPlan = planCrud.remove;

const enrCrud = makeCrud(enrollments, "benefit_enrollment");
export const listEnrollments = (tenantId: UUID, employeeId?: UUID) =>
  enrCrud.listAll(tenantId).filter((d) => !employeeId || d.employee_id === employeeId);
export function enrollBenefit(tenantId: UUID, data: Omit<BenefitEnrollment, keyof TenantEntity>) {
  return enrCrud.create(tenantId, data);
}
export function updateEnrollment(id: UUID, patch: Partial<BenefitEnrollment>) {
  return enrCrud.update(id, patch);
}

export function listLeaveBalances(tenantId: UUID, employeeId?: UUID) {
  ensureHydrated();
  accrueLeaveForTenant(tenantId, new Date().getFullYear());
  persist();
  return leaveBalances.filter(
    (b) => b.tenant_id === tenantId && b.is_active !== false && (!employeeId || b.employee_id === employeeId)
  );
}

export function markLeavePending(employeeId: UUID, leaveTypeId: UUID, days: number) {
  ensureHydrated();
  const year = new Date().getFullYear();
  const row = leaveBalances.find((b) => b.employee_id === employeeId && b.leave_type_id === leaveTypeId && b.year === year);
  if (!row) return;
  row.pending += days;
  persist();
}

export function releaseLeavePending(employeeId: UUID, leaveTypeId: UUID | null | undefined, days: number) {
  ensureHydrated();
  if (!leaveTypeId) return;
  const year = new Date().getFullYear();
  const row = leaveBalances.find((b) => b.employee_id === employeeId && b.leave_type_id === leaveTypeId && b.year === year);
  if (!row) return;
  row.pending = Math.max(0, row.pending - days);
  persist();
}

export function consumeLeaveBalance(employeeId: UUID, leaveTypeId: UUID | null | undefined, days: number) {
  ensureHydrated();
  if (!leaveTypeId) return;
  const year = new Date().getFullYear();
  const row = leaveBalances.find((b) => b.employee_id === employeeId && b.leave_type_id === leaveTypeId && b.year === year);
  if (!row) return;
  row.used += days;
  row.pending = Math.max(0, row.pending - days);
  persist();
}

const jcCrud = makeCrud(jobChanges, "job_change");
export const listJobChanges = (tenantId: UUID, employeeId?: UUID) =>
  jcCrud.listAll(tenantId).filter((d) => !employeeId || d.employee_id === employeeId);
export const getJobChange = jcCrud.getById;

export function submitJobChange(
  tenantId: UUID,
  data: Omit<JobChange, keyof TenantEntity | "status">,
  assigneeEmail: string
) {
  const row = jcCrud.create(tenantId, { ...data, status: "pending" } as Omit<JobChange, keyof TenantEntity>);
  inbox.unshift(
    seed(tenantId, {
      kind: "job_change",
      title: `Approve ${data.type.replace("_", " ")} for ${getEmployee(data.employee_id)?.full_name ?? "worker"}`,
      body: `${data.reason} · effective ${data.effective_date}`,
      status: "pending",
      assignee_email: assigneeEmail,
      subject_employee_id: data.employee_id,
      ref_id: row.id,
      requested_by: data.requested_by
    }) as InboxTask
  );
  persist();
  return row;
}

export function completeJobChange(changeId: UUID) {
  ensureHydrated();
  const change = jobChanges.find((c) => c.id === changeId);
  if (!change) return null;
  const emp = getEmployee(change.employee_id);
  if (!emp) return null;
  const patch: Parameters<typeof updateEmployee>[1] = {};
  if (change.to_department_id) patch.department_id = change.to_department_id;
  if (change.to_manager_id !== undefined) patch.manager_id = change.to_manager_id;
  if (change.to_designation_id) patch.designation_id = change.to_designation_id;
  if (change.to_salary != null) patch.basic_salary = change.to_salary;
  if (change.type === "terminate") {
    patch.status = "terminated";
    patch.resignation_date = change.effective_date;
  }
  updateEmployee(emp.id, patch);
  if (change.to_location_id) upsertWorkerProfile(change.tenant_id, emp.id, { location_id: change.to_location_id });
  const profile = getWorkerProfile(emp.id);
  if (change.type === "terminate" && profile?.position_id) {
    updatePosition(profile.position_id, { worker_id: null, status: "open" });
    upsertWorkerProfile(change.tenant_id, emp.id, { position_id: null });
  }
  change.status = "completed";
  change.updated_at = now();
  persist();
  return change;
}

export function listInbox(tenantId: UUID, email?: string) {
  ensureHydrated();
  const addr = (email ?? "").trim().toLowerCase();
  return inbox.filter((t) => t.tenant_id === tenantId && t.is_active !== false && (!addr || t.assignee_email.toLowerCase() === addr));
}

export function decideInbox(taskId: UUID, decision: "approved" | "rejected") {
  ensureHydrated();
  const task = inbox.find((t) => t.id === taskId);
  if (!task) return null;
  task.status = decision;
  task.updated_at = now();
  if (task.kind === "job_change") {
    const change = jobChanges.find((c) => c.id === task.ref_id);
    if (change) {
      change.status = decision === "approved" ? "approved" : "rejected";
      if (decision === "approved") completeJobChange(change.id);
    }
  }
  if (task.kind === "personal_data" && decision === "approved") {
    applyPersonalData(task.ref_id);
  }
  if (task.kind === "requisition") {
    const req = requisitions.find((r) => r.id === task.ref_id);
    if (req) req.status = decision === "approved" ? "open" : "cancelled";
  }
  logAction({
    tenantId: task.tenant_id,
    module: "hrm",
    action: decision === "approved" ? "approve" : "reject",
    entityName: "inbox_task",
    entityId: taskId,
    oldData: {},
    newData: task as unknown as Record<string, unknown>
  });
  persist();
  return task;
}

const pdrCrud = makeCrud(personalRequests, "personal_data_request");
export const listPersonalDataRequests = pdrCrud.listAll;

export function submitPersonalDataRequest(
  tenantId: UUID,
  data: Omit<PersonalDataRequest, keyof TenantEntity | "status">,
  assigneeEmail: string
) {
  const row = pdrCrud.create(tenantId, { ...data, status: "pending" } as Omit<PersonalDataRequest, keyof TenantEntity>);
  inbox.unshift(
    seed(tenantId, {
      kind: "personal_data",
      title: `Personal information change · ${getEmployee(data.employee_id)?.full_name ?? "worker"}`,
      body: "Worker requested an update to phone, address, or emergency contact.",
      status: "pending",
      assignee_email: assigneeEmail,
      subject_employee_id: data.employee_id,
      ref_id: row.id,
      requested_by: data.requested_by
    }) as InboxTask
  );
  persist();
  return row;
}

function applyPersonalData(requestId: UUID) {
  const req = personalRequests.find((r) => r.id === requestId);
  if (!req) return;
  const patch: Parameters<typeof updateEmployee>[1] = {};
  if (req.phone) patch.phone = req.phone;
  if (req.address) patch.address = req.address;
  if (req.emergency_phone) patch.emergency_contact = req.emergency_phone;
  updateEmployee(req.employee_id, patch);
  req.status = "completed";
}

const goalCrud = makeCrud(goals, "goal");
export const listGoals = (tenantId: UUID, employeeId?: UUID) =>
  goalCrud.listAll(tenantId).filter((d) => !employeeId || d.employee_id === employeeId);
export const createGoal = goalCrud.create;
export const updateGoal = goalCrud.update;
export const trashGoal = goalCrud.remove;

const reviewCrud = makeCrud(reviews, "performance_review");
export const listReviews = (tenantId: UUID, employeeId?: UUID) =>
  reviewCrud.listAll(tenantId).filter((d) => !employeeId || d.employee_id === employeeId);
export const createReview = reviewCrud.create;
export const updateReview = reviewCrud.update;

const reqCrud = makeCrud(requisitions, "job_requisition");
export const listRequisitions = reqCrud.listAll;
export function createRequisition(tenantId: UUID, data: Omit<JobRequisition, keyof TenantEntity>, assigneeEmail: string) {
  const row = reqCrud.create(tenantId, data);
  inbox.unshift(
    seed(tenantId, {
      kind: "requisition",
      title: `Approve job requisition: ${data.title}`,
      body: data.reason ?? "New opening",
      status: "pending",
      assignee_email: assigneeEmail,
      ref_id: row.id,
      requested_by: assigneeEmail
    }) as InboxTask
  );
  persist();
  return row;
}
export const updateRequisition = reqCrud.update;

export function assertSalaryWithinGrade(employeeId: UUID, salary: number) {
  ensureHydrated();
  const profile = getWorkerProfile(employeeId);
  if (!profile?.pay_grade_id) return { ok: true, min: 0, max: 0 };
  const grade = payGrades.find((g) => g.id === profile.pay_grade_id);
  if (!grade) return { ok: true, min: 0, max: 0 };
  const ok = salary >= grade.min_salary && salary <= grade.max_salary;
  return { ok, min: grade.min_salary, max: grade.max_salary, grade: grade.name };
}

export function hireCandidate(
  tenantId: UUID,
  candidateId: UUID,
  opts?: { department_id?: UUID | null; basic_salary?: number; joining_date?: string }
) {
  ensureHydrated();
  const candidate = getCandidate(candidateId);
  if (!candidate) throw new Error("Candidate not found.");
  if (candidate.stage === "hired" && candidate.employee_id) {
    throw new Error("Candidate is already hired.");
  }
  const depts = listDepartments(tenantId);
  const departmentId = opts?.department_id || candidate.department_id || depts[0]?.id;
  if (!departmentId) throw new Error("Create a department before hiring.");
  const salary = opts?.basic_salary ?? 0;
  const joining = opts?.joining_date ?? new Date().toISOString().slice(0, 10);
  const employee = createEmployee(tenantId, {
    full_name: candidate.full_name,
    email: candidate.email,
    phone: candidate.phone,
    department_id: departmentId,
    designation_id: null,
    shift_id: null,
    employment_type: "full_time",
    status: "onboarding",
    basic_salary: salary,
    joining_date: joining
  });
  const openSeat = positions.find(
    (p) =>
      p.tenant_id === tenantId &&
      p.is_active !== false &&
      (p.status === "open" || !p.worker_id) &&
      (p.title.toLowerCase() === candidate.position.toLowerCase() || p.id === (candidate.requisition_id ?? ""))
  );
  const byRequisition = candidate.requisition_id
    ? requisitions.find((r) => r.id === candidate.requisition_id)
    : requisitions.find(
        (r) => r.tenant_id === tenantId && r.status === "open" && r.title.toLowerCase() === candidate.position.toLowerCase()
      );
  const seat =
    openSeat ||
    (byRequisition?.position_id ? positions.find((p) => p.id === byRequisition.position_id) : undefined);
  if (seat) {
    updatePosition(seat.id, { worker_id: employee.id, status: "filled" });
    upsertWorkerProfile(tenantId, employee.id, { position_id: seat.id });
  }
  if (byRequisition) {
    const filled = (byRequisition.openings || 1) <= 1 ? "filled" : byRequisition.status;
    updateRequisition(byRequisition.id, { status: filled === "filled" ? "filled" : byRequisition.status });
  }
  updateCandidate(candidate.id, { stage: "hired", employee_id: employee.id, notes: candidate.notes });
  createOnboardingTask(tenantId, { employee_id: employee.id, title: "Collect joining documents", status: "pending", due_date: joining });
  createOnboardingTask(tenantId, { employee_id: employee.id, title: "IT access & email", status: "pending", due_date: joining });
  persist();
  return employee;
}

const offCrud = makeCrud(offboarding, "offboarding_task");
export const listOffboarding = (tenantId: UUID, employeeId?: UUID) =>
  offCrud.listAll(tenantId).filter((d) => !employeeId || d.employee_id === employeeId);
export const createOffboardingTask = offCrud.create;
export function completeOffboardingTask(taskId: UUID) {
  return offCrud.update(taskId, { status: "done" });
}

export function startOffboarding(tenantId: UUID, employeeId: UUID, effectiveDate: string, requestedBy: string) {
  const titles = ["Return laptop and badge", "Revoke system access", "Final settlement / gratuity", "Experience letter"];
  for (const title of titles) {
    offCrud.create(tenantId, { employee_id: employeeId, title, status: "pending", due_date: effectiveDate });
  }
  return submitJobChange(
    tenantId,
    {
      employee_id: employeeId,
      type: "terminate",
      effective_date: effectiveDate,
      reason: "Offboarding initiated",
      requested_by: requestedBy
    },
    requestedBy
  );
}

const costingCrud = makeCrud(costing, "costing_allocation");
export const listCosting = (tenantId: UUID, employeeId?: UUID) =>
  costingCrud.listAll(tenantId).filter((d) => !employeeId || d.employee_id === employeeId);
export const createCosting = costingCrud.create;
export const trashCosting = costingCrud.remove;

export function overtimeHours(worked: number, standard = 8) {
  return Math.max(0, Math.round((worked - standard) * 10) / 10);
}

export function overtimeHoursInPeriod(tenantId: UUID, employeeId: UUID, period: string) {
  ensureHydrated();
  return listTimesheets(tenantId)
    .filter(
      (t) =>
        t.employee_id === employeeId &&
        t.work_date.startsWith(period) &&
        (t.status === "approved" || t.status === "submitted")
    )
    .reduce((sum, t) => sum + overtimeHours(t.hours), 0);
}

export function monthlyBenefitCost(tenantId: UUID, employeeId: UUID) {
  ensureHydrated();
  const plans = listBenefitPlans(tenantId);
  return listEnrollments(tenantId, employeeId)
    .filter((e) => e.status === "enrolled")
    .reduce((sum, e) => sum + (plans.find((p) => p.id === e.plan_id)?.employee_cost ?? 0), 0);
}

/** Time-and-a-half on OT hours from timesheets, plus benefit premiums. */
export function applyWorkdayPayComponents(runId: UUID) {
  ensureHydrated();
  const run = getPayrollRun(runId);
  if (!run) return null;
  const items = getPayrollItemsForRun(runId);
  let totalGross = 0;
  let totalNet = 0;
  for (const item of items) {
    const emp = getEmployee(item.employee_id);
    if (!emp) continue;
    const eligible = getWorkerProfile(item.employee_id)?.overtime_eligible !== false;
    const otHours = eligible ? overtimeHoursInPeriod(run.tenant_id, item.employee_id, run.period) : 0;
    const hourly = emp.basic_salary / 30 / 8;
    const overtimePay = Math.round(otHours * hourly * 1.5);
    const benefits = monthlyBenefitCost(run.tenant_id, item.employee_id);
    const loan = item.loan_deduction ?? 0;
    const lwp = item.lwp_amount ?? 0;
    const net = item.basic + item.allowances + overtimePay - item.deductions - item.pf - benefits - loan - lwp;
    updatePayrollItem(item.id, {
      overtime_hours: otHours,
      overtime_pay: overtimePay,
      benefits,
      deductions: item.deductions + benefits,
      net
    });
    totalGross += item.basic + item.allowances + overtimePay;
    totalNet += net;
  }
  updatePayrollRun(run.id, { total_gross: totalGross, total_net: totalNet });
  persist();
  return getPayrollRun(runId);
}

export function generatePayrollWorkday(tenantId: UUID, period: string) {
  const result = generatePayroll(tenantId, period);
  applyWorkdayPayComponents(result.run.id);
  return { run: getPayrollRun(result.run.id) ?? result.run, items: getPayrollItemsForRun(result.run.id) };
}

export function ensureWorkdayHydrated() {
  ensureHydrated();
}

export async function pullWorkdayFromSupabase(tenantId?: string) {
  ensureHydrated();
  const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
  const { fetchJson } = await import("@/lib/sync-fetch");
  const result = await fetchJson<{ ok?: boolean; skipped?: boolean; snapshot?: Snapshot; reason?: string }>(
    `/api/hrm/workday-sync${qs}`
  );
  if (!result.ok || result.json.skipped || !result.json.ok || !result.json.snapshot) {
    return null;
  }
  const snapshot = result.json.snapshot;
  replaceAll(locations, snapshot.locations);
  replaceAll(costCenters, snapshot.costCenters);
  replaceAll(jobFamilies, snapshot.jobFamilies);
  replaceAll(jobProfiles, snapshot.jobProfiles);
  replaceAll(payGrades, snapshot.payGrades);
  replaceAll(positions, snapshot.positions);
  replaceAll(workerProfiles, snapshot.workerProfiles);
  replaceAll(dependents, snapshot.dependents);
  replaceAll(emergencyContacts, snapshot.emergencyContacts);
  replaceAll(education, snapshot.education);
  replaceAll(experience, snapshot.experience);
  replaceAll(certifications, snapshot.certifications);
  replaceAll(identityDocs, snapshot.identityDocs);
  replaceAll(paymentElections, snapshot.paymentElections);
  replaceAll(benefitPlans, snapshot.benefitPlans);
  replaceAll(enrollments, snapshot.enrollments);
  replaceAll(leaveBalances, snapshot.leaveBalances);
  replaceAll(jobChanges, snapshot.jobChanges);
  replaceAll(inbox, snapshot.inbox);
  replaceAll(personalRequests, snapshot.personalRequests);
  replaceAll(goals, snapshot.goals);
  replaceAll(reviews, snapshot.reviews);
  replaceAll(requisitions, snapshot.requisitions);
  replaceAll(offboarding, snapshot.offboarding);
  replaceAll(costing, snapshot.costing);
  savePersisted(STORAGE_KEY, buildSnapshot());
  return snapshot;
}

import type { TenantEntity, UUID } from "@/modules/core/types";

export type WorkerType = "employee" | "contingent";
export type PositionStatus = "open" | "filled" | "frozen" | "closed";
export type JobChangeType =
  | "hire"
  | "transfer"
  | "promote"
  | "demote"
  | "location_change"
  | "compensation_change"
  | "terminate";
export type BpStatus = "draft" | "pending" | "approved" | "rejected" | "completed";
export type InboxKind =
  | "job_change"
  | "leave"
  | "personal_data"
  | "compensation"
  | "offboarding"
  | "requisition"
  | "review";
export type IdentityKind = "passport" | "visa" | "labour_card" | "cnic" | "iqama" | "other";
export type BenefitCategory = "medical" | "dental" | "life" | "vision" | "other";
export type CoverageLevel = "self" | "self_spouse" | "family";
export type RequisitionStatus = "draft" | "open" | "offered" | "filled" | "cancelled";
export type GoalStatus = "not_started" | "in_progress" | "completed" | "cancelled";
export type ReviewRating = "exceeds" | "meets" | "developing" | "unsatisfactory";

export interface WorkLocation extends TenantEntity {
  name: string;
  code: string;
  city?: string | null;
  country?: string | null;
  address?: string | null;
}

export interface CostCenter extends TenantEntity {
  name: string;
  code: string;
  description?: string | null;
}

export interface JobFamily extends TenantEntity {
  name: string;
  code: string;
  description?: string | null;
}

export interface JobProfile extends TenantEntity {
  family_id: UUID;
  title: string;
  code: string;
  job_level: string;
  description?: string | null;
  pay_grade_id?: UUID | null;
}

export interface PayGrade extends TenantEntity {
  name: string;
  code: string;
  min_salary: number;
  mid_salary: number;
  max_salary: number;
}

export interface Position extends TenantEntity {
  code: string;
  title: string;
  job_profile_id: UUID;
  department_id: UUID;
  location_id?: UUID | null;
  cost_center_id?: UUID | null;
  worker_id?: UUID | null;
  status: PositionStatus;
  fte: number;
  headcount: number;
}

export interface WorkerProfile extends TenantEntity {
  employee_id: UUID;
  preferred_name?: string | null;
  legal_name?: string | null;
  pronouns?: string | null;
  worker_type: WorkerType;
  position_id?: UUID | null;
  location_id?: UUID | null;
  cost_center_id?: UUID | null;
  matrix_manager_id?: UUID | null;
  pay_grade_id?: UUID | null;
  probation_end?: string | null;
  contract_end?: string | null;
  confirmation_date?: string | null;
  notice_days?: number | null;
  overtime_eligible?: boolean;
}

export interface WorkerDependent extends TenantEntity {
  employee_id: UUID;
  full_name: string;
  relation: string;
  date_of_birth?: string | null;
  national_id?: string | null;
}

export interface WorkerEmergencyContact extends TenantEntity {
  employee_id: UUID;
  full_name: string;
  relation: string;
  phone: string;
  email?: string | null;
  is_primary?: boolean;
}

export interface WorkerEducation extends TenantEntity {
  employee_id: UUID;
  school: string;
  degree: string;
  field?: string | null;
  year?: string | null;
}

export interface WorkerExperience extends TenantEntity {
  employee_id: UUID;
  company: string;
  title: string;
  start_date?: string | null;
  end_date?: string | null;
}

export interface WorkerCertification extends TenantEntity {
  employee_id: UUID;
  name: string;
  issuer?: string | null;
  expiry?: string | null;
}

export interface IdentityDocument extends TenantEntity {
  employee_id: UUID;
  kind: IdentityKind;
  number: string;
  country?: string | null;
  issued_on?: string | null;
  expiry?: string | null;
}

export interface PaymentElection extends TenantEntity {
  employee_id: UUID;
  bank_name: string;
  bank_account: string;
  percent: number;
  is_primary: boolean;
}

export interface BenefitPlan extends TenantEntity {
  name: string;
  category: BenefitCategory;
  employee_cost: number;
  employer_cost: number;
  description?: string | null;
}

export interface BenefitEnrollment extends TenantEntity {
  employee_id: UUID;
  plan_id: UUID;
  coverage: CoverageLevel;
  status: "enrolled" | "waived" | "pending";
  effective_from: string;
}

export interface LeaveBalance extends TenantEntity {
  employee_id: UUID;
  leave_type_id: UUID;
  year: number;
  entitled: number;
  used: number;
  pending: number;
}

export interface JobChange extends TenantEntity {
  employee_id: UUID;
  type: JobChangeType;
  effective_date: string;
  status: BpStatus;
  reason: string;
  from_department_id?: UUID | null;
  to_department_id?: UUID | null;
  from_manager_id?: UUID | null;
  to_manager_id?: UUID | null;
  from_designation_id?: UUID | null;
  to_designation_id?: UUID | null;
  from_location_id?: UUID | null;
  to_location_id?: UUID | null;
  from_salary?: number | null;
  to_salary?: number | null;
  requested_by: string;
}

export interface InboxTask extends TenantEntity {
  kind: InboxKind;
  title: string;
  body: string;
  status: "pending" | "approved" | "rejected";
  assignee_email: string;
  subject_employee_id?: UUID | null;
  ref_id: UUID;
  requested_by: string;
}

export interface PersonalDataRequest extends TenantEntity {
  employee_id: UUID;
  status: BpStatus;
  phone?: string | null;
  address?: string | null;
  emergency_name?: string | null;
  emergency_phone?: string | null;
  requested_by: string;
}

export interface Goal extends TenantEntity {
  employee_id: UUID;
  title: string;
  period: string;
  progress: number;
  status: GoalStatus;
  notes?: string | null;
}

export interface PerformanceReview extends TenantEntity {
  employee_id: UUID;
  cycle: string;
  rating?: ReviewRating | null;
  comments?: string | null;
  status: BpStatus;
  reviewer_name?: string | null;
}

export interface JobRequisition extends TenantEntity {
  title: string;
  department_id: UUID;
  position_id?: UUID | null;
  location_id?: UUID | null;
  openings: number;
  status: RequisitionStatus;
  reason?: string | null;
}

export interface OffboardingTask extends TenantEntity {
  employee_id: UUID;
  title: string;
  status: "pending" | "done";
  due_date?: string | null;
}

export interface CostingAllocation extends TenantEntity {
  employee_id: UUID;
  cost_center_id: UUID;
  percent: number;
  effective_from: string;
}

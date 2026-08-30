import type { TenantEntity, UUID } from "@/modules/core/types";

/* ---------- Shared enums / unions ---------- */

export type EmploymentType = "full_time" | "part_time" | "contract" | "intern";
export type EmployeeStatus = "active" | "inactive" | "terminated" | "onboarding" | "offboarding";
export type CandidateStage = "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
export type OnboardingTaskStatus = "pending" | "done";
export type AttendanceStatus = "present" | "absent" | "late" | "half_day" | "leave";
export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected";
export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type LeaveApprovalStatus = "pending" | "approved" | "rejected";
export type AssetStatus = "available" | "assigned" | "retired";
export type HrDocumentStatus = "active" | "archived";
export type PayrollRunStatus = "draft" | "finalized";
export type LoanStatus = "pending" | "approved" | "rejected" | "active" | "closed";
export type LoanType = "salary_advance" | "emergency" | "housing";
export type LoanInstallmentStatus = "pending" | "paid" | "overdue" | "skipped";
export type DisciplinarySeverity = "warning" | "written" | "suspension";
export type PaymentTxnStatus = "pending" | "paid" | "failed";
export type PaymentPurpose = "salary" | "loan" | "advance" | "reimbursement" | "other";
export type WorkflowProvider = "zoom" | "email" | "google_drive" | "calendar" | "other";
export type TaxStatus = "filer" | "non_filer";
export type HolidayType = "gazetted" | "company";

/* ---------- Organization masters ---------- */

export interface Department extends TenantEntity {
  name: string;
  code: string;
  description?: string | null;
  manager_id?: UUID | null;
}

export interface Designation extends TenantEntity {
  name: string;
  code: string;
  description?: string | null;
}

export interface Shift extends TenantEntity {
  name: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
}

export interface Holiday extends TenantEntity {
  name: string;
  date: string;
  type: HolidayType;
}

export interface CompanyProfile extends TenantEntity {
  legal_name: string;
  ntn?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  /** Letterhead branding for forms / letters */
  logo_data_url?: string | null;
  letterhead_title?: string | null;
  letterhead_tagline?: string | null;
  letterhead_footer?: string | null;
  brand_color?: string | null;
}

/* ---------- People lifecycle ---------- */

export interface Employee extends TenantEntity {
  employee_no: string;
  full_name: string;
  email: string;
  phone: string;
  father_name?: string | null;
  cnic?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  department_id: UUID;
  designation_id?: UUID | null;
  shift_id?: UUID | null;
  employment_type: EmploymentType;
  status: EmployeeStatus;
  basic_salary: number;
  housing_allowance?: number;
  transport_allowance?: number;
  medical_allowance?: number;
  other_allowance?: number;
  manager_id?: UUID | null;
  location?: string | null;
  business_title?: string | null;
  tax_status?: TaxStatus;
  tax_ntn?: string | null;
  pf_enrolled?: boolean;
  eobi_enrolled?: boolean;
  joining_date: string;
  resignation_date?: string | null;
  emergency_contact?: string | null;
  address?: string | null;
  machine_id?: string | null;
}

export interface Candidate extends TenantEntity {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  stage: CandidateStage;
  source?: string | null;
  notes?: string | null;
  employee_id?: UUID | null;
  requisition_id?: UUID | null;
  department_id?: UUID | null;
}

export interface OnboardingTask extends TenantEntity {
  employee_id: UUID;
  title: string;
  status: OnboardingTaskStatus;
  due_date?: string | null;
}

/* ---------- Time & leave ---------- */

export interface AttendanceRecord extends TenantEntity {
  employee_id: UUID;
  attendance_date: string;
  check_in?: string | null;
  check_out?: string | null;
  status: AttendanceStatus;
  working_hours: number;
  notes?: string | null;
}

export interface Timesheet extends TenantEntity {
  employee_id: UUID;
  work_date: string;
  hours: number;
  project?: string | null;
  notes?: string | null;
  status: TimesheetStatus;
}

export interface LeaveType extends TenantEntity {
  name: string;
  code: string;
  days_per_year: number;
  paid: boolean;
}

export interface LeaveRequest extends TenantEntity {
  employee_id: UUID;
  leave_type_id?: UUID | null;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: LeaveRequestStatus;
  manager_status?: LeaveApprovalStatus | null;
  hr_status?: LeaveApprovalStatus | null;
}

/* ---------- Assets & documents ---------- */

export interface Asset extends TenantEntity {
  name: string;
  tag_code: string;
  category: string;
  assigned_employee_id?: UUID | null;
  status: AssetStatus;
  notes?: string | null;
}

export interface HrDocument extends TenantEntity {
  title: string;
  category: string;
  employee_id?: UUID | null;
  file_name?: string | null;
  status: HrDocumentStatus;
}

/* ---------- Compensation ---------- */

export interface PayrollRun extends TenantEntity {
  period: string;
  status: PayrollRunStatus;
  total_gross: number;
  total_net: number;
  employee_count: number;
}

export interface PayrollItem extends TenantEntity {
  run_id: UUID;
  employee_id: UUID;
  basic: number;
  allowances: number;
  deductions: number;
  pf: number;
  tax?: number;
  eobi?: number;
  housing?: number;
  transport?: number;
  medical?: number;
  overtime_hours?: number;
  overtime_pay?: number;
  benefits?: number;
  loan_deduction?: number;
  lwp_days?: number;
  lwp_amount?: number;
  net: number;
}

export interface PfSetting extends TenantEntity {
  percent: number;
  effective_from: string;
}

export interface PfContribution extends TenantEntity {
  employee_id: UUID;
  period: string;
  employee_amount: number;
  employer_amount: number;
}

export interface EobiSetting extends TenantEntity {
  amount: number;
  effective_from: string;
}

export interface LoanPolicy extends TenantEntity {
  name: string;
  max_loan_amount: number;
  max_salary_pct: number;
  min_tenure_months: number;
  max_concurrent_loans: number;
  default_interest_rate: number;
  max_tenure_months: number;
  allow_on_probation: boolean;
}

export interface LoanInstallment extends TenantEntity {
  loan_id: UUID;
  installment_no: number;
  due_date: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  status: LoanInstallmentStatus;
  paid_at?: string | null;
  payroll_run_id?: UUID | null;
  payroll_item_id?: UUID | null;
}

export interface Loan extends TenantEntity {
  employee_id: UUID;
  amount: number;
  repayment_amount: number;
  start_date: string;
  reason: string;
  status: LoanStatus;
  loan_type?: LoanType;
  interest_rate?: number;
  tenure_months?: number;
  outstanding_balance?: number;
  disbursed_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  policy_id?: UUID | null;
}

/* ---------- Ops & platform extras ---------- */

export interface DisciplinaryAction extends TenantEntity {
  employee_id: UUID;
  action_date: string;
  reason: string;
  severity: DisciplinarySeverity;
}

export interface HrNotification extends TenantEntity {
  title: string;
  body: string;
  read: boolean;
}

export interface PaymentTxn extends TenantEntity {
  /** Who receives the money (company → employee). */
  employee_id: UUID;
  amount: number;
  /** How the company sends money (usually bank_transfer). */
  method: string;
  purpose: PaymentPurpose;
  reference?: string | null;
  status: PaymentTxnStatus;
  notes?: string | null;
  /** When paying monthly salary from a finalized payroll run. */
  payroll_run_id?: UUID | null;
  payroll_item_id?: UUID | null;
  /** Snapshot of employee bank details at disbursement time. */
  bank_name?: string | null;
  bank_account?: string | null;
  loan_id?: UUID | null;
}

export interface WorkflowIntegration extends TenantEntity {
  name: string;
  provider: WorkflowProvider;
  enabled: boolean;
  config_note?: string | null;
}

export interface SecurityPolicy extends TenantEntity {
  mfa_required: boolean;
  session_hours: number;
  password_min_length: number;
}

/* ---------- Aggregates ---------- */

export interface HrmStats {
  employees: number;
  activeEmployees: number;
  pendingLeaves: number;
  attendanceTodayPct: number;
  payrollTotal: number;
  openCandidates: number;
  pendingTimesheets: number;
}

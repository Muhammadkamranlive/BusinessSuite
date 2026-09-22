import type { TenantEntity, UUID } from "@/modules/core/types";

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

export type HmsPatient = TenantEntity & {
  mrn: string;
  full_name: string;
  dob?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  national_id?: string | null;
  address?: string | null;
  blood_group?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  insurance_payer?: string | null;
  insurance_policy_no?: string | null;
  insurance_group_no?: string | null;
  guardian_patient_id?: UUID | null;
  status: string;
  anonymized: boolean;
  created_by?: string | null;
  updated_by?: string | null;
};

export type HmsPatientConsent = TenantEntity & {
  patient_id: UUID;
  consent_type: string;
  version: string;
  effective_date: string;
  document_ref?: string | null;
  signed_by?: string | null;
  witness?: string | null;
  notes?: string | null;
  revoked_at?: string | null;
  created_by?: string | null;
};

export type HmsAppointment = TenantEntity & {
  patient_id?: UUID | null;
  patient_name: string;
  doctor_name: string;
  department?: string | null;
  scheduled_at: string;
  status: "scheduled" | "checked_in" | "in_consult" | "completed" | "cancelled" | "no_show" | "waitlist";
  cancel_reason?: string | null;
  notes?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type HmsEncounter = TenantEntity & {
  encounter_no: string;
  encounter_type: "opd" | "ipd" | "emergency" | "telemedicine";
  patient_id?: UUID | null;
  patient_name: string;
  doctor_name?: string | null;
  department?: string | null;
  token_no?: string | null;
  queue_status: "waiting" | "called" | "in_consult" | "completed" | "cancelled";
  visit_date: string;
  chief_complaint?: string | null;
  appointment_id?: UUID | null;
  status: string;
  created_by?: string | null;
  updated_by?: string | null;
};

export type HmsClinicalNote = TenantEntity & {
  patient_id?: UUID | null;
  encounter_id?: UUID | null;
  patient_name: string;
  author_name: string;
  note_type: string;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  free_text?: string | null;
  version_no: number;
  amends_note_id?: UUID | null;
  is_current: boolean;
  created_by?: string | null;
};

export type HmsProblem = TenantEntity & {
  patient_id: UUID;
  problem: string;
  icd10_code?: string | null;
  status: "active" | "resolved";
  onset_date?: string | null;
  resolved_date?: string | null;
  notes?: string | null;
  created_by?: string | null;
};

export type HmsAllergy = TenantEntity & {
  patient_id: UUID;
  allergen: string;
  reaction?: string | null;
  severity?: "mild" | "moderate" | "severe" | null;
  status: string;
  created_by?: string | null;
};

export type HmsMedication = TenantEntity & {
  patient_id: UUID;
  drug_name: string;
  dose?: string | null;
  frequency?: string | null;
  route?: string | null;
  status: "current" | "stopped";
  started_at?: string | null;
  stopped_at?: string | null;
  created_by?: string | null;
};

export type HmsInvoiceLine = {
  id: string;
  description: string;
  category: "consultation" | "procedure" | "pharmacy" | "lab" | "room" | "other";
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type HmsInvoice = TenantEntity & {
  invoice_no: string;
  patient_id?: UUID | null;
  patient_name: string;
  encounter_id?: UUID | null;
  invoice_date: string;
  status: "draft" | "issued" | "partially_paid" | "paid" | "void" | "refunded";
  subtotal: number;
  tax_rate?: number | null;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_gateway?: string | null;
  payment_ref?: string | null;
  lines: HmsInvoiceLine[];
  notes?: string | null;
  created_by?: string | null;
};

export type HmsPayment = TenantEntity & {
  payment_no: string;
  invoice_id: UUID;
  patient_name: string;
  amount: number;
  method: string;
  payment_date: string;
  created_by?: string | null;
};

export type HmsPhiAuditLog = {
  id: UUID;
  tenant_id: UUID;
  created_at: string;
  user_id?: string | null;
  actor_email?: string | null;
  action: string;
  table_name: string;
  record_id?: string | null;
  ip_address?: string | null;
  device_info?: string | null;
  before_diff?: Record<string, unknown> | null;
  after_diff?: Record<string, unknown> | null;
  justification?: string | null;
  break_glass: boolean;
};

export type HmsBreakGlass = {
  id: UUID;
  tenant_id: UUID;
  created_at: string;
  actor_email: string;
  patient_id?: UUID | null;
  patient_mrn?: string | null;
  justification: string;
  alerted_security_officer: boolean;
  expires_at?: string | null;
};

export type HmsRoleAssignment = TenantEntity & {
  user_profile_id?: UUID | null;
  staff_email: string;
  staff_name: string;
  hms_role: HmsRole;
  branch_id?: string | null;
  mfa_required: boolean;
  created_by?: string | null;
  updated_by?: string | null;
};

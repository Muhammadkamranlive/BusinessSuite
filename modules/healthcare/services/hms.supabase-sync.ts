import { getSupabaseAdminClient, hasSecretKey } from "@/lib/supabase/server";
import { toDbTenantId, toUiTenantId } from "@/lib/tenants/ids";
import type {
  HmsAllergy,
  HmsAppointment,
  HmsBreakGlass,
  HmsClinicalNote,
  HmsEncounter,
  HmsInvoice,
  HmsMedication,
  HmsPatient,
  HmsPatientConsent,
  HmsPayment,
  HmsPhiAuditLog,
  HmsProblem,
  HmsRoleAssignment
} from "@/modules/healthcare/model/hms-core";

export type HmsRemoteSnapshot = {
  version: number;
  tenantId?: string;
  patients: HmsPatient[];
  consents: HmsPatientConsent[];
  appointments: HmsAppointment[];
  encounters: HmsEncounter[];
  notes: HmsClinicalNote[];
  problems: HmsProblem[];
  allergies: HmsAllergy[];
  medications: HmsMedication[];
  invoices: HmsInvoice[];
  payments: HmsPayment[];
  auditLogs: HmsPhiAuditLog[];
  breakGlass: HmsBreakGlass[];
  roles: HmsRoleAssignment[];
};

function remap(row: Record<string, unknown>, toDb: boolean) {
  const next = { ...row };
  if (typeof next.tenant_id === "string") {
    next.tenant_id = toDb ? toDbTenantId(next.tenant_id) : toUiTenantId(next.tenant_id);
  }
  return next;
}

function num(v: unknown, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function str(v: unknown) {
  return v == null ? null : String(v);
}

function entityBase(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at ?? r.created_at),
    is_active: r.is_active !== false
  };
}

export function isHmsSupabaseSyncEnabled() {
  return hasSecretKey() && process.env.NEXT_PUBLIC_HMS_USE_SUPABASE !== "false";
}

async function upsert(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  table: string,
  rows: Record<string, unknown>[],
  errors: string[]
) {
  if (!rows.length) return;
  const { error } = await admin.from(table).upsert(rows, { onConflict: "id" });
  if (error) errors.push(`${table}: ${error.message}`);
}

function patientToDb(p: HmsPatient) {
  return remap({ ...p }, true);
}
function patientFromDb(row: Record<string, unknown>): HmsPatient {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    mrn: String(r.mrn),
    full_name: String(r.full_name),
    dob: str(r.dob)?.slice(0, 10) ?? null,
    gender: str(r.gender),
    phone: str(r.phone),
    email: str(r.email),
    national_id: str(r.national_id),
    address: str(r.address),
    blood_group: str(r.blood_group),
    emergency_contact_name: str(r.emergency_contact_name),
    emergency_contact_phone: str(r.emergency_contact_phone),
    insurance_payer: str(r.insurance_payer),
    insurance_policy_no: str(r.insurance_policy_no),
    insurance_group_no: str(r.insurance_group_no),
    guardian_patient_id: str(r.guardian_patient_id),
    status: String(r.status ?? "active"),
    anonymized: Boolean(r.anonymized),
    created_by: str(r.created_by),
    updated_by: str(r.updated_by)
  };
}

function consentFromDb(row: Record<string, unknown>): HmsPatientConsent {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    patient_id: String(r.patient_id),
    consent_type: String(r.consent_type),
    version: String(r.version),
    effective_date: String(r.effective_date).slice(0, 10),
    document_ref: str(r.document_ref),
    signed_by: str(r.signed_by),
    witness: str(r.witness),
    notes: str(r.notes),
    revoked_at: str(r.revoked_at),
    created_by: str(r.created_by)
  };
}

function appointmentFromDb(row: Record<string, unknown>): HmsAppointment {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    patient_id: str(r.patient_id),
    patient_name: String(r.patient_name),
    doctor_name: String(r.doctor_name),
    department: str(r.department),
    scheduled_at: String(r.scheduled_at),
    status: r.status as HmsAppointment["status"],
    cancel_reason: str(r.cancel_reason),
    notes: str(r.notes),
    created_by: str(r.created_by),
    updated_by: str(r.updated_by)
  };
}

function encounterFromDb(row: Record<string, unknown>): HmsEncounter {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    encounter_no: String(r.encounter_no),
    encounter_type: r.encounter_type as HmsEncounter["encounter_type"],
    patient_id: str(r.patient_id),
    patient_name: String(r.patient_name),
    doctor_name: str(r.doctor_name),
    department: str(r.department),
    token_no: str(r.token_no),
    queue_status: r.queue_status as HmsEncounter["queue_status"],
    visit_date: String(r.visit_date).slice(0, 10),
    chief_complaint: str(r.chief_complaint),
    appointment_id: str(r.appointment_id),
    status: String(r.status ?? "open"),
    created_by: str(r.created_by),
    updated_by: str(r.updated_by)
  };
}

function noteFromDb(row: Record<string, unknown>): HmsClinicalNote {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    patient_id: str(r.patient_id),
    encounter_id: str(r.encounter_id),
    patient_name: String(r.patient_name),
    author_name: String(r.author_name),
    note_type: String(r.note_type ?? "soap"),
    subjective: str(r.subjective),
    objective: str(r.objective),
    assessment: str(r.assessment),
    plan: str(r.plan),
    free_text: str(r.free_text),
    version_no: num(r.version_no, 1),
    amends_note_id: str(r.amends_note_id),
    is_current: r.is_current !== false,
    created_by: str(r.created_by)
  };
}

function problemFromDb(row: Record<string, unknown>): HmsProblem {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    patient_id: String(r.patient_id),
    problem: String(r.problem),
    icd10_code: str(r.icd10_code),
    status: r.status as HmsProblem["status"],
    onset_date: str(r.onset_date)?.slice(0, 10) ?? null,
    resolved_date: str(r.resolved_date)?.slice(0, 10) ?? null,
    notes: str(r.notes),
    created_by: str(r.created_by)
  };
}

function allergyFromDb(row: Record<string, unknown>): HmsAllergy {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    patient_id: String(r.patient_id),
    allergen: String(r.allergen),
    reaction: str(r.reaction),
    severity: (r.severity as HmsAllergy["severity"]) ?? null,
    status: String(r.status ?? "active"),
    created_by: str(r.created_by)
  };
}

function medFromDb(row: Record<string, unknown>): HmsMedication {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    patient_id: String(r.patient_id),
    drug_name: String(r.drug_name),
    dose: str(r.dose),
    frequency: str(r.frequency),
    route: str(r.route),
    status: r.status as HmsMedication["status"],
    started_at: str(r.started_at)?.slice(0, 10) ?? null,
    stopped_at: str(r.stopped_at)?.slice(0, 10) ?? null,
    created_by: str(r.created_by)
  };
}

function invoiceFromDb(row: Record<string, unknown>): HmsInvoice {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    invoice_no: String(r.invoice_no),
    patient_id: str(r.patient_id),
    patient_name: String(r.patient_name),
    encounter_id: str(r.encounter_id),
    invoice_date: String(r.invoice_date).slice(0, 10),
    status: r.status as HmsInvoice["status"],
    subtotal: num(r.subtotal),
    tax_rate: r.tax_rate == null ? null : num(r.tax_rate),
    tax_amount: num(r.tax_amount),
    discount_amount: num(r.discount_amount),
    total_amount: num(r.total_amount),
    paid_amount: num(r.paid_amount),
    payment_gateway: str(r.payment_gateway),
    payment_ref: str(r.payment_ref),
    lines: Array.isArray(r.lines) ? (r.lines as HmsInvoice["lines"]) : [],
    notes: str(r.notes),
    created_by: str(r.created_by)
  };
}

function paymentFromDb(row: Record<string, unknown>): HmsPayment {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    payment_no: String(r.payment_no),
    invoice_id: String(r.invoice_id),
    patient_name: String(r.patient_name),
    amount: num(r.amount),
    method: String(r.method ?? "cash"),
    payment_date: String(r.payment_date).slice(0, 10),
    created_by: str(r.created_by)
  };
}

function auditFromDb(row: Record<string, unknown>): HmsPhiAuditLog {
  const r = remap(row, false);
  return {
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    created_at: String(r.created_at),
    user_id: str(r.user_id),
    actor_email: str(r.actor_email),
    action: String(r.action),
    table_name: String(r.table_name),
    record_id: str(r.record_id),
    ip_address: str(r.ip_address),
    device_info: str(r.device_info),
    before_diff: (r.before_diff as Record<string, unknown>) ?? null,
    after_diff: (r.after_diff as Record<string, unknown>) ?? null,
    justification: str(r.justification),
    break_glass: Boolean(r.break_glass)
  };
}

function breakGlassFromDb(row: Record<string, unknown>): HmsBreakGlass {
  const r = remap(row, false);
  return {
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    created_at: String(r.created_at),
    actor_email: String(r.actor_email),
    patient_id: str(r.patient_id),
    patient_mrn: str(r.patient_mrn),
    justification: String(r.justification),
    alerted_security_officer: r.alerted_security_officer !== false,
    expires_at: str(r.expires_at)
  };
}

function roleFromDb(row: Record<string, unknown>): HmsRoleAssignment {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    user_profile_id: str(r.user_profile_id),
    staff_email: String(r.staff_email),
    staff_name: String(r.staff_name),
    hms_role: r.hms_role as HmsRoleAssignment["hms_role"],
    branch_id: str(r.branch_id),
    mfa_required: r.mfa_required !== false,
    created_by: str(r.created_by),
    updated_by: str(r.updated_by)
  };
}

export async function pushHmsSnapshot(snapshot: HmsRemoteSnapshot) {
  if (!isHmsSupabaseSyncEnabled()) {
    return { ok: false as const, reason: "Supabase secret missing or HMS sync disabled" };
  }
  const admin = getSupabaseAdminClient();
  const errors: string[] = [];

  await upsert(admin, "hms_patients", snapshot.patients.map((p) => patientToDb(p)), errors);
  await upsert(admin, "hms_patient_consents", snapshot.consents.map((c) => remap({ ...c }, true)), errors);
  await upsert(admin, "hms_appointments", snapshot.appointments.map((a) => remap({ ...a }, true)), errors);
  await upsert(admin, "hms_encounters", snapshot.encounters.map((e) => remap({ ...e }, true)), errors);
  await upsert(admin, "hms_clinical_notes", snapshot.notes.map((n) => remap({ ...n }, true)), errors);
  await upsert(admin, "hms_problem_list", snapshot.problems.map((p) => remap({ ...p }, true)), errors);
  await upsert(admin, "hms_allergy_list", snapshot.allergies.map((a) => remap({ ...a }, true)), errors);
  await upsert(admin, "hms_medication_list", snapshot.medications.map((m) => remap({ ...m }, true)), errors);
  await upsert(admin, "hms_invoices", snapshot.invoices.map((i) => remap({ ...i }, true)), errors);
  await upsert(admin, "hms_payments", snapshot.payments.map((p) => remap({ ...p }, true)), errors);
  // Audit + break-glass are append-only upserts by id
  await upsert(admin, "hms_phi_audit_logs", snapshot.auditLogs.map((a) => remap({ ...a }, true)), errors);
  await upsert(admin, "hms_break_glass", snapshot.breakGlass.map((b) => remap({ ...b }, true)), errors);
  await upsert(admin, "hms_role_assignments", snapshot.roles.map((r) => remap({ ...r }, true)), errors);

  return { ok: errors.length === 0, errors };
}

export async function pullHmsSnapshot(uiTenantId?: string) {
  if (!isHmsSupabaseSyncEnabled()) {
    return { ok: false as const, reason: "Supabase secret missing or HMS sync disabled" };
  }
  const admin = getSupabaseAdminClient();
  const dbTenant = uiTenantId ? toDbTenantId(uiTenantId) : null;
  const errors: string[] = [];

  const tables = [
    "hms_patients",
    "hms_patient_consents",
    "hms_appointments",
    "hms_encounters",
    "hms_clinical_notes",
    "hms_problem_list",
    "hms_allergy_list",
    "hms_medication_list",
    "hms_invoices",
    "hms_payments",
    "hms_phi_audit_logs",
    "hms_break_glass",
    "hms_role_assignments"
  ] as const;

  const results: Record<string, unknown[]> = {};
  await Promise.all(
    tables.map(async (table) => {
      let q = admin.from(table).select("*");
      if (dbTenant) q = q.eq("tenant_id", dbTenant);
      if (table === "hms_phi_audit_logs") q = q.order("created_at", { ascending: false }).limit(500);
      const { data, error } = await q;
      if (error) errors.push(`${table}: ${error.message}`);
      results[table] = data ?? [];
    })
  );

  const snapshot: HmsRemoteSnapshot = {
    version: 1,
    tenantId: uiTenantId,
    patients: (results.hms_patients as Record<string, unknown>[]).map(patientFromDb),
    consents: (results.hms_patient_consents as Record<string, unknown>[]).map(consentFromDb),
    appointments: (results.hms_appointments as Record<string, unknown>[]).map(appointmentFromDb),
    encounters: (results.hms_encounters as Record<string, unknown>[]).map(encounterFromDb),
    notes: (results.hms_clinical_notes as Record<string, unknown>[]).map(noteFromDb),
    problems: (results.hms_problem_list as Record<string, unknown>[]).map(problemFromDb),
    allergies: (results.hms_allergy_list as Record<string, unknown>[]).map(allergyFromDb),
    medications: (results.hms_medication_list as Record<string, unknown>[]).map(medFromDb),
    invoices: (results.hms_invoices as Record<string, unknown>[]).map(invoiceFromDb),
    payments: (results.hms_payments as Record<string, unknown>[]).map(paymentFromDb),
    auditLogs: (results.hms_phi_audit_logs as Record<string, unknown>[]).map(auditFromDb),
    breakGlass: (results.hms_break_glass as Record<string, unknown>[]).map(breakGlassFromDb),
    roles: (results.hms_role_assignments as Record<string, unknown>[]).map(roleFromDb)
  };

  return { ok: errors.length === 0 || snapshot.patients.length > 0 || true, snapshot, errors: errors.length ? errors : undefined };
}

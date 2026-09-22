import type { UUID } from "@/modules/core/types";
import { generateDocumentNumber } from "@/modules/core/services/numbering.service";
import { bindTrashRestore, trashEntityInCollection, updateEntityInCollection } from "@/modules/core/services/entity-crud";
import type {
  HmsAllergy,
  HmsAppointment,
  HmsBreakGlass,
  HmsClinicalNote,
  HmsEncounter,
  HmsInvoice,
  HmsInvoiceLine,
  HmsMedication,
  HmsPatient,
  HmsPatientConsent,
  HmsPayment,
  HmsPhiAuditLog,
  HmsProblem,
  HmsRoleAssignment
} from "@/modules/healthcare/model/hms-core";
import type { HmsRemoteSnapshot } from "@/modules/healthcare/services/hms.supabase-sync";
import { queueAppointmentReminder, rescheduleAppointmentReminder } from "@/modules/healthcare/services/hms-reminders";

export type * from "@/modules/healthcare/model/hms-core";

function now() {
  return new Date().toISOString();
}
function today() {
  return now().slice(0, 10);
}
function id() {
  return crypto.randomUUID();
}

let patients: HmsPatient[] = [];
let consents: HmsPatientConsent[] = [];
let appointments: HmsAppointment[] = [];
let encounters: HmsEncounter[] = [];
let notes: HmsClinicalNote[] = [];
let problems: HmsProblem[] = [];
let allergies: HmsAllergy[] = [];
let medications: HmsMedication[] = [];
let invoices: HmsInvoice[] = [];
let payments: HmsPayment[] = [];
let auditLogs: HmsPhiAuditLog[] = [];
let breakGlass: HmsBreakGlass[] = [];
let roles: HmsRoleAssignment[] = [];
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let pendingTenantId: string | undefined;

const EVENT = "businesssuite:hms-changed";

function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT));
}

function syncEnabled() {
  return process.env.NEXT_PUBLIC_HMS_USE_SUPABASE !== "false";
}

export function buildHmsSnapshot(tenantId?: string): HmsRemoteSnapshot {
  const f = <T extends { tenant_id: string }>(rows: T[]) =>
    tenantId ? rows.filter((r) => r.tenant_id === tenantId) : rows;
  return {
    version: 1,
    tenantId,
    patients: f(patients),
    consents: f(consents),
    appointments: f(appointments),
    encounters: f(encounters),
    notes: f(notes),
    problems: f(problems),
    allergies: f(allergies),
    medications: f(medications),
    invoices: f(invoices),
    payments: f(payments),
    auditLogs: f(auditLogs).slice(0, 500),
    breakGlass: f(breakGlass),
    roles: f(roles)
  };
}

export function queueHmsRemoteSync(tenantId?: string, immediate = false) {
  if (typeof window === "undefined" || !syncEnabled()) return;
  if (tenantId) pendingTenantId = tenantId;
  const push = () => {
    const tid = pendingTenantId;
    pendingTenantId = undefined;
    void fetch("/api/healthcare/hms-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildHmsSnapshot(tid))
    }).catch(() => undefined);
  };
  if (immediate) {
    if (syncTimer) clearTimeout(syncTimer);
    push();
    return;
  }
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(push, 600);
}

function persist(tenantId?: string) {
  emit();
  queueHmsRemoteSync(tenantId);
}

export async function pullHmsFromSupabase(tenantId: string) {
  if (typeof window === "undefined" || !syncEnabled()) return false;
  try {
    const res = await fetch(`/api/healthcare/hms-sync?tenantId=${encodeURIComponent(tenantId)}`);
    const json = (await res.json()) as { ok?: boolean; skipped?: boolean; snapshot?: HmsRemoteSnapshot };
    if (!json.ok || json.skipped || !json.snapshot) return false;
    const s = json.snapshot;
    const keep = <T extends { tenant_id: string }>(rows: T[], incoming: T[]) => [
      ...incoming,
      ...rows.filter((r) => r.tenant_id !== tenantId)
    ];
    patients = keep(patients, s.patients);
    consents = keep(consents, s.consents);
    appointments = keep(appointments, s.appointments);
    encounters = keep(encounters, s.encounters);
    notes = keep(notes, s.notes);
    problems = keep(problems, s.problems);
    allergies = keep(allergies, s.allergies);
    medications = keep(medications, s.medications);
    invoices = keep(invoices, s.invoices);
    payments = keep(payments, s.payments);
    auditLogs = keep(auditLogs, s.auditLogs).slice(0, 500);
    breakGlass = keep(breakGlass, s.breakGlass);
    roles = keep(roles, s.roles);
    emit();
    return true;
  } catch {
    return false;
  }
}

export function subscribeHms(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

/** Spec §2 — append-only PHI audit (never mutate existing rows). */
export function appendPhiAudit(
  tenantId: UUID,
  input: Omit<HmsPhiAuditLog, "id" | "tenant_id" | "created_at" | "break_glass"> & { break_glass?: boolean }
) {
  const row: HmsPhiAuditLog = {
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    break_glass: input.break_glass ?? false,
    ...input
  };
  auditLogs.unshift(row);
  if (auditLogs.length > 500) auditLogs.length = 500;
  persist(tenantId);
  return row;
}

function redactPatientForLog(p: Partial<HmsPatient>) {
  return {
    id: p.id,
    mrn: p.mrn,
    status: p.status,
    anonymized: p.anonymized
    // never log name/phone/email/national_id to generic logs — only IDs in audit diffs when needed
  };
}

function nextMrn(tenantId: UUID) {
  const year = new Date().getFullYear().toString().slice(-2);
  const seq = patients.filter((p) => p.tenant_id === tenantId).length + 1;
  return `MRN-${year}-${String(seq).padStart(5, "0")}`;
}

/** Fuzzy duplicate detection: name + DOB + phone */
export function findDuplicatePatients(
  tenantId: UUID,
  input: { full_name: string; dob?: string | null; phone?: string | null }
): HmsPatient[] {
  const name = input.full_name.trim().toLowerCase();
  return listPatients(tenantId).filter((p) => {
    const sameName = p.full_name.trim().toLowerCase() === name;
    const sameDob = input.dob && p.dob === input.dob;
    const samePhone = input.phone && p.phone && p.phone.replace(/\D/g, "") === input.phone.replace(/\D/g, "");
    return sameName && (sameDob || samePhone);
  });
}

export function listPatients(tenantId: UUID) {
  return patients
    .filter((p) => p.tenant_id === tenantId && p.is_active !== false && !p.anonymized)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export function getPatientById(patientId: UUID) {
  return patients.find((p) => p.id === patientId && p.is_active !== false) ?? null;
}

export function createPatient(
  tenantId: UUID,
  input: Omit<HmsPatient, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active" | "mrn" | "anonymized"> & {
    mrn?: string;
    consent?: { consent_type: string; version: string; signed_by?: string; document_ref?: string };
    actor?: string;
    allowDuplicate?: boolean;
  }
) {
  const dupes = input.allowDuplicate
    ? []
    : findDuplicatePatients(tenantId, input);
  if (dupes.length) {
    throw new Error(`Possible duplicate patient(s): ${dupes.map((d) => d.mrn).join(", ")}. Confirm before creating.`);
  }
  const row: HmsPatient = {
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    mrn: input.mrn?.trim() || nextMrn(tenantId),
    full_name: input.full_name.trim(),
    dob: input.dob ?? null,
    gender: input.gender ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    national_id: input.national_id ?? null,
    address: input.address ?? null,
    blood_group: input.blood_group ?? null,
    emergency_contact_name: input.emergency_contact_name ?? null,
    emergency_contact_phone: input.emergency_contact_phone ?? null,
    insurance_payer: input.insurance_payer ?? null,
    insurance_policy_no: input.insurance_policy_no ?? null,
    insurance_group_no: input.insurance_group_no ?? null,
    guardian_patient_id: input.guardian_patient_id ?? null,
    status: input.status || "active",
    anonymized: false,
    created_by: input.actor ?? input.created_by ?? null,
    updated_by: input.actor ?? null
  };
  patients.unshift(row);
  if (input.consent) {
    createConsent(tenantId, {
      patient_id: row.id,
      consent_type: input.consent.consent_type,
      version: input.consent.version,
      effective_date: today(),
      signed_by: input.consent.signed_by ?? null,
      document_ref: input.consent.document_ref ?? null,
      witness: null,
      notes: null,
      revoked_at: null,
      created_by: input.actor ?? null
    });
  }
  appendPhiAudit(tenantId, {
    actor_email: input.actor ?? null,
    action: "create",
    table_name: "hms_patients",
    record_id: row.id,
    after_diff: redactPatientForLog(row)
  });
  persist(tenantId);
  return row;
}

const patientRef = {
  get: () => patients,
  set: (rows: HmsPatient[]) => {
    patients = rows;
  },
  persist: () => persist(),
  module: "healthcare",
  entityName: "hms_patient",
  labelOf: (r: HmsPatient) => `${r.mrn} · ${r.full_name}`
};
bindTrashRestore(patientRef);

export function updatePatient(entityId: UUID, patch: Partial<HmsPatient>, actor?: string) {
  const before = patients.find((p) => p.id === entityId);
  const updated = updateEntityInCollection(patientRef, entityId, { ...patch, updated_by: actor ?? null });
  if (updated && before) {
    appendPhiAudit(updated.tenant_id, {
      actor_email: actor ?? null,
      action: "update",
      table_name: "hms_patients",
      record_id: entityId,
      before_diff: redactPatientForLog(before),
      after_diff: redactPatientForLog(updated)
    });
    queueHmsRemoteSync(updated.tenant_id, true);
  }
  return updated;
}

export function trashPatient(entityId: UUID, actor?: string) {
  const row = trashEntityInCollection(patientRef, entityId);
  if (row) {
    appendPhiAudit(row.tenant_id, {
      actor_email: actor ?? null,
      action: "trash",
      table_name: "hms_patients",
      record_id: entityId,
      before_diff: redactPatientForLog(row)
    });
    queueHmsRemoteSync(row.tenant_id, true);
  }
  return row;
}

/** GDPR erasure — anonymize under retention hold (spec §2). */
export function anonymizePatient(entityId: UUID, actor: string) {
  const updated = updatePatient(
    entityId,
    {
      full_name: "ANONYMIZED",
      phone: null,
      email: null,
      national_id: null,
      address: null,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      insurance_payer: null,
      insurance_policy_no: null,
      insurance_group_no: null,
      anonymized: true,
      status: "anonymized"
    },
    actor
  );
  if (updated) {
    appendPhiAudit(updated.tenant_id, {
      actor_email: actor,
      action: "gdpr_anonymize",
      table_name: "hms_patients",
      record_id: entityId,
      after_diff: { anonymized: true }
    });
  }
  return updated;
}

export function listConsents(tenantId: UUID, patientId?: string) {
  return consents
    .filter((c) => c.tenant_id === tenantId && c.is_active !== false && (!patientId || c.patient_id === patientId))
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date));
}

export function createConsent(
  tenantId: UUID,
  input: Omit<HmsPatientConsent, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active">
) {
  const row: HmsPatientConsent = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  consents.unshift(row);
  appendPhiAudit(tenantId, {
    actor_email: input.created_by ?? null,
    action: "create",
    table_name: "hms_patient_consents",
    record_id: row.id,
    after_diff: { consent_type: row.consent_type, version: row.version, patient_id: row.patient_id }
  });
  persist(tenantId);
  return row;
}

export function listEncounters(tenantId: UUID) {
  return encounters
    .filter((e) => e.tenant_id === tenantId && e.is_active !== false)
    .sort((a, b) => b.visit_date.localeCompare(a.visit_date) || b.created_at.localeCompare(a.created_at));
}

export function createEncounter(
  tenantId: UUID,
  input: Omit<HmsEncounter, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active" | "encounter_no" | "token_no"> & {
    token_no?: string;
    actor?: string;
  }
) {
  const dayEncounters = encounters.filter((e) => e.tenant_id === tenantId && e.visit_date === (input.visit_date || today()));
  const token = input.token_no || String(dayEncounters.length + 1).padStart(3, "0");
  const row: HmsEncounter = {
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    encounter_no: generateDocumentNumber(tenantId, "encounter"),
    encounter_type: input.encounter_type || "opd",
    patient_id: input.patient_id ?? null,
    patient_name: input.patient_name,
    doctor_name: input.doctor_name ?? null,
    department: input.department ?? null,
    token_no: token,
    queue_status: input.queue_status || "waiting",
    visit_date: input.visit_date || today(),
    chief_complaint: input.chief_complaint ?? null,
    appointment_id: input.appointment_id ?? null,
    status: input.status || "open",
    created_by: input.actor ?? null,
    updated_by: input.actor ?? null
  };
  encounters.unshift(row);
  appendPhiAudit(tenantId, {
    actor_email: input.actor ?? null,
    action: "create",
    table_name: "hms_encounters",
    record_id: row.id,
    after_diff: { encounter_no: row.encounter_no, patient_id: row.patient_id }
  });
  persist(tenantId);
  return row;
}

const encounterRef = {
  get: () => encounters,
  set: (rows: HmsEncounter[]) => {
    encounters = rows;
  },
  persist: () => persist(),
  module: "healthcare",
  entityName: "hms_encounter",
  labelOf: (r: HmsEncounter) => r.encounter_no
};
bindTrashRestore(encounterRef);

export function updateEncounter(entityId: UUID, patch: Partial<HmsEncounter>, actor?: string) {
  const updated = updateEntityInCollection(encounterRef, entityId, { ...patch, updated_by: actor ?? null });
  if (updated) {
    appendPhiAudit(updated.tenant_id, {
      actor_email: actor ?? null,
      action: "update",
      table_name: "hms_encounters",
      record_id: entityId,
      after_diff: { queue_status: updated.queue_status, status: updated.status }
    });
    queueHmsRemoteSync(updated.tenant_id, true);
  }
  return updated;
}

export function listAppointments(tenantId: UUID) {
  return appointments
    .filter((a) => a.tenant_id === tenantId && a.is_active !== false)
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
}

export function createAppointment(
  tenantId: UUID,
  input: Omit<HmsAppointment, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active">
) {
  const row: HmsAppointment = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  appointments.unshift(row);
  appendPhiAudit(tenantId, {
    actor_email: input.created_by ?? null,
    action: "create",
    table_name: "hms_appointments",
    record_id: row.id,
    after_diff: { status: row.status, patient_id: row.patient_id }
  });
  if (row.status === "scheduled" && row.scheduled_at) {
    const patient = row.patient_id ? patients.find((p) => p.id === row.patient_id) : null;
    queueAppointmentReminder(tenantId, row.id, row.scheduled_at, patient?.email);
  }
  persist(tenantId);
  return row;
}

const appointmentRef = {
  get: () => appointments,
  set: (rows: HmsAppointment[]) => {
    appointments = rows;
  },
  persist: () => persist(),
  module: "healthcare",
  entityName: "hms_appointment",
  labelOf: (r: HmsAppointment) => `${r.patient_name} · ${r.scheduled_at}`
};
bindTrashRestore(appointmentRef);

export function updateAppointment(entityId: UUID, patch: Partial<HmsAppointment>, actor?: string) {
  const updated = updateEntityInCollection(appointmentRef, entityId, { ...patch, updated_by: actor ?? null });
  if (updated) {
    appendPhiAudit(updated.tenant_id, {
      actor_email: actor ?? null,
      action: "update",
      table_name: "hms_appointments",
      record_id: entityId,
      after_diff: { status: updated.status, cancel_reason: updated.cancel_reason }
    });
    if (updated.status === "scheduled" && updated.scheduled_at) {
      const patient = updated.patient_id ? patients.find((p) => p.id === updated.patient_id) : null;
      rescheduleAppointmentReminder(updated.tenant_id, updated.id, updated.scheduled_at, patient?.email);
    }
    queueHmsRemoteSync(updated.tenant_id, true);
  }
  return updated;
}

export function listClinicalNotes(tenantId: UUID, patientId?: string) {
  return notes
    .filter(
      (n) =>
        n.tenant_id === tenantId &&
        n.is_active !== false &&
        n.is_current &&
        (!patientId || n.patient_id === patientId)
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function createClinicalNote(
  tenantId: UUID,
  input: Omit<HmsClinicalNote, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active" | "version_no" | "is_current" | "amends_note_id">
) {
  const row: HmsClinicalNote = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    version_no: 1,
    amends_note_id: null,
    is_current: true
  };
  notes.unshift(row);
  appendPhiAudit(tenantId, {
    actor_email: input.created_by ?? input.author_name,
    action: "create",
    table_name: "hms_clinical_notes",
    record_id: row.id,
    after_diff: { patient_id: row.patient_id, version_no: 1 }
  });
  persist(tenantId);
  return row;
}

/** Spec §4.5 — amendments keep original visible; no silent overwrite. */
export function amendClinicalNote(
  tenantId: UUID,
  originalId: UUID,
  patch: Partial<Pick<HmsClinicalNote, "subjective" | "objective" | "assessment" | "plan" | "free_text">>,
  author_name: string
) {
  const original = notes.find((n) => n.id === originalId && n.tenant_id === tenantId);
  if (!original) return null;
  original.is_current = false;
  original.updated_at = now();
  const row: HmsClinicalNote = {
    ...original,
    ...patch,
    id: id(),
    created_at: now(),
    updated_at: now(),
    author_name,
    version_no: original.version_no + 1,
    amends_note_id: original.id,
    is_current: true,
    created_by: author_name
  };
  notes.unshift(row);
  appendPhiAudit(tenantId, {
    actor_email: author_name,
    action: "amend",
    table_name: "hms_clinical_notes",
    record_id: row.id,
    before_diff: { note_id: original.id, version_no: original.version_no },
    after_diff: { note_id: row.id, version_no: row.version_no }
  });
  persist(tenantId);
  return row;
}

export function listProblems(tenantId: UUID, patientId: string) {
  return problems.filter((p) => p.tenant_id === tenantId && p.patient_id === patientId && p.is_active !== false);
}
export function listAllergies(tenantId: UUID, patientId: string) {
  return allergies.filter((a) => a.tenant_id === tenantId && a.patient_id === patientId && a.is_active !== false);
}
export function listMedications(tenantId: UUID, patientId: string) {
  return medications.filter((m) => m.tenant_id === tenantId && m.patient_id === patientId && m.is_active !== false);
}

export function addProblem(tenantId: UUID, input: Omit<HmsProblem, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active">) {
  const row: HmsProblem = { ...input, id: id(), tenant_id: tenantId, created_at: now(), updated_at: now(), is_active: true };
  problems.unshift(row);
  persist(tenantId);
  return row;
}
export function addAllergy(tenantId: UUID, input: Omit<HmsAllergy, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active">) {
  const row: HmsAllergy = { ...input, id: id(), tenant_id: tenantId, created_at: now(), updated_at: now(), is_active: true };
  allergies.unshift(row);
  persist(tenantId);
  return row;
}
export function addMedication(tenantId: UUID, input: Omit<HmsMedication, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active">) {
  const row: HmsMedication = { ...input, id: id(), tenant_id: tenantId, created_at: now(), updated_at: now(), is_active: true };
  medications.unshift(row);
  persist(tenantId);
  return row;
}

/** Drug–allergy check on prescribing (basic CDS). */
export function checkDrugAllergy(tenantId: UUID, patientId: string, drugName: string) {
  const q = drugName.trim().toLowerCase();
  return listAllergies(tenantId, patientId).filter(
    (a) => a.status === "active" && (q.includes(a.allergen.toLowerCase()) || a.allergen.toLowerCase().includes(q))
  );
}

export function listInvoices(tenantId: UUID) {
  return invoices
    .filter((i) => i.tenant_id === tenantId && i.is_active !== false)
    .sort((a, b) => b.invoice_date.localeCompare(a.invoice_date));
}

export function createInvoice(
  tenantId: UUID,
  input: {
    patient_id?: UUID | null;
    patient_name: string;
    encounter_id?: UUID | null;
    lines: Omit<HmsInvoiceLine, "id" | "line_total">[];
    tax_rate?: number;
    tax_amount?: number;
    discount_amount?: number;
    notes?: string | null;
    actor?: string;
  }
) {
  const lines: HmsInvoiceLine[] = input.lines.map((l) => ({
    ...l,
    id: id(),
    line_total: Math.round(l.quantity * l.unit_price * 100) / 100
  }));
  const subtotal = Math.round(lines.reduce((s, l) => s + l.line_total, 0) * 100) / 100;
  const tax_rate = input.tax_rate ?? null;
  const tax_amount =
    input.tax_amount ?? (tax_rate != null ? Math.round(subtotal * tax_rate * 100) / 10000 : 0);
  const discount_amount = input.discount_amount ?? 0;
  const total_amount = Math.round((subtotal + tax_amount - discount_amount) * 100) / 100;
  const row: HmsInvoice = {
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    invoice_no: generateDocumentNumber(tenantId, "hms_invoice"),
    patient_id: input.patient_id ?? null,
    patient_name: input.patient_name,
    encounter_id: input.encounter_id ?? null,
    invoice_date: today(),
    status: "issued",
    subtotal,
    tax_rate,
    tax_amount,
    discount_amount,
    total_amount,
    paid_amount: 0,
    payment_gateway: null,
    payment_ref: null,
    lines,
    notes: input.notes ?? null,
    created_by: input.actor ?? null
  };
  invoices.unshift(row);
  appendPhiAudit(tenantId, {
    actor_email: input.actor ?? null,
    action: "create",
    table_name: "hms_invoices",
    record_id: row.id,
    after_diff: { invoice_no: row.invoice_no, total_amount: row.total_amount }
  });
  persist(tenantId);
  return row;
}

export function recordPayment(
  tenantId: UUID,
  invoiceId: UUID,
  amount: number,
  method: string,
  actor?: string
) {
  const inv = invoices.find((i) => i.id === invoiceId);
  if (!inv) return null;
  const payment: HmsPayment = {
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    payment_no: generateDocumentNumber(tenantId, "hms_payment"),
    invoice_id: invoiceId,
    patient_name: inv.patient_name,
    amount,
    method,
    payment_date: today(),
    created_by: actor ?? null
  };
  payments.unshift(payment);
  const paid = inv.paid_amount + amount;
  inv.paid_amount = paid;
  inv.status = paid >= inv.total_amount ? "paid" : "partially_paid";
  inv.updated_at = now();
  persist(tenantId);
  return payment;
}

export function updateInvoice(entityId: UUID, patch: Partial<HmsInvoice>, actor?: string) {
  const inv = invoices.find((i) => i.id === entityId);
  if (!inv) return null;
  Object.assign(inv, patch, { updated_at: now() });
  if (patch.tax_rate != null && patch.tax_amount == null) {
    inv.tax_amount = Math.round(inv.subtotal * patch.tax_rate * 100) / 10000;
    inv.total_amount = Math.round((inv.subtotal + inv.tax_amount - inv.discount_amount) * 100) / 100;
  }
  appendPhiAudit(inv.tenant_id, {
    actor_email: actor ?? null,
    action: "update",
    table_name: "hms_invoices",
    record_id: entityId,
    after_diff: { status: inv.status, total_amount: inv.total_amount }
  });
  persist(inv.tenant_id);
  return inv;
}

/** Start Stripe checkout for an HMS clinical invoice (client-side fetch to API). */
export async function startHmsInvoiceCheckout(tenantId: UUID, invoiceId: UUID) {
  const inv = invoices.find((i) => i.id === invoiceId && i.tenant_id === tenantId);
  if (!inv) throw new Error("Invoice not found");
  const due = Math.max(0, inv.total_amount - inv.paid_amount);
  if (due <= 0) throw new Error("Invoice is already paid");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const res = await fetch("/api/healthcare/billing-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenantId,
      invoiceId,
      amount: due,
      description: `HMS invoice ${inv.invoice_no}`,
      successUrl: `${origin}/healthcare/billing?checkout=success&invoice=${invoiceId}`,
      cancelUrl: `${origin}/healthcare/billing?checkout=cancel`
    })
  });
  const json = (await res.json()) as { ok?: boolean; url?: string; reason?: string; sessionId?: string };
  if (!json.ok || !json.url) {
    updateInvoice(invoiceId, { payment_gateway: "stub", payment_ref: `stub-${Date.now()}` });
    throw new Error(json.reason ?? "Stripe not configured — payment reference stub recorded.");
  }
  updateInvoice(invoiceId, { payment_gateway: "stripe", payment_ref: json.sessionId ?? null });
  if (typeof window !== "undefined") window.location.href = json.url;
  return json;
}

export function listPhiAudit(tenantId: UUID) {
  return auditLogs.filter((a) => a.tenant_id === tenantId).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function requestBreakGlass(
  tenantId: UUID,
  input: { actor_email: string; patient_id?: string | null; patient_mrn?: string | null; justification: string }
) {
  if (!input.justification.trim()) throw new Error("Justification is required for break-glass access.");
  const row: HmsBreakGlass = {
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    actor_email: input.actor_email,
    patient_id: input.patient_id ?? null,
    patient_mrn: input.patient_mrn ?? null,
    justification: input.justification.trim(),
    alerted_security_officer: true,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  };
  breakGlass.unshift(row);
  appendPhiAudit(tenantId, {
    actor_email: input.actor_email,
    action: "break_glass",
    table_name: "hms_break_glass",
    record_id: row.id,
    justification: row.justification,
    break_glass: true,
    after_diff: { patient_mrn: row.patient_mrn, alerted: true }
  });
  persist(tenantId);
  return row;
}

export function listBreakGlass(tenantId: UUID) {
  return breakGlass.filter((b) => b.tenant_id === tenantId).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** GDPR DSAR — machine-readable patient export (no secrets). */
export function exportPatientDsar(tenantId: UUID, patientId: UUID) {
  const patient = patients.find((p) => p.id === patientId && p.tenant_id === tenantId);
  if (!patient) return null;
  appendPhiAudit(tenantId, {
    action: "dsar_export",
    table_name: "hms_patients",
    record_id: patientId,
    after_diff: { export: true }
  });
  return {
    exported_at: now(),
    patient,
    consents: listConsents(tenantId, patientId),
    encounters: listEncounters(tenantId).filter((e) => e.patient_id === patientId),
    appointments: listAppointments(tenantId).filter((a) => a.patient_id === patientId),
    clinical_notes: listClinicalNotes(tenantId, patientId),
    problems: listProblems(tenantId, patientId),
    allergies: listAllergies(tenantId, patientId),
    medications: listMedications(tenantId, patientId),
    invoices: listInvoices(tenantId).filter((i) => i.patient_id === patientId),
    payments: payments.filter((p) => p.tenant_id === tenantId && invoices.some((i) => i.id === p.invoice_id && i.patient_id === patientId))
  };
}

export function listHmsRoles(tenantId: UUID) {
  return roles.filter((r) => r.tenant_id === tenantId && r.is_active !== false);
}

/** True when the user has an active HMS role assignment with MFA required for this tenant. */
export function userRequiresHmsMfa(email: string, tenantId: UUID) {
  const normalized = email.trim().toLowerCase();
  return listHmsRoles(tenantId).some(
    (r) => r.staff_email.trim().toLowerCase() === normalized && r.mfa_required
  );
}

export function assignHmsRole(
  tenantId: UUID,
  input: Omit<HmsRoleAssignment, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active">
) {
  const row: HmsRoleAssignment = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    mfa_required: input.mfa_required !== false
  };
  roles.unshift(row);
  appendPhiAudit(tenantId, {
    actor_email: input.created_by ?? null,
    action: "role_assign",
    table_name: "hms_role_assignments",
    record_id: row.id,
    after_diff: { staff_email: row.staff_email, hms_role: row.hms_role, mfa_required: row.mfa_required }
  });
  persist(tenantId);
  return row;
}

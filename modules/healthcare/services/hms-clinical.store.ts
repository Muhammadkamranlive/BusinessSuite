import type { UUID } from "@/modules/core/types";
import { generateDocumentNumber } from "@/modules/core/services/numbering.service";
import { bindTrashRestore, trashEntityInCollection, updateEntityInCollection } from "@/modules/core/services/entity-crud";
import type {
  HmsAdmission,
  HmsAmbulanceDispatch,
  HmsBed,
  HmsBranch,
  HmsClinicalAnalytics,
  HmsDispense,
  HmsDutyRoster,
  HmsEmergencyIntake,
  HmsEquipmentAsset,
  HmsImagingOrder,
  HmsInsuranceClaim,
  HmsLabOrder,
  HmsLabResult,
  HmsMar,
  HmsMessage,
  HmsMessageThread,
  HmsNotification,
  HmsNotificationPref,
  HmsPharmacyStock,
  HmsPrescription,
  HmsPrescriptionItem,
  HmsStaff,
  HmsTelemedicineSession,
  HmsTransfer,
  HmsVital,
  HmsWard,
  HmsBranchShareConsent,
  HmsDoctorLeave,
  HmsEmrAttachment,
  HmsPharmacyPoItem,
  HmsPharmacyPurchaseOrder,
  HmsReminderQueue,
  HmsWaitlistEntry
} from "@/modules/healthcare/model/hms-clinical";
import type { HmsClinicalRemoteSnapshot } from "@/modules/healthcare/services/hms-clinical.supabase-sync";
import {
  exportDischargeSummaryPdf as buildDischargeSummaryPdf,
  exportLabReportPdf as buildLabReportPdf,
  exportPrescriptionPdf as buildPrescriptionPdf
} from "@/modules/healthcare/services/hms-clinical-pdf";
import {
  anonymizePatient,
  appendPhiAudit,
  checkDrugAllergy,
  getPatientById,
  listInvoices,
  updatePatient
} from "@/modules/healthcare/services/hms.store";

export type * from "@/modules/healthcare/model/hms-clinical";

function now() {
  return new Date().toISOString();
}
function today() {
  return now().slice(0, 10);
}
function id() {
  return crypto.randomUUID();
}

let branches: HmsBranch[] = [];
let wards: HmsWard[] = [];
let beds: HmsBed[] = [];
let admissions: HmsAdmission[] = [];
let transfers: HmsTransfer[] = [];
let vitals: HmsVital[] = [];
let mar: HmsMar[] = [];
let prescriptions: HmsPrescription[] = [];
let labOrders: HmsLabOrder[] = [];
let labResults: HmsLabResult[] = [];
let imagingOrders: HmsImagingOrder[] = [];
let pharmacyStock: HmsPharmacyStock[] = [];
let dispenses: HmsDispense[] = [];
let insuranceClaims: HmsInsuranceClaim[] = [];
let telemedicineSessions: HmsTelemedicineSession[] = [];
let ambulanceDispatches: HmsAmbulanceDispatch[] = [];
let emergencyIntakes: HmsEmergencyIntake[] = [];
let staff: HmsStaff[] = [];
let dutyRosters: HmsDutyRoster[] = [];
let equipmentAssets: HmsEquipmentAsset[] = [];
let notificationPrefs: HmsNotificationPref[] = [];
let notifications: HmsNotification[] = [];
let messageThreads: HmsMessageThread[] = [];
let messages: HmsMessage[] = [];
let waitlistEntries: HmsWaitlistEntry[] = [];
let doctorLeaves: HmsDoctorLeave[] = [];
let emrAttachments: HmsEmrAttachment[] = [];
let pharmacyPos: HmsPharmacyPurchaseOrder[] = [];
let pharmacyPoItems: HmsPharmacyPoItem[] = [];
let branchShareConsents: HmsBranchShareConsent[] = [];
let reminderQueue: HmsReminderQueue[] = [];
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let pendingTenantId: string | undefined;

const EVENT = "businesssuite:hms-clinical-changed";

function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT));
}

function syncEnabled() {
  return process.env.NEXT_PUBLIC_HMS_USE_SUPABASE !== "false";
}

function persist(tenantId?: string) {
  emit();
  queueHmsClinicalRemoteSync(tenantId);
}

function phiRef(patientId?: string | null, recordId?: string) {
  return { patient_id: patientId ?? null, record_id: recordId ?? null };
}

export function buildHmsClinicalSnapshot(tenantId?: string): HmsClinicalRemoteSnapshot {
  const f = <T extends { tenant_id: string }>(rows: T[]) =>
    tenantId ? rows.filter((r) => r.tenant_id === tenantId) : rows;
  return {
    version: 1,
    tenantId,
    branches: f(branches),
    wards: f(wards),
    beds: f(beds),
    admissions: f(admissions),
    transfers: f(transfers),
    vitals: f(vitals),
    mar: f(mar),
    prescriptions: f(prescriptions),
    labOrders: f(labOrders),
    labResults: f(labResults),
    imagingOrders: f(imagingOrders),
    pharmacyStock: f(pharmacyStock),
    dispenses: f(dispenses),
    insuranceClaims: f(insuranceClaims),
    telemedicineSessions: f(telemedicineSessions),
    ambulanceDispatches: f(ambulanceDispatches),
    emergencyIntakes: f(emergencyIntakes),
    staff: f(staff),
    dutyRosters: f(dutyRosters),
    equipmentAssets: f(equipmentAssets),
    notificationPrefs: f(notificationPrefs),
    notifications: f(notifications),
    messageThreads: f(messageThreads),
    messages: f(messages),
    waitlistEntries: f(waitlistEntries),
    doctorLeaves: f(doctorLeaves),
    emrAttachments: f(emrAttachments),
    pharmacyPos: f(pharmacyPos),
    pharmacyPoItems: f(pharmacyPoItems),
    branchShareConsents: f(branchShareConsents),
    reminderQueue: f(reminderQueue)
  };
}

export function queueHmsClinicalRemoteSync(tenantId?: string, immediate = false) {
  if (typeof window === "undefined" || !syncEnabled()) return;
  if (tenantId) pendingTenantId = tenantId;
  const push = () => {
    const tid = pendingTenantId;
    pendingTenantId = undefined;
    void fetch("/api/healthcare/hms-clinical-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildHmsClinicalSnapshot(tid))
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

export async function pullHmsClinicalFromSupabase(tenantId: string) {
  if (typeof window === "undefined" || !syncEnabled()) return false;
  try {
    const res = await fetch(`/api/healthcare/hms-clinical-sync?tenantId=${encodeURIComponent(tenantId)}`);
    const json = (await res.json()) as { ok?: boolean; skipped?: boolean; snapshot?: HmsClinicalRemoteSnapshot };
    if (!json.ok || json.skipped || !json.snapshot) return false;
    const s = json.snapshot;
    const keep = <T extends { tenant_id: string }>(rows: T[], incoming: T[]) => [
      ...incoming,
      ...rows.filter((r) => r.tenant_id !== tenantId)
    ];
    branches = keep(branches, s.branches);
    wards = keep(wards, s.wards);
    beds = keep(beds, s.beds);
    admissions = keep(admissions, s.admissions);
    transfers = keep(transfers, s.transfers);
    vitals = keep(vitals, s.vitals);
    mar = keep(mar, s.mar);
    prescriptions = keep(prescriptions, s.prescriptions);
    labOrders = keep(labOrders, s.labOrders);
    labResults = keep(labResults, s.labResults);
    imagingOrders = keep(imagingOrders, s.imagingOrders);
    pharmacyStock = keep(pharmacyStock, s.pharmacyStock);
    dispenses = keep(dispenses, s.dispenses);
    insuranceClaims = keep(insuranceClaims, s.insuranceClaims);
    telemedicineSessions = keep(telemedicineSessions, s.telemedicineSessions);
    ambulanceDispatches = keep(ambulanceDispatches, s.ambulanceDispatches);
    emergencyIntakes = keep(emergencyIntakes, s.emergencyIntakes);
    staff = keep(staff, s.staff);
    dutyRosters = keep(dutyRosters, s.dutyRosters);
    equipmentAssets = keep(equipmentAssets, s.equipmentAssets);
    notificationPrefs = keep(notificationPrefs, s.notificationPrefs);
    notifications = keep(notifications, s.notifications);
    messageThreads = keep(messageThreads, s.messageThreads);
    messages = keep(messages, s.messages);
    waitlistEntries = keep(waitlistEntries, s.waitlistEntries ?? []);
    doctorLeaves = keep(doctorLeaves, s.doctorLeaves ?? []);
    emrAttachments = keep(emrAttachments, s.emrAttachments ?? []);
    pharmacyPos = keep(pharmacyPos, s.pharmacyPos ?? []);
    pharmacyPoItems = keep(pharmacyPoItems, s.pharmacyPoItems ?? []);
    branchShareConsents = keep(branchShareConsents, s.branchShareConsents ?? []);
    reminderQueue = keep(reminderQueue, s.reminderQueue ?? []);
    emit();
    return true;
  } catch {
    return false;
  }
}

export function subscribeHmsClinical(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

// ── Branches ────────────────────────────────────────────────────────────────

export function listBranches(tenantId: UUID) {
  return branches.filter((b) => b.tenant_id === tenantId && b.is_active !== false).sort((a, b) => a.code.localeCompare(b.code));
}

export function createBranch(
  tenantId: UUID,
  input: Omit<HmsBranch, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active">
) {
  const row: HmsBranch = { ...input, id: id(), tenant_id: tenantId, created_at: now(), updated_at: now(), is_active: true };
  branches.unshift(row);
  persist(tenantId);
  return row;
}

const branchRef = {
  get: () => branches,
  set: (rows: HmsBranch[]) => {
    branches = rows;
  },
  persist: () => persist(),
  module: "healthcare",
  entityName: "hms_branch",
  labelOf: (r: HmsBranch) => r.name
};
bindTrashRestore(branchRef);

export function updateBranch(entityId: UUID, patch: Partial<HmsBranch>) {
  return updateEntityInCollection(branchRef, entityId, patch);
}

export function trashBranch(entityId: UUID) {
  return trashEntityInCollection(branchRef, entityId);
}

// ── Wards & Beds ────────────────────────────────────────────────────────────

export function listWards(tenantId: UUID) {
  return wards.filter((w) => w.tenant_id === tenantId && w.is_active !== false).sort((a, b) => a.code.localeCompare(b.code));
}

export function createWard(
  tenantId: UUID,
  input: Omit<HmsWard, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active">
) {
  const row: HmsWard = { ...input, id: id(), tenant_id: tenantId, created_at: now(), updated_at: now(), is_active: true };
  wards.unshift(row);
  persist(tenantId);
  return row;
}

const wardRef = {
  get: () => wards,
  set: (rows: HmsWard[]) => {
    wards = rows;
  },
  persist: () => persist(),
  module: "healthcare",
  entityName: "hms_ward",
  labelOf: (r: HmsWard) => r.name
};
bindTrashRestore(wardRef);

export function updateWard(entityId: UUID, patch: Partial<HmsWard>) {
  return updateEntityInCollection(wardRef, entityId, patch);
}

export function trashWard(entityId: UUID) {
  return trashEntityInCollection(wardRef, entityId);
}

export function listBeds(tenantId: UUID, wardId?: string) {
  return beds
    .filter((b) => b.tenant_id === tenantId && b.is_active !== false && (!wardId || b.ward_id === wardId))
    .sort((a, b) => a.bed_no.localeCompare(b.bed_no));
}

export function createBed(
  tenantId: UUID,
  input: Omit<HmsBed, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active" | "status" | "housekeeping_status"> & {
    status?: HmsBed["status"];
    housekeeping_status?: HmsBed["housekeeping_status"];
  }
) {
  const row: HmsBed = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    status: input.status ?? "available",
    housekeeping_status: input.housekeeping_status ?? "clean"
  };
  beds.unshift(row);
  persist(tenantId);
  return row;
}

const bedRef = {
  get: () => beds,
  set: (rows: HmsBed[]) => {
    beds = rows;
  },
  persist: () => persist(),
  module: "healthcare",
  entityName: "hms_bed",
  labelOf: (r: HmsBed) => r.bed_no
};
bindTrashRestore(bedRef);

export function updateBed(entityId: UUID, patch: Partial<HmsBed>) {
  return updateEntityInCollection(bedRef, entityId, patch);
}

export function setBedStatus(entityId: UUID, status: HmsBed["status"]) {
  return updateBed(entityId, { status });
}

export function setBedHousekeeping(entityId: UUID, housekeeping_status: HmsBed["housekeeping_status"]) {
  return updateBed(entityId, { housekeeping_status });
}

export function trashBed(entityId: UUID) {
  return trashEntityInCollection(bedRef, entityId);
}

// ── Admissions ──────────────────────────────────────────────────────────────

const MORTALITY_PRIVILEGED_ROLES = new Set(["hospital_admin", "super_admin", "company_admin", "it_security"]);

export function canViewMortalityRecords(roleOrActor?: string | null) {
  if (!roleOrActor) return false;
  const role = roleOrActor.includes("@") ? null : roleOrActor;
  if (role && MORTALITY_PRIVILEGED_ROLES.has(role)) return true;
  const email = roleOrActor.toLowerCase();
  return email === "admin@demo.com" || email === "manager@demo.com";
}

export function listAdmissions(tenantId: UUID, opts?: { actorRole?: string }) {
  let rows = admissions
    .filter((a) => a.tenant_id === tenantId && a.is_active !== false)
    .sort((a, b) => b.admitted_at.localeCompare(a.admitted_at));
  if (opts?.actorRole && !canViewMortalityRecords(opts.actorRole)) {
    rows = rows.filter((a) => !a.mortality && a.status !== "deceased");
  }
  return rows;
}

export function exportDischargeSummaryPdf(
  tenantId: UUID,
  admissionId: UUID,
  opts?: { canViewMortality?: boolean }
) {
  const adm = admissions.find((a) => a.id === admissionId && a.tenant_id === tenantId);
  if (!adm) return null;
  const patient = adm.patient_id ? getPatientById(adm.patient_id) : null;
  buildDischargeSummaryPdf(tenantId, adm, {
    mrn: patient?.mrn,
    canViewMortality: opts?.canViewMortality ?? false
  });
  return adm;
}

export function admitPatient(
  tenantId: UUID,
  input: Omit<
    HmsAdmission,
    "id" | "tenant_id" | "created_at" | "updated_at" | "is_active" | "admission_no" | "status" | "discharge_summary" | "discharged_at" | "mortality"
  > & { actor?: string }
) {
  const row: HmsAdmission = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    admission_no: generateDocumentNumber(tenantId, "hms_admission"),
    status: "admitted",
    discharge_summary: null,
    discharged_at: null,
    mortality: false,
    created_by: input.actor ?? input.created_by ?? null
  };
  admissions.unshift(row);
  if (row.bed_id) {
    const bed = beds.find((b) => b.id === row.bed_id);
    if (bed) {
      bed.status = "occupied";
      bed.updated_at = now();
    }
  }
  appendPhiAudit(tenantId, {
    actor_email: input.actor ?? null,
    action: "create",
    table_name: "hms_admissions",
    record_id: row.id,
    after_diff: { admission_no: row.admission_no, ...phiRef(row.patient_id, row.id) }
  });
  persist(tenantId);
  return row;
}

const admissionRef = {
  get: () => admissions,
  set: (rows: HmsAdmission[]) => {
    admissions = rows;
  },
  persist: () => persist(),
  module: "healthcare",
  entityName: "hms_admission",
  labelOf: (r: HmsAdmission) => r.admission_no
};
bindTrashRestore(admissionRef);

export function transferAdmission(
  tenantId: UUID,
  admissionId: UUID,
  input: { to_ward_id?: UUID | null; to_bed_id?: UUID | null; reason: string; actor?: string }
) {
  const adm = admissions.find((a) => a.id === admissionId && a.tenant_id === tenantId);
  if (!adm) return null;
  const fromWard = adm.ward_id;
  const fromBed = adm.bed_id;
  if (fromBed) {
    const oldBed = beds.find((b) => b.id === fromBed);
    if (oldBed) {
      oldBed.status = "housekeeping";
      oldBed.housekeeping_status = "dirty";
      oldBed.updated_at = now();
    }
  }
  if (input.to_bed_id) {
    const newBed = beds.find((b) => b.id === input.to_bed_id);
    if (newBed) {
      newBed.status = "occupied";
      newBed.updated_at = now();
    }
  }
  adm.ward_id = input.to_ward_id ?? adm.ward_id;
  adm.bed_id = input.to_bed_id ?? adm.bed_id;
  adm.status = "transferred";
  adm.updated_at = now();
  const xfer: HmsTransfer = {
    id: id(),
    tenant_id: tenantId,
    admission_id: admissionId,
    from_ward_id: fromWard ?? null,
    to_ward_id: input.to_ward_id ?? null,
    from_bed_id: fromBed ?? null,
    to_bed_id: input.to_bed_id ?? null,
    reason: input.reason,
    transferred_at: now(),
    created_by: input.actor ?? null,
    created_at: now()
  };
  transfers.unshift(xfer);
  appendPhiAudit(tenantId, {
    actor_email: input.actor ?? null,
    action: "transfer",
    table_name: "hms_admissions",
    record_id: admissionId,
    after_diff: { transfer_id: xfer.id, ...phiRef(adm.patient_id, admissionId) }
  });
  persist(tenantId);
  return { admission: adm, transfer: xfer };
}

export function dischargeAdmission(
  tenantId: UUID,
  admissionId: UUID,
  input: { discharge_summary: string; mortality?: boolean; actor?: string }
) {
  const adm = admissions.find((a) => a.id === admissionId && a.tenant_id === tenantId);
  if (!adm) return null;
  adm.status = input.mortality ? "deceased" : "discharged";
  adm.discharge_summary = input.discharge_summary;
  adm.discharged_at = now();
  adm.mortality = Boolean(input.mortality);
  adm.updated_at = now();
  if (adm.bed_id) {
    const bed = beds.find((b) => b.id === adm.bed_id);
    if (bed) {
      bed.status = "housekeeping";
      bed.housekeeping_status = "dirty";
      bed.updated_at = now();
    }
  }
  appendPhiAudit(tenantId, {
    actor_email: input.actor ?? null,
    action: "discharge",
    table_name: "hms_admissions",
    record_id: admissionId,
    after_diff: { status: adm.status, mortality: adm.mortality, ...phiRef(adm.patient_id, admissionId) }
  });
  persist(tenantId);
  return adm;
}

export function listTransfers(tenantId: UUID, admissionId?: string) {
  return transfers
    .filter((t) => t.tenant_id === tenantId && (!admissionId || t.admission_id === admissionId))
    .sort((a, b) => b.transferred_at.localeCompare(a.transferred_at));
}

// ── Vitals & MAR ────────────────────────────────────────────────────────────

export function listVitals(tenantId: UUID, patientId?: string) {
  return vitals
    .filter((v) => v.tenant_id === tenantId && v.is_active !== false && (!patientId || v.patient_id === patientId))
    .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));
}

export function recordVital(
  tenantId: UUID,
  input: Omit<HmsVital, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active" | "recorded_at"> & {
    recorded_at?: string;
    actor?: string;
  }
) {
  const row: HmsVital = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    recorded_at: input.recorded_at ?? now(),
    recorded_by: input.actor ?? input.recorded_by ?? null
  };
  vitals.unshift(row);
  appendPhiAudit(tenantId, {
    actor_email: input.actor ?? null,
    action: "create",
    table_name: "hms_vitals",
    record_id: row.id,
    after_diff: phiRef(row.patient_id, row.id)
  });
  persist(tenantId);
  return row;
}

export function listMar(tenantId: UUID, admissionId?: string) {
  return mar
    .filter((m) => m.tenant_id === tenantId && m.is_active !== false && (!admissionId || m.admission_id === admissionId))
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
}

export function scheduleMar(
  tenantId: UUID,
  input: Omit<HmsMar, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active" | "status" | "given_at" | "given_by">
) {
  const row: HmsMar = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    status: "scheduled",
    given_at: null,
    given_by: null
  };
  mar.unshift(row);
  appendPhiAudit(tenantId, {
    actor_email: null,
    action: "create",
    table_name: "hms_mar",
    record_id: row.id,
    after_diff: phiRef(row.patient_id, row.id)
  });
  persist(tenantId);
  return row;
}

export function administerMar(tenantId: UUID, marId: UUID, input: { status: HmsMar["status"]; given_by?: string; notes?: string }) {
  const row = mar.find((m) => m.id === marId && m.tenant_id === tenantId);
  if (!row) return null;
  row.status = input.status;
  row.given_at = input.status === "given" ? now() : row.given_at;
  row.given_by = input.given_by ?? row.given_by;
  row.notes = input.notes ?? row.notes;
  row.updated_at = now();
  appendPhiAudit(tenantId, {
    actor_email: input.given_by ?? null,
    action: "update",
    table_name: "hms_mar",
    record_id: marId,
    after_diff: { status: row.status, ...phiRef(row.patient_id, marId) }
  });
  persist(tenantId);
  return row;
}

// ── Prescriptions ───────────────────────────────────────────────────────────

export function listPrescriptions(tenantId: UUID, patientId?: string) {
  return prescriptions
    .filter((p) => p.tenant_id === tenantId && p.is_active !== false && (!patientId || p.patient_id === patientId))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function createPrescriptionDraft(
  tenantId: UUID,
  input: Omit<HmsPrescription, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active" | "rx_no" | "status" | "supersedes_rx_id" | "allergy_checked" | "issued_at"> & {
    actor?: string;
  }
) {
  const row: HmsPrescription = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    rx_no: generateDocumentNumber(tenantId, "hms_prescription"),
    status: "draft",
    supersedes_rx_id: null,
    allergy_checked: false,
    issued_at: null,
    created_by: input.actor ?? input.created_by ?? null
  };
  prescriptions.unshift(row);
  persist(tenantId);
  return row;
}

export function issuePrescription(tenantId: UUID, rxId: UUID, actor?: string) {
  const rx = prescriptions.find((p) => p.id === rxId && p.tenant_id === tenantId);
  if (!rx) return null;
  if (rx.status === "issued" || rx.status === "superseded") {
    throw new Error(`Prescription ${rx.rx_no} is immutable once issued. Use correctPrescription.`);
  }
  let allergyChecked = false;
  if (rx.patient_id) {
    for (const item of rx.items) {
      const hits = checkDrugAllergy(tenantId, rx.patient_id, item.drug_name);
      if (hits.length) {
        throw new Error(`Allergy conflict for patient ${rx.patient_id}: drug ${item.drug_name} matches allergen(s).`);
      }
    }
    allergyChecked = true;
  }
  rx.status = "issued";
  rx.allergy_checked = allergyChecked;
  rx.issued_at = now();
  rx.updated_at = now();
  appendPhiAudit(tenantId, {
    actor_email: actor ?? null,
    action: "issue",
    table_name: "hms_prescriptions",
    record_id: rxId,
    after_diff: { rx_no: rx.rx_no, allergy_checked: allergyChecked, ...phiRef(rx.patient_id, rxId) }
  });
  persist(tenantId);
  return rx;
}

/** Correction creates a new Rx linked to the superseded one; original stays immutable. */
export function correctPrescription(
  tenantId: UUID,
  originalId: UUID,
  items: HmsPrescriptionItem[],
  actor?: string
) {
  const original = prescriptions.find((p) => p.id === originalId && p.tenant_id === tenantId);
  if (!original) return null;
  if (original.status !== "issued" && original.status !== "dispensed") {
    throw new Error(`Prescription ${original.rx_no} must be issued before correction.`);
  }
  original.status = "superseded";
  original.updated_at = now();
  const row: HmsPrescription = {
    ...original,
    id: id(),
    created_at: now(),
    updated_at: now(),
    rx_no: generateDocumentNumber(tenantId, "hms_prescription"),
    status: "draft",
    supersedes_rx_id: original.id,
    items,
    allergy_checked: false,
    issued_at: null,
    created_by: actor ?? original.created_by ?? null
  };
  prescriptions.unshift(row);
  appendPhiAudit(tenantId, {
    actor_email: actor ?? null,
    action: "correct",
    table_name: "hms_prescriptions",
    record_id: row.id,
    before_diff: { superseded_rx_id: original.id, rx_no: original.rx_no },
    after_diff: { rx_no: row.rx_no, ...phiRef(row.patient_id, row.id) }
  });
  persist(tenantId);
  return issuePrescription(tenantId, row.id, actor);
}

// ── Lab ─────────────────────────────────────────────────────────────────────

export function listLabOrders(tenantId: UUID) {
  return labOrders
    .filter((o) => o.tenant_id === tenantId && o.is_active !== false)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function createLabOrder(
  tenantId: UUID,
  input: Omit<
    HmsLabOrder,
    "id" | "tenant_id" | "created_at" | "updated_at" | "is_active" | "order_no" | "status" | "critical_alerted"
  > & { actor?: string; sample_barcode?: string }
) {
  const row: HmsLabOrder = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    order_no: generateDocumentNumber(tenantId, "hms_lab_order"),
    status: "ordered",
    critical_alerted: false,
    sample_barcode: input.sample_barcode ?? generateDocumentNumber(tenantId, "hms_lab_barcode"),
    created_by: input.actor ?? input.created_by ?? null
  };
  labOrders.unshift(row);
  appendPhiAudit(tenantId, {
    actor_email: input.actor ?? null,
    action: "create",
    table_name: "hms_lab_orders",
    record_id: row.id,
    after_diff: { order_no: row.order_no, ...phiRef(row.patient_id, row.id) }
  });
  persist(tenantId);
  return row;
}

export function updateLabOrder(entityId: UUID, patch: Partial<HmsLabOrder>, actor?: string) {
  const row = labOrders.find((o) => o.id === entityId);
  if (!row) return null;
  Object.assign(row, patch, { updated_at: now() });
  appendPhiAudit(row.tenant_id, {
    actor_email: actor ?? null,
    action: "update",
    table_name: "hms_lab_orders",
    record_id: entityId,
    after_diff: { status: row.status, ...phiRef(row.patient_id, entityId) }
  });
  queueHmsClinicalRemoteSync(row.tenant_id, true);
  emit();
  return row;
}

export function listLabResults(tenantId: UUID, labOrderId?: string) {
  return labResults
    .filter((r) => r.tenant_id === tenantId && (!labOrderId || r.lab_order_id === labOrderId))
    .sort((a, b) => b.resulted_at.localeCompare(a.resulted_at));
}

export function addLabResult(
  tenantId: UUID,
  input: Omit<HmsLabResult, "id" | "tenant_id" | "created_at" | "resulted_at"> & { resulted_at?: string; actor?: string }
) {
  const order = labOrders.find((o) => o.id === input.lab_order_id && o.tenant_id === tenantId);
  const row: HmsLabResult = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    resulted_at: input.resulted_at ?? now(),
    resulted_by: input.actor ?? input.resulted_by ?? null
  };
  labResults.unshift(row);
  if (order) {
    order.status = row.flag === "critical" ? "critical" : "resulted";
    order.updated_at = now();
    if (row.flag === "critical") {
      const firstAlert = !order.critical_alerted;
      order.critical_alerted = true;
      if (firstAlert) {
        createNotification(tenantId, {
          recipient_ref: "lab_team",
          channel: "in_app",
          title: "Critical lab result",
          body_generic: "A critical lab result requires review. Open lab orders for details.",
          kind: "lab_critical"
        });
        enqueueReminder(tenantId, {
          channel: "email",
          template_key: "hms_lab_critical",
          recipient_email: "lab@hospital.local",
          recipient_phone: null,
          payload_generic: { order_id: order.id, kind: "lab_critical" },
          scheduled_at: now()
        });
      }
    }
  }
  appendPhiAudit(tenantId, {
    actor_email: input.actor ?? null,
    action: "create",
    table_name: "hms_lab_results",
    record_id: row.id,
    after_diff: { lab_order_id: row.lab_order_id, flag: row.flag, ...phiRef(order?.patient_id, row.id) }
  });
  persist(tenantId);
  return row;
}

export function printLabBarcode(tenantId: UUID, orderId: UUID, actor?: string) {
  const order = labOrders.find((o) => o.id === orderId && o.tenant_id === tenantId);
  if (!order) return null;
  if (!order.sample_barcode) {
    order.sample_barcode = generateDocumentNumber(tenantId, "hms_lab_barcode");
  }
  order.barcode_printed_at = now();
  order.updated_at = now();
  appendPhiAudit(tenantId, {
    actor_email: actor ?? null,
    action: "print_barcode",
    table_name: "hms_lab_orders",
    record_id: orderId,
    after_diff: { sample_barcode: order.sample_barcode, ...phiRef(order.patient_id, orderId) }
  });
  persist(tenantId);
  return order;
}

export function collectLabSample(tenantId: UUID, orderId: UUID, actor?: string) {
  const order = labOrders.find((o) => o.id === orderId && o.tenant_id === tenantId);
  if (!order) return null;
  order.status = "collected";
  order.collected_at = now();
  order.updated_at = now();
  appendPhiAudit(tenantId, {
    actor_email: actor ?? null,
    action: "collect_sample",
    table_name: "hms_lab_orders",
    record_id: orderId,
    after_diff: { status: "collected", ...phiRef(order.patient_id, orderId) }
  });
  persist(tenantId);
  return order;
}

export function exportLabReportPdf(tenantId: UUID, orderId: UUID) {
  const order = labOrders.find((o) => o.id === orderId && o.tenant_id === tenantId);
  if (!order) return null;
  const results = listLabResults(tenantId, orderId);
  const patient = order.patient_id ? getPatientById(order.patient_id) : null;
  buildLabReportPdf(tenantId, order, results, { mrn: patient?.mrn });
  return order;
}

export function exportPrescriptionPdf(tenantId: UUID, rxId: UUID) {
  const rx = prescriptions.find((p) => p.id === rxId && p.tenant_id === tenantId);
  if (!rx) return null;
  buildPrescriptionPdf(tenantId, rx);
  return rx;
}

// ── Imaging ─────────────────────────────────────────────────────────────────

export function listImagingOrders(tenantId: UUID) {
  return imagingOrders
    .filter((o) => o.tenant_id === tenantId && o.is_active !== false)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function createImagingOrder(
  tenantId: UUID,
  input: Omit<HmsImagingOrder, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active" | "order_no" | "status" | "signed_at"> & {
    actor?: string;
  }
) {
  const row: HmsImagingOrder = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    order_no: generateDocumentNumber(tenantId, "hms_imaging_order"),
    status: "ordered",
    signed_at: null,
    created_by: input.actor ?? input.created_by ?? null
  };
  imagingOrders.unshift(row);
  appendPhiAudit(tenantId, {
    actor_email: input.actor ?? null,
    action: "create",
    table_name: "hms_imaging_orders",
    record_id: row.id,
    after_diff: { order_no: row.order_no, ...phiRef(row.patient_id, row.id) }
  });
  persist(tenantId);
  return row;
}

export function updateImagingOrder(entityId: UUID, patch: Partial<HmsImagingOrder>, actor?: string) {
  const row = imagingOrders.find((o) => o.id === entityId);
  if (!row) return null;
  Object.assign(row, patch, { updated_at: now() });
  appendPhiAudit(row.tenant_id, {
    actor_email: actor ?? null,
    action: "update",
    table_name: "hms_imaging_orders",
    record_id: entityId,
    after_diff: { pacs_viewer_url: row.pacs_viewer_url, ...phiRef(row.patient_id, entityId) }
  });
  queueHmsClinicalRemoteSync(row.tenant_id, true);
  emit();
  return row;
}

export function signOffImaging(
  tenantId: UUID,
  orderId: UUID,
  input: { report_text: string; radiologist_name: string; dicom_ref?: string; actor?: string }
) {
  const order = imagingOrders.find((o) => o.id === orderId && o.tenant_id === tenantId);
  if (!order) return null;
  order.report_text = input.report_text;
  order.radiologist_name = input.radiologist_name;
  order.dicom_ref = input.dicom_ref ?? order.dicom_ref;
  order.status = "signed_off";
  order.signed_at = now();
  order.updated_at = now();
  appendPhiAudit(tenantId, {
    actor_email: input.actor ?? null,
    action: "sign_off",
    table_name: "hms_imaging_orders",
    record_id: orderId,
    after_diff: { status: "signed_off", ...phiRef(order.patient_id, orderId) }
  });
  persist(tenantId);
  return order;
}

// ── Pharmacy stock & dispenses ──────────────────────────────────────────────

export function listPharmacyStock(tenantId: UUID) {
  return pharmacyStock
    .filter((s) => s.tenant_id === tenantId && s.is_active !== false)
    .sort((a, b) => a.drug_name.localeCompare(b.drug_name));
}

export function listLowStock(tenantId: UUID) {
  return listPharmacyStock(tenantId).filter((s) => s.quantity <= s.reorder_level);
}

export function listNearExpiry(tenantId: UUID, withinDays = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return listPharmacyStock(tenantId).filter((s) => s.expiry_date <= cutoffStr);
}

export function createPharmacyStock(
  tenantId: UUID,
  input: Omit<HmsPharmacyStock, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active">
) {
  const row: HmsPharmacyStock = { ...input, id: id(), tenant_id: tenantId, created_at: now(), updated_at: now(), is_active: true };
  pharmacyStock.unshift(row);
  persist(tenantId);
  return row;
}

const stockRef = {
  get: () => pharmacyStock,
  set: (rows: HmsPharmacyStock[]) => {
    pharmacyStock = rows;
  },
  persist: () => persist(),
  module: "healthcare",
  entityName: "hms_pharmacy_stock",
  labelOf: (r: HmsPharmacyStock) => `${r.sku} · ${r.drug_name}`
};
bindTrashRestore(stockRef);

export function updatePharmacyStock(entityId: UUID, patch: Partial<HmsPharmacyStock>) {
  return updateEntityInCollection(stockRef, entityId, patch);
}

export function listDispenses(tenantId: UUID) {
  return dispenses
    .filter((d) => d.tenant_id === tenantId && d.is_active !== false)
    .sort((a, b) => b.dispensed_at.localeCompare(a.dispensed_at));
}

export function dispenseFromRx(
  tenantId: UUID,
  input: {
    prescription_id: UUID;
    stock_id?: UUID | null;
    drug_name: string;
    quantity: number;
    actor?: string;
  }
) {
  const rx = prescriptions.find((p) => p.id === input.prescription_id && p.tenant_id === tenantId);
  if (!rx) throw new Error(`Prescription ${input.prescription_id} not found.`);
  if (rx.status !== "issued") throw new Error(`Prescription ${rx.rx_no} must be issued before dispense.`);
  if (input.stock_id) {
    const stock = pharmacyStock.find((s) => s.id === input.stock_id && s.tenant_id === tenantId);
    if (!stock || stock.quantity < input.quantity) {
      throw new Error(`Insufficient stock for SKU ${input.stock_id}.`);
    }
    stock.quantity -= input.quantity;
    stock.updated_at = now();
  }
  const row: HmsDispense = {
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    dispense_no: generateDocumentNumber(tenantId, "hms_dispense"),
    prescription_id: input.prescription_id,
    patient_name: rx.patient_name,
    stock_id: input.stock_id ?? null,
    drug_name: input.drug_name,
    quantity: input.quantity,
    dispensed_at: now(),
    dispensed_by: input.actor ?? null
  };
  dispenses.unshift(row);
  rx.status = "dispensed";
  rx.updated_at = now();
  appendPhiAudit(tenantId, {
    actor_email: input.actor ?? null,
    action: "dispense",
    table_name: "hms_dispenses",
    record_id: row.id,
    after_diff: { dispense_no: row.dispense_no, prescription_id: rx.id, ...phiRef(rx.patient_id, row.id) }
  });
  persist(tenantId);
  return row;
}

// ── Insurance claims ──────────────────────────────────────────────────────────

export function listInsuranceClaims(tenantId: UUID) {
  return insuranceClaims
    .filter((c) => c.tenant_id === tenantId && c.is_active !== false)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function createInsuranceClaim(
  tenantId: UUID,
  input: Omit<
    HmsInsuranceClaim,
    "id" | "tenant_id" | "created_at" | "updated_at" | "is_active" | "claim_no" | "eligibility_status" | "claim_status"
  > & { actor?: string }
) {
  const row: HmsInsuranceClaim = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    claim_no: generateDocumentNumber(tenantId, "hms_insurance_claim"),
    eligibility_status: "unchecked",
    claim_status: "draft",
    created_by: input.actor ?? input.created_by ?? null
  };
  insuranceClaims.unshift(row);
  appendPhiAudit(tenantId, {
    actor_email: input.actor ?? null,
    action: "create",
    table_name: "hms_insurance_claims",
    record_id: row.id,
    after_diff: { claim_no: row.claim_no, ...phiRef(row.patient_id, row.id) }
  });
  persist(tenantId);
  return row;
}

export function checkClaimEligibility(tenantId: UUID, claimId: UUID, actor?: string) {
  const claim = insuranceClaims.find((c) => c.id === claimId && c.tenant_id === tenantId);
  if (!claim) return null;
  claim.eligibility_status = "pending";
  claim.x12_stub = { stub: true, checked_at: now(), payer: claim.payer };
  claim.updated_at = now();
  claim.eligibility_status = claim.policy_no ? "eligible" : "ineligible";
  appendPhiAudit(tenantId, {
    actor_email: actor ?? null,
    action: "eligibility_check",
    table_name: "hms_insurance_claims",
    record_id: claimId,
    after_diff: { eligibility_status: claim.eligibility_status, ...phiRef(claim.patient_id, claimId) }
  });
  persist(tenantId);
  return claim;
}

export function updateInsuranceClaim(entityId: UUID, patch: Partial<HmsInsuranceClaim>, actor?: string) {
  const row = insuranceClaims.find((c) => c.id === entityId);
  if (!row) return null;
  Object.assign(row, patch, { updated_at: now() });
  appendPhiAudit(row.tenant_id, {
    actor_email: actor ?? null,
    action: "update",
    table_name: "hms_insurance_claims",
    record_id: entityId,
    after_diff: { claim_status: row.claim_status, ...phiRef(row.patient_id, entityId) }
  });
  queueHmsClinicalRemoteSync(row.tenant_id, true);
  emit();
  return row;
}

// ── Telemedicine ──────────────────────────────────────────────────────────────

export function listTelemedicineSessions(tenantId: UUID) {
  return telemedicineSessions
    .filter((s) => s.tenant_id === tenantId && s.is_active !== false)
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
}

export function createTelemedicineSession(
  tenantId: UUID,
  input: Omit<HmsTelemedicineSession, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active" | "session_no" | "status" | "video_provider"> & {
    video_provider?: string;
  }
) {
  const row: HmsTelemedicineSession = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    session_no: generateDocumentNumber(tenantId, "hms_telemedicine"),
    status: "scheduled",
    video_provider: input.video_provider ?? "baa_compliant_stub"
  };
  telemedicineSessions.unshift(row);
  appendPhiAudit(tenantId, {
    actor_email: null,
    action: "create",
    table_name: "hms_telemedicine_sessions",
    record_id: row.id,
    after_diff: { session_no: row.session_no, ...phiRef(row.patient_id, row.id) }
  });
  persist(tenantId);
  return row;
}

export function updateTelemedicineSession(entityId: UUID, patch: Partial<HmsTelemedicineSession>, actor?: string) {
  const row = telemedicineSessions.find((s) => s.id === entityId);
  if (!row) return null;
  Object.assign(row, patch, { updated_at: now() });
  appendPhiAudit(row.tenant_id, {
    actor_email: actor ?? null,
    action: "update",
    table_name: "hms_telemedicine_sessions",
    record_id: entityId,
    after_diff: { status: row.status, ...phiRef(row.patient_id, entityId) }
  });
  queueHmsClinicalRemoteSync(row.tenant_id, true);
  emit();
  return row;
}

// ── Ambulance & Emergency ─────────────────────────────────────────────────────

export function listAmbulanceDispatches(tenantId: UUID) {
  return ambulanceDispatches
    .filter((d) => d.tenant_id === tenantId && d.is_active !== false)
    .sort((a, b) => b.dispatched_at.localeCompare(a.dispatched_at));
}

export function createAmbulanceDispatch(
  tenantId: UUID,
  input: Omit<HmsAmbulanceDispatch, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active" | "dispatch_no" | "status" | "dispatched_at"> & {
    status?: HmsAmbulanceDispatch["status"];
  }
) {
  const row: HmsAmbulanceDispatch = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    dispatch_no: generateDocumentNumber(tenantId, "hms_ambulance"),
    status: input.status ?? "dispatched",
    dispatched_at: now()
  };
  ambulanceDispatches.unshift(row);
  persist(tenantId);
  return row;
}

export function updateAmbulanceDispatch(entityId: UUID, patch: Partial<HmsAmbulanceDispatch>) {
  const row = ambulanceDispatches.find((d) => d.id === entityId);
  if (!row) return null;
  Object.assign(row, patch, { updated_at: now() });
  queueHmsClinicalRemoteSync(row.tenant_id, true);
  emit();
  return row;
}

export function listEmergencyIntakes(tenantId: UUID) {
  return emergencyIntakes
    .filter((e) => e.tenant_id === tenantId && e.is_active !== false)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function createEmergencyIntake(
  tenantId: UUID,
  input: Omit<HmsEmergencyIntake, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active" | "intake_no"> & {
    actor?: string;
  }
) {
  const row: HmsEmergencyIntake = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    intake_no: generateDocumentNumber(tenantId, "hms_emergency_intake"),
    created_by: input.actor ?? input.created_by ?? null
  };
  emergencyIntakes.unshift(row);
  appendPhiAudit(tenantId, {
    actor_email: input.actor ?? null,
    action: "create",
    table_name: "hms_emergency_intakes",
    record_id: row.id,
    after_diff: { intake_no: row.intake_no, triage_priority: row.triage_priority, ...phiRef(row.patient_id, row.id) }
  });
  persist(tenantId);
  return row;
}

export function updateEmergencyIntake(entityId: UUID, patch: Partial<HmsEmergencyIntake>, actor?: string) {
  const row = emergencyIntakes.find((e) => e.id === entityId);
  if (!row) return null;
  Object.assign(row, patch, { updated_at: now() });
  appendPhiAudit(row.tenant_id, {
    actor_email: actor ?? null,
    action: "update",
    table_name: "hms_emergency_intakes",
    record_id: entityId,
    after_diff: { triage_priority: row.triage_priority, ...phiRef(row.patient_id, entityId) }
  });
  queueHmsClinicalRemoteSync(row.tenant_id, true);
  emit();
  return row;
}

// ── Staff, roster, equipment ──────────────────────────────────────────────────

export function listStaff(tenantId: UUID) {
  return staff.filter((s) => s.tenant_id === tenantId && s.is_active !== false).sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export function createStaff(
  tenantId: UUID,
  input: Omit<HmsStaff, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active" | "staff_no" | "status"> & {
    staff_no?: string;
    status?: string;
  }
) {
  const row: HmsStaff = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    staff_no: input.staff_no ?? generateDocumentNumber(tenantId, "hms_staff"),
    status: input.status ?? "active"
  };
  staff.unshift(row);
  persist(tenantId);
  return row;
}

const staffRef = {
  get: () => staff,
  set: (rows: HmsStaff[]) => {
    staff = rows;
  },
  persist: () => persist(),
  module: "healthcare",
  entityName: "hms_staff",
  labelOf: (r: HmsStaff) => r.full_name
};
bindTrashRestore(staffRef);

export function updateStaff(entityId: UUID, patch: Partial<HmsStaff>) {
  return updateEntityInCollection(staffRef, entityId, patch);
}

export function listDutyRosters(tenantId: UUID, shiftDate?: string) {
  return dutyRosters
    .filter((r) => r.tenant_id === tenantId && r.is_active !== false && (!shiftDate || r.shift_date === shiftDate))
    .sort((a, b) => a.shift_date.localeCompare(b.shift_date));
}

export function createDutyRoster(
  tenantId: UUID,
  input: Omit<HmsDutyRoster, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active" | "status"> & { status?: string }
) {
  const row: HmsDutyRoster = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    status: input.status ?? "scheduled"
  };
  dutyRosters.unshift(row);
  persist(tenantId);
  return row;
}

export function listEquipmentAssets(tenantId: UUID) {
  return equipmentAssets
    .filter((e) => e.tenant_id === tenantId && e.is_active !== false)
    .sort((a, b) => a.asset_tag.localeCompare(b.asset_tag));
}

export function createEquipmentAsset(
  tenantId: UUID,
  input: Omit<HmsEquipmentAsset, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active" | "status"> & { status?: string }
) {
  const row: HmsEquipmentAsset = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    status: input.status ?? "operational"
  };
  equipmentAssets.unshift(row);
  persist(tenantId);
  return row;
}

const equipmentRef = {
  get: () => equipmentAssets,
  set: (rows: HmsEquipmentAsset[]) => {
    equipmentAssets = rows;
  },
  persist: () => persist(),
  module: "healthcare",
  entityName: "hms_equipment_asset",
  labelOf: (r: HmsEquipmentAsset) => r.name
};
bindTrashRestore(equipmentRef);

export function updateEquipmentAsset(entityId: UUID, patch: Partial<HmsEquipmentAsset>) {
  return updateEntityInCollection(equipmentRef, entityId, patch);
}

// ── Notifications & messages ──────────────────────────────────────────────────

export function listNotificationPrefs(tenantId: UUID, patientId?: string) {
  return notificationPrefs.filter(
    (p) => p.tenant_id === tenantId && (!patientId || p.patient_id === patientId)
  );
}

export function upsertNotificationPref(
  tenantId: UUID,
  input: Omit<HmsNotificationPref, "id" | "tenant_id" | "created_at" | "updated_at"> & { id?: UUID }
) {
  const existing = input.patient_id
    ? notificationPrefs.find((p) => p.tenant_id === tenantId && p.patient_id === input.patient_id)
    : null;
  if (existing) {
    Object.assign(existing, input, { updated_at: now() });
    persist(tenantId);
    return existing;
  }
  const row: HmsNotificationPref = {
    ...input,
    id: input.id ?? id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now()
  };
  notificationPrefs.unshift(row);
  if (input.patient_id) {
    appendPhiAudit(tenantId, {
      actor_email: null,
      action: "create",
      table_name: "hms_notification_prefs",
      record_id: row.id,
      after_diff: phiRef(input.patient_id, row.id)
    });
  }
  persist(tenantId);
  return row;
}

export function listNotifications(tenantId: UUID, recipientRef?: string) {
  return notifications
    .filter((n) => n.tenant_id === tenantId && (!recipientRef || n.recipient_ref === recipientRef))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Push/in_app titles must never contain PHI — use body_generic for detail. */
export function createNotification(
  tenantId: UUID,
  input: Omit<HmsNotification, "id" | "tenant_id" | "created_at" | "read_at"> & { read_at?: string | null }
) {
  if (input.channel === "push" && /patient|mrn|diagnosis|prescription|lab/i.test(input.title)) {
    throw new Error("Push notification title must not contain PHI. Use body_generic for details.");
  }
  const row: HmsNotification = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    read_at: input.read_at ?? null
  };
  notifications.unshift(row);
  persist(tenantId);
  return row;
}

export function listMessageThreads(tenantId: UUID) {
  return messageThreads
    .filter((t) => t.tenant_id === tenantId && t.is_active !== false)
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
}

export function createMessageThread(
  tenantId: UUID,
  input: Omit<HmsMessageThread, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active">
) {
  const row: HmsMessageThread = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  messageThreads.unshift(row);
  persist(tenantId);
  return row;
}

export function listMessages(tenantId: UUID, threadId: string) {
  return messages
    .filter((m) => m.tenant_id === tenantId && m.thread_id === threadId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function sendMessage(
  tenantId: UUID,
  input: Omit<HmsMessage, "id" | "tenant_id" | "created_at">
) {
  const thread = messageThreads.find((t) => t.id === input.thread_id && t.tenant_id === tenantId);
  if (!thread) return null;
  const row: HmsMessage = { ...input, id: id(), tenant_id: tenantId, created_at: now() };
  messages.unshift(row);
  thread.updated_at = now();
  persist(tenantId);
  return row;
}

// ── Waitlist & doctor leave ───────────────────────────────────────────────────

export function listWaitlistEntries(tenantId: UUID, status?: HmsWaitlistEntry["status"]) {
  return waitlistEntries
    .filter(
      (w) =>
        w.tenant_id === tenantId &&
        w.is_active !== false &&
        (!status || w.status === status)
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function addWaitlistEntry(
  tenantId: UUID,
  input: Omit<HmsWaitlistEntry, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active" | "status" | "appointment_id">
) {
  const row: HmsWaitlistEntry = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    status: "waiting",
    appointment_id: null,
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  waitlistEntries.unshift(row);
  persist(tenantId);
  return row;
}

export function updateWaitlistEntry(entityId: UUID, patch: Partial<HmsWaitlistEntry>) {
  const updated = updateEntityInCollection(
    {
      get: () => waitlistEntries,
      set: (rows: HmsWaitlistEntry[]) => {
        waitlistEntries = rows;
      },
      persist: () => persist(),
      module: "healthcare",
      entityName: "hms_waitlist",
      labelOf: (r: HmsWaitlistEntry) => r.patient_name
    },
    entityId,
    patch
  );
  if (updated) queueHmsClinicalRemoteSync(updated.tenant_id, true);
  return updated;
}

export function removeWaitlistEntry(entityId: UUID) {
  return updateWaitlistEntry(entityId, { status: "cancelled", is_active: false });
}

export function listDoctorLeaves(tenantId: UUID, doctorName?: string) {
  return doctorLeaves
    .filter(
      (l) =>
        l.tenant_id === tenantId &&
        l.is_active !== false &&
        (!doctorName || l.doctor_name.toLowerCase() === doctorName.toLowerCase())
    )
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
}

export function isDoctorOnLeave(tenantId: UUID, doctorName: string, at: string): HmsDoctorLeave | null {
  const t = new Date(at).getTime();
  if (Number.isNaN(t)) return null;
  const hit = listDoctorLeaves(tenantId, doctorName).find((l) => {
    const start = new Date(l.start_at).getTime();
    const end = new Date(l.end_at).getTime();
    return t >= start && t <= end;
  });
  return hit ?? null;
}

export function createDoctorLeave(
  tenantId: UUID,
  input: Omit<HmsDoctorLeave, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active">
) {
  const row: HmsDoctorLeave = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  doctorLeaves.unshift(row);
  persist(tenantId);
  return row;
}

export function updateDoctorLeave(entityId: UUID, patch: Partial<HmsDoctorLeave>) {
  const updated = updateEntityInCollection(
    {
      get: () => doctorLeaves,
      set: (rows: HmsDoctorLeave[]) => {
        doctorLeaves = rows;
      },
      persist: () => persist(),
      module: "healthcare",
      entityName: "hms_doctor_leave",
      labelOf: (r: HmsDoctorLeave) => `${r.doctor_name} · ${r.start_at}`
    },
    entityId,
    patch
  );
  if (updated) queueHmsClinicalRemoteSync(updated.tenant_id, true);
  return updated;
}

// ── EMR attachments ─────────────────────────────────────────────────────────

export function listEmrAttachments(tenantId: UUID, patientId?: string, clinicalNoteId?: string) {
  return emrAttachments
    .filter(
      (a) =>
        a.tenant_id === tenantId &&
        a.is_active !== false &&
        (!patientId || a.patient_id === patientId) &&
        (!clinicalNoteId || a.clinical_note_id === clinicalNoteId)
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function registerEmrAttachment(
  tenantId: UUID,
  input: Omit<HmsEmrAttachment, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active"> & { actor?: string }
) {
  const row: HmsEmrAttachment = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    uploaded_by: input.actor ?? input.uploaded_by ?? null
  };
  emrAttachments.unshift(row);
  appendPhiAudit(tenantId, {
    actor_email: input.actor ?? null,
    action: "create",
    table_name: "hms_emr_attachments",
    record_id: row.id,
    after_diff: { file_name: row.file_name, ...phiRef(row.patient_id, row.id) }
  });
  persist(tenantId);
  return row;
}

// ── Pharmacy purchase orders ──────────────────────────────────────────────────

export function listPharmacyPos(tenantId: UUID) {
  return pharmacyPos
    .filter((p) => p.tenant_id === tenantId && p.is_active !== false)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((po) => ({
      ...po,
      items: pharmacyPoItems.filter((i) => i.po_id === po.id && i.is_active !== false)
    }));
}

export function createPharmacyPo(
  tenantId: UUID,
  input: {
    supplier_name: string;
    notes?: string | null;
    items: Array<{ drug_name: string; quantity: number; unit_cost: number }>;
    actor?: string;
  }
) {
  const po: HmsPharmacyPurchaseOrder = {
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    po_no: generateDocumentNumber(tenantId, "hms_pharmacy_po"),
    supplier_name: input.supplier_name,
    status: "draft",
    ordered_at: null,
    received_at: null,
    notes: input.notes ?? null,
    created_by: input.actor ?? null
  };
  pharmacyPos.unshift(po);
  for (const item of input.items) {
    pharmacyPoItems.unshift({
      id: id(),
      tenant_id: tenantId,
      po_id: po.id,
      drug_name: item.drug_name,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      created_at: now(),
      is_active: true
    });
  }
  persist(tenantId);
  return { ...po, items: pharmacyPoItems.filter((i) => i.po_id === po.id) };
}

export function receivePharmacyPo(tenantId: UUID, poId: UUID, actor?: string) {
  const po = pharmacyPos.find((p) => p.id === poId && p.tenant_id === tenantId);
  if (!po || po.status === "received" || po.status === "cancelled") return null;
  const items = pharmacyPoItems.filter((i) => i.po_id === poId && i.is_active !== false);
  for (const item of items) {
    const existing = pharmacyStock.find(
      (s) => s.tenant_id === tenantId && s.drug_name === item.drug_name && s.is_active !== false
    );
    if (existing) {
      existing.quantity += item.quantity;
      existing.unit_cost = item.unit_cost;
      existing.updated_at = now();
    } else {
      createPharmacyStock(tenantId, {
        sku: generateDocumentNumber(tenantId, "hms_pharmacy_sku"),
        drug_name: item.drug_name,
        batch_no: `PO-${po.po_no}`,
        expiry_date: today(),
        quantity: item.quantity,
        reorder_level: 10,
        unit_cost: item.unit_cost,
        supplier_name: po.supplier_name
      });
    }
  }
  po.status = "received";
  po.received_at = now();
  po.updated_at = now();
  appendPhiAudit(tenantId, {
    actor_email: actor ?? null,
    action: "receive_po",
    table_name: "hms_pharmacy_purchase_orders",
    record_id: poId,
    after_diff: { po_no: po.po_no, items_count: items.length }
  });
  persist(tenantId);
  return { ...po, items };
}

// ── Branch share consent ──────────────────────────────────────────────────────

export function listBranchShareConsents(tenantId: UUID, patientId?: string) {
  return branchShareConsents
    .filter(
      (c) =>
        c.tenant_id === tenantId &&
        c.is_active !== false &&
        !c.revoked_at &&
        (!patientId || c.patient_id === patientId)
    )
    .sort((a, b) => b.granted_at.localeCompare(a.granted_at));
}

export function grantBranchShareConsent(
  tenantId: UUID,
  input: {
    patient_id: UUID;
    from_branch_id?: UUID | null;
    to_branch_id: UUID;
    consent_version?: string;
    actor?: string;
  }
) {
  const row: HmsBranchShareConsent = {
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    patient_id: input.patient_id,
    from_branch_id: input.from_branch_id ?? null,
    to_branch_id: input.to_branch_id,
    consent_version: input.consent_version ?? "1.0",
    granted_at: now(),
    granted_by: input.actor ?? null,
    revoked_at: null
  };
  branchShareConsents.unshift(row);
  appendPhiAudit(tenantId, {
    actor_email: input.actor ?? null,
    action: "grant_branch_share",
    table_name: "hms_branch_share_consents",
    record_id: row.id,
    after_diff: { patient_id: input.patient_id, to_branch_id: input.to_branch_id }
  });
  persist(tenantId);
  return row;
}

export function revokeBranchShareConsent(tenantId: UUID, consentId: UUID, actor?: string) {
  const row = branchShareConsents.find((c) => c.id === consentId && c.tenant_id === tenantId);
  if (!row) return null;
  row.revoked_at = now();
  row.is_active = false;
  row.updated_at = now();
  appendPhiAudit(tenantId, {
    actor_email: actor ?? null,
    action: "revoke_branch_share",
    table_name: "hms_branch_share_consents",
    record_id: consentId,
    after_diff: { patient_id: row.patient_id, revoked: true }
  });
  persist(tenantId);
  return row;
}

export function canSharePatientAcrossBranches(
  tenantId: UUID,
  patientId: UUID,
  fromBranchId: UUID | null,
  toBranchId: UUID
) {
  return listBranchShareConsents(tenantId, patientId).some(
    (c) =>
      c.to_branch_id === toBranchId &&
      (c.from_branch_id == null || c.from_branch_id === fromBranchId)
  );
}

// ── Reminder queue ────────────────────────────────────────────────────────────

export function listReminderQueue(tenantId: UUID, status?: HmsReminderQueue["status"]) {
  return reminderQueue
    .filter((r) => r.tenant_id === tenantId && (!status || r.status === status))
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
}

export function enqueueReminder(
  tenantId: UUID,
  input: Omit<HmsReminderQueue, "id" | "tenant_id" | "created_at" | "status" | "sent_at"> & {
    scheduled_at?: string;
  }
) {
  const row: HmsReminderQueue = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    scheduled_at: input.scheduled_at ?? now(),
    sent_at: null,
    status: "pending",
    created_at: now(),
    payload_generic: input.payload_generic ?? {}
  };
  reminderQueue.unshift(row);
  persist(tenantId);
  return row;
}

export function markReminderSent(reminderId: UUID, failed = false) {
  const row = reminderQueue.find((r) => r.id === reminderId);
  if (!row) return null;
  row.sent_at = now();
  row.status = failed ? "failed" : "sent";
  queueHmsClinicalRemoteSync(row.tenant_id, true);
  emit();
  return row;
}

// ── Patient merge & guardian ──────────────────────────────────────────────────

function reassignPatientRefs(_tenantId: UUID, fromId: UUID, toId: UUID) {
  for (const rows of [
    admissions,
    vitals,
    mar,
    prescriptions,
    labOrders,
    imagingOrders,
    insuranceClaims,
    telemedicineSessions,
    emergencyIntakes
  ]) {
    for (const r of rows) {
      if (r.patient_id === fromId) {
        r.patient_id = toId;
        r.updated_at = now();
      }
    }
  }
  for (const p of notificationPrefs) {
    if (p.patient_id === fromId) p.patient_id = toId;
  }
}

export function mergePatients(tenantId: UUID, keepId: UUID, absorbId: UUID, actor: string) {
  if (keepId === absorbId) throw new Error("Cannot merge a patient with itself.");
  reassignPatientRefs(tenantId, absorbId, keepId);
  const anonymized = anonymizePatient(absorbId, actor);
  if (!anonymized) throw new Error(`Patient ${absorbId} not found for merge.`);
  appendPhiAudit(tenantId, {
    actor_email: actor,
    action: "merge_patients",
    table_name: "hms_patients",
    record_id: keepId,
    before_diff: { absorb_id: absorbId },
    after_diff: { keep_id: keepId, absorb_anonymized: true }
  });
  persist(tenantId);
  return { keepId, absorbId, anonymized: true };
}

export function linkGuardian(tenantId: UUID, childId: UUID, guardianId: UUID, actor?: string) {
  const updated = updatePatient(childId, { guardian_patient_id: guardianId }, actor);
  if (!updated || updated.tenant_id !== tenantId) {
    throw new Error(`Patient ${childId} not found.`);
  }
  appendPhiAudit(tenantId, {
    actor_email: actor ?? null,
    action: "link_guardian",
    table_name: "hms_patients",
    record_id: childId,
    after_diff: { guardian_patient_id: guardianId, child_id: childId }
  });
  queueHmsClinicalRemoteSync(tenantId, true);
  return updated;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export function getClinicalAnalytics(tenantId: UUID): HmsClinicalAnalytics {
  const activeBeds = listBeds(tenantId).filter((b) => b.status !== "blocked" && b.status !== "maintenance");
  const occupied = activeBeds.filter((b) => b.status === "occupied").length;
  const total = activeBeds.length;
  const revenue_total = listInvoices(tenantId)
    .filter((i) => i.status === "paid" || i.status === "partially_paid")
    .reduce((s, i) => s + i.paid_amount, 0);
  const pending_labs = labOrders.filter(
    (o) => o.tenant_id === tenantId && o.is_active !== false && ["ordered", "collected", "processing"].includes(o.status)
  ).length;
  return {
    occupancy_rate: total ? Math.round((occupied / total) * 1000) / 10 : 0,
    occupied_beds: occupied,
    total_beds: total,
    revenue_total,
    pending_labs,
    low_stock_count: listLowStock(tenantId).length,
    near_expiry_count: listNearExpiry(tenantId).length
  };
}

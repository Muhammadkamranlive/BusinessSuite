import { getSupabaseAdminClient, hasSecretKey } from "@/lib/supabase/server";
import { toDbTenantId, toUiTenantId } from "@/lib/tenants/ids";
import type {
  HmsAdmission,
  HmsAmbulanceDispatch,
  HmsBed,
  HmsBranch,
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

export type HmsClinicalRemoteSnapshot = {
  version: number;
  tenantId?: string;
  branches: HmsBranch[];
  wards: HmsWard[];
  beds: HmsBed[];
  admissions: HmsAdmission[];
  transfers: HmsTransfer[];
  vitals: HmsVital[];
  mar: HmsMar[];
  prescriptions: HmsPrescription[];
  labOrders: HmsLabOrder[];
  labResults: HmsLabResult[];
  imagingOrders: HmsImagingOrder[];
  pharmacyStock: HmsPharmacyStock[];
  dispenses: HmsDispense[];
  insuranceClaims: HmsInsuranceClaim[];
  telemedicineSessions: HmsTelemedicineSession[];
  ambulanceDispatches: HmsAmbulanceDispatch[];
  emergencyIntakes: HmsEmergencyIntake[];
  staff: HmsStaff[];
  dutyRosters: HmsDutyRoster[];
  equipmentAssets: HmsEquipmentAsset[];
  notificationPrefs: HmsNotificationPref[];
  notifications: HmsNotification[];
  messageThreads: HmsMessageThread[];
  messages: HmsMessage[];
  waitlistEntries?: HmsWaitlistEntry[];
  doctorLeaves?: HmsDoctorLeave[];
  emrAttachments?: HmsEmrAttachment[];
  pharmacyPos?: HmsPharmacyPurchaseOrder[];
  pharmacyPoItems?: HmsPharmacyPoItem[];
  branchShareConsents?: HmsBranchShareConsent[];
  reminderQueue?: HmsReminderQueue[];
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

export function isHmsClinicalSupabaseSyncEnabled() {
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

function branchFromDb(row: Record<string, unknown>): HmsBranch {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    code: String(r.code),
    name: String(r.name),
    address: str(r.address),
    phone: str(r.phone)
  };
}

function wardFromDb(row: Record<string, unknown>): HmsWard {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    branch_id: str(r.branch_id),
    code: String(r.code),
    name: String(r.name),
    ward_type: (r.ward_type as HmsWard["ward_type"]) ?? "general"
  };
}

function bedFromDb(row: Record<string, unknown>): HmsBed {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    ward_id: String(r.ward_id),
    bed_no: String(r.bed_no),
    status: (r.status as HmsBed["status"]) ?? "available",
    housekeeping_status: (r.housekeeping_status as HmsBed["housekeeping_status"]) ?? "clean"
  };
}

function admissionFromDb(row: Record<string, unknown>): HmsAdmission {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    admission_no: String(r.admission_no),
    patient_id: str(r.patient_id),
    patient_name: String(r.patient_name),
    encounter_id: str(r.encounter_id),
    ward_id: str(r.ward_id),
    bed_id: str(r.bed_id),
    admitted_at: String(r.admitted_at),
    admission_type: (r.admission_type as HmsAdmission["admission_type"]) ?? "elective",
    attending_doctor: str(r.attending_doctor),
    status: (r.status as HmsAdmission["status"]) ?? "admitted",
    discharge_summary: str(r.discharge_summary),
    discharged_at: str(r.discharged_at),
    mortality: Boolean(r.mortality),
    created_by: str(r.created_by)
  };
}

function transferFromDb(row: Record<string, unknown>): HmsTransfer {
  const r = remap(row, false);
  return {
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    admission_id: String(r.admission_id),
    from_ward_id: str(r.from_ward_id),
    to_ward_id: str(r.to_ward_id),
    from_bed_id: str(r.from_bed_id),
    to_bed_id: str(r.to_bed_id),
    reason: String(r.reason),
    transferred_at: String(r.transferred_at),
    created_by: str(r.created_by),
    created_at: String(r.created_at)
  };
}

function vitalFromDb(row: Record<string, unknown>): HmsVital {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    patient_id: str(r.patient_id),
    encounter_id: str(r.encounter_id),
    admission_id: str(r.admission_id),
    recorded_at: String(r.recorded_at),
    bp_systolic: r.bp_systolic == null ? null : num(r.bp_systolic),
    bp_diastolic: r.bp_diastolic == null ? null : num(r.bp_diastolic),
    temperature_c: r.temperature_c == null ? null : num(r.temperature_c),
    weight_kg: r.weight_kg == null ? null : num(r.weight_kg),
    height_cm: r.height_cm == null ? null : num(r.height_cm),
    spo2: r.spo2 == null ? null : num(r.spo2),
    pulse: r.pulse == null ? null : num(r.pulse),
    recorded_by: str(r.recorded_by)
  };
}

function marFromDb(row: Record<string, unknown>): HmsMar {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    admission_id: str(r.admission_id),
    patient_id: str(r.patient_id),
    drug_name: String(r.drug_name),
    dose: str(r.dose),
    route: str(r.route),
    scheduled_at: String(r.scheduled_at),
    given_at: str(r.given_at),
    status: (r.status as HmsMar["status"]) ?? "scheduled",
    given_by: str(r.given_by),
    notes: str(r.notes)
  };
}

function prescriptionFromDb(row: Record<string, unknown>): HmsPrescription {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    rx_no: String(r.rx_no),
    patient_id: str(r.patient_id),
    patient_name: String(r.patient_name),
    encounter_id: str(r.encounter_id),
    prescriber_name: String(r.prescriber_name),
    status: (r.status as HmsPrescription["status"]) ?? "draft",
    supersedes_rx_id: str(r.supersedes_rx_id),
    route_to: (r.route_to as HmsPrescription["route_to"]) ?? "hospital_pharmacy",
    allergy_checked: Boolean(r.allergy_checked),
    issued_at: str(r.issued_at),
    items: Array.isArray(r.items) ? (r.items as HmsPrescription["items"]) : [],
    created_by: str(r.created_by)
  };
}

function labOrderFromDb(row: Record<string, unknown>): HmsLabOrder {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    order_no: String(r.order_no),
    patient_id: str(r.patient_id),
    patient_name: String(r.patient_name),
    encounter_id: str(r.encounter_id),
    ordering_physician: str(r.ordering_physician),
    sample_barcode: str(r.sample_barcode),
    barcode_printed_at: str(r.barcode_printed_at),
    collected_at: str(r.collected_at),
    tests: Array.isArray(r.tests) ? (r.tests as HmsLabOrder["tests"]) : [],
    status: (r.status as HmsLabOrder["status"]) ?? "ordered",
    hl7_stub: (r.hl7_stub as Record<string, unknown>) ?? null,
    critical_alerted: Boolean(r.critical_alerted),
    created_by: str(r.created_by)
  };
}

function labResultFromDb(row: Record<string, unknown>): HmsLabResult {
  const r = remap(row, false);
  return {
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    lab_order_id: String(r.lab_order_id),
    test_name: String(r.test_name),
    result_value: str(r.result_value),
    unit: str(r.unit),
    reference_range: str(r.reference_range),
    flag: (r.flag as HmsLabResult["flag"]) ?? null,
    resulted_at: String(r.resulted_at),
    resulted_by: str(r.resulted_by),
    created_at: String(r.created_at)
  };
}

function imagingOrderFromDb(row: Record<string, unknown>): HmsImagingOrder {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    order_no: String(r.order_no),
    patient_id: str(r.patient_id),
    patient_name: String(r.patient_name),
    encounter_id: str(r.encounter_id),
    modality: (r.modality as HmsImagingOrder["modality"]) ?? "other",
    body_part: str(r.body_part),
    clinical_indication: str(r.clinical_indication),
    status: (r.status as HmsImagingOrder["status"]) ?? "ordered",
    dicom_ref: str(r.dicom_ref),
    pacs_viewer_url: str(r.pacs_viewer_url),
    report_text: str(r.report_text),
    radiologist_name: str(r.radiologist_name),
    signed_at: str(r.signed_at),
    created_by: str(r.created_by)
  };
}

function pharmacyStockFromDb(row: Record<string, unknown>): HmsPharmacyStock {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    sku: String(r.sku),
    drug_name: String(r.drug_name),
    batch_no: String(r.batch_no),
    expiry_date: String(r.expiry_date).slice(0, 10),
    quantity: num(r.quantity),
    reorder_level: num(r.reorder_level, 10),
    unit_cost: num(r.unit_cost),
    supplier_name: str(r.supplier_name)
  };
}

function dispenseFromDb(row: Record<string, unknown>): HmsDispense {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    dispense_no: String(r.dispense_no),
    prescription_id: str(r.prescription_id),
    patient_name: String(r.patient_name),
    stock_id: str(r.stock_id),
    drug_name: String(r.drug_name),
    quantity: num(r.quantity),
    dispensed_at: String(r.dispensed_at),
    dispensed_by: str(r.dispensed_by)
  };
}

function insuranceClaimFromDb(row: Record<string, unknown>): HmsInsuranceClaim {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    claim_no: String(r.claim_no),
    patient_id: str(r.patient_id),
    patient_name: String(r.patient_name),
    invoice_id: str(r.invoice_id),
    payer: String(r.payer),
    policy_no: str(r.policy_no),
    eligibility_status: (r.eligibility_status as HmsInsuranceClaim["eligibility_status"]) ?? "unchecked",
    claim_status: (r.claim_status as HmsInsuranceClaim["claim_status"]) ?? "draft",
    amount: num(r.amount),
    x12_stub: (r.x12_stub as Record<string, unknown>) ?? null,
    created_by: str(r.created_by)
  };
}

function telemedicineFromDb(row: Record<string, unknown>): HmsTelemedicineSession {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    session_no: String(r.session_no),
    patient_id: str(r.patient_id),
    patient_name: String(r.patient_name),
    doctor_name: String(r.doctor_name),
    scheduled_at: String(r.scheduled_at),
    status: (r.status as HmsTelemedicineSession["status"]) ?? "scheduled",
    video_provider: String(r.video_provider ?? "baa_compliant_stub"),
    join_token: str(r.join_token),
    encounter_id: str(r.encounter_id),
    notes: str(r.notes)
  };
}

function ambulanceFromDb(row: Record<string, unknown>): HmsAmbulanceDispatch {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    dispatch_no: String(r.dispatch_no),
    patient_name: str(r.patient_name),
    pickup_location: str(r.pickup_location),
    destination: str(r.destination),
    status: (r.status as HmsAmbulanceDispatch["status"]) ?? "dispatched",
    gps_lat: r.gps_lat == null ? null : num(r.gps_lat),
    gps_lng: r.gps_lng == null ? null : num(r.gps_lng),
    vehicle_id: str(r.vehicle_id),
    dispatched_at: String(r.dispatched_at)
  };
}

function emergencyIntakeFromDb(row: Record<string, unknown>): HmsEmergencyIntake {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    intake_no: String(r.intake_no),
    patient_id: str(r.patient_id),
    patient_name: String(r.patient_name),
    triage_priority: (r.triage_priority as HmsEmergencyIntake["triage_priority"]) ?? "urgent",
    chief_complaint: str(r.chief_complaint),
    incomplete_registration: Boolean(r.incomplete_registration),
    encounter_id: str(r.encounter_id),
    created_by: str(r.created_by)
  };
}

function staffFromDb(row: Record<string, unknown>): HmsStaff {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    staff_no: String(r.staff_no),
    full_name: String(r.full_name),
    email: str(r.email),
    role_title: str(r.role_title),
    license_no: str(r.license_no),
    license_expiry: str(r.license_expiry)?.slice(0, 10) ?? null,
    department: str(r.department),
    status: String(r.status ?? "active")
  };
}

function dutyRosterFromDb(row: Record<string, unknown>): HmsDutyRoster {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    staff_id: str(r.staff_id),
    staff_name: String(r.staff_name),
    shift_date: String(r.shift_date).slice(0, 10),
    shift_type: (r.shift_type as HmsDutyRoster["shift_type"]) ?? "day",
    ward_name: str(r.ward_name),
    status: String(r.status ?? "scheduled")
  };
}

function equipmentFromDb(row: Record<string, unknown>): HmsEquipmentAsset {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    asset_tag: String(r.asset_tag),
    name: String(r.name),
    category: str(r.category),
    location: str(r.location),
    next_maintenance: str(r.next_maintenance)?.slice(0, 10) ?? null,
    status: String(r.status ?? "operational")
  };
}

function notificationPrefFromDb(row: Record<string, unknown>): HmsNotificationPref {
  const r = remap(row, false);
  return {
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    patient_id: str(r.patient_id),
    email_enabled: r.email_enabled !== false,
    sms_enabled: Boolean(r.sms_enabled),
    push_enabled: r.push_enabled !== false,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at ?? r.created_at)
  };
}

function notificationFromDb(row: Record<string, unknown>): HmsNotification {
  const r = remap(row, false);
  return {
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    recipient_ref: String(r.recipient_ref),
    channel: (r.channel as HmsNotification["channel"]) ?? "in_app",
    title: String(r.title),
    body_generic: String(r.body_generic),
    kind: String(r.kind ?? "general"),
    read_at: str(r.read_at),
    created_at: String(r.created_at)
  };
}

function messageThreadFromDb(row: Record<string, unknown>): HmsMessageThread {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    subject: String(r.subject),
    participant_emails: Array.isArray(r.participant_emails) ? (r.participant_emails as string[]) : []
  };
}

function messageFromDb(row: Record<string, unknown>): HmsMessage {
  const r = remap(row, false);
  return {
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    thread_id: String(r.thread_id),
    sender_email: String(r.sender_email),
    body: String(r.body),
    created_at: String(r.created_at)
  };
}

function waitlistFromDb(row: Record<string, unknown>): HmsWaitlistEntry {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    patient_id: String(r.patient_id),
    patient_name: String(r.patient_name),
    doctor_name: str(r.doctor_name),
    department: str(r.department),
    preferred_date: str(r.preferred_date)?.slice(0, 10) ?? null,
    status: (r.status as HmsWaitlistEntry["status"]) ?? "waiting",
    notes: null,
    appointment_id: null,
    created_by: null
  };
}

function doctorLeaveFromDb(row: Record<string, unknown>): HmsDoctorLeave {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    doctor_name: String(r.doctor_name),
    department: null,
    start_at: String(r.starts_at ?? r.start_at),
    end_at: String(r.ends_at ?? r.end_at),
    reason: str(r.reason),
    created_by: null
  };
}

function emrAttachmentFromDb(row: Record<string, unknown>): HmsEmrAttachment {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    patient_id: str(r.patient_id),
    encounter_id: str(r.encounter_id),
    clinical_note_id: str(r.clinical_note_id),
    file_name: String(r.file_name),
    storage_path: String(r.storage_path),
    content_type: String(r.content_type ?? "application/octet-stream"),
    file_size: num(r.file_size),
    uploaded_by: str(r.uploaded_by)
  };
}

function pharmacyPoFromDb(row: Record<string, unknown>): HmsPharmacyPurchaseOrder {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    po_no: String(r.po_no),
    supplier_name: String(r.supplier_name),
    status: (r.status as HmsPharmacyPurchaseOrder["status"]) ?? "draft",
    ordered_at: str(r.ordered_at),
    received_at: str(r.received_at),
    notes: str(r.notes),
    created_by: str(r.created_by)
  };
}

function pharmacyPoItemFromDb(row: Record<string, unknown>): HmsPharmacyPoItem {
  const r = remap(row, false);
  return {
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    po_id: String(r.po_id),
    drug_name: String(r.drug_name),
    quantity: num(r.quantity),
    unit_cost: num(r.unit_cost),
    created_at: String(r.created_at),
    is_active: r.is_active !== false
  };
}

function branchShareFromDb(row: Record<string, unknown>): HmsBranchShareConsent {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    patient_id: String(r.patient_id),
    from_branch_id: str(r.from_branch_id),
    to_branch_id: String(r.to_branch_id),
    consent_version: String(r.consent_version ?? "1.0"),
    granted_at: String(r.granted_at),
    granted_by: str(r.granted_by),
    revoked_at: str(r.revoked_at)
  };
}

function reminderFromDb(row: Record<string, unknown>): HmsReminderQueue {
  const r = remap(row, false);
  return {
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    channel: (r.channel as HmsReminderQueue["channel"]) ?? "in_app",
    template_key: String(r.template_key),
    recipient_email: str(r.recipient_email),
    recipient_phone: str(r.recipient_phone),
    payload_generic: (r.payload_generic as Record<string, unknown>) ?? {},
    scheduled_at: String(r.scheduled_at),
    sent_at: str(r.sent_at),
    status: (r.status as HmsReminderQueue["status"]) ?? "pending",
    created_at: String(r.created_at)
  };
}

function waitlistToDb(row: HmsWaitlistEntry) {
  return toDb({
    ...row,
    priority: 5
  } as unknown as Record<string, unknown>);
}

function doctorLeaveToDb(row: HmsDoctorLeave) {
  const { start_at, end_at, department, created_by, appointment_id, notes, ...rest } = row as HmsDoctorLeave & {
    appointment_id?: string;
    notes?: string;
  };
  return toDb({
    ...rest,
    starts_at: start_at,
    ends_at: end_at,
    staff_id: null
  } as unknown as Record<string, unknown>);
}

function toDb<T extends Record<string, unknown>>(row: T) {
  return remap(row, true);
}

export async function pushHmsClinicalSnapshot(snapshot: HmsClinicalRemoteSnapshot) {
  if (!isHmsClinicalSupabaseSyncEnabled()) {
    return { ok: false as const, reason: "Supabase secret missing or HMS sync disabled" };
  }
  const admin = getSupabaseAdminClient();
  const errors: string[] = [];

  await upsert(admin, "hms_branches", snapshot.branches.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_wards", snapshot.wards.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_beds", snapshot.beds.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_admissions", snapshot.admissions.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_transfers", snapshot.transfers.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_vitals", snapshot.vitals.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_mar", snapshot.mar.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_prescriptions", snapshot.prescriptions.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_lab_orders", snapshot.labOrders.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_lab_results", snapshot.labResults.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_imaging_orders", snapshot.imagingOrders.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_pharmacy_stock", snapshot.pharmacyStock.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_dispenses", snapshot.dispenses.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_insurance_claims", snapshot.insuranceClaims.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_telemedicine_sessions", snapshot.telemedicineSessions.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_ambulance_dispatches", snapshot.ambulanceDispatches.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_emergency_intakes", snapshot.emergencyIntakes.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_staff", snapshot.staff.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_duty_rosters", snapshot.dutyRosters.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_equipment_assets", snapshot.equipmentAssets.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_notification_prefs", snapshot.notificationPrefs.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_notifications", snapshot.notifications.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_message_threads", snapshot.messageThreads.map((r) => toDb({ ...r })), errors);
  await upsert(admin, "hms_messages", snapshot.messages.map((r) => toDb({ ...r })), errors);
  await upsert(
    admin,
    "hms_appointment_waitlist",
    (snapshot.waitlistEntries ?? []).map((r) => waitlistToDb(r)),
    errors
  );
  await upsert(
    admin,
    "hms_doctor_leave",
    (snapshot.doctorLeaves ?? []).map((r) => doctorLeaveToDb(r)),
    errors
  );
  await upsert(admin, "hms_emr_attachments", (snapshot.emrAttachments ?? []).map((r) => toDb({ ...r })), errors);
  await upsert(
    admin,
    "hms_pharmacy_purchase_orders",
    (snapshot.pharmacyPos ?? []).map((r) => toDb({ ...r })),
    errors
  );
  await upsert(
    admin,
    "hms_pharmacy_po_items",
    (snapshot.pharmacyPoItems ?? []).map((r) => toDb({ ...r })),
    errors
  );
  await upsert(
    admin,
    "hms_branch_share_consents",
    (snapshot.branchShareConsents ?? []).map((r) => toDb({ ...r })),
    errors
  );
  await upsert(admin, "hms_reminder_queue", (snapshot.reminderQueue ?? []).map((r) => toDb({ ...r })), errors);

  return { ok: errors.length === 0, errors };
}

export async function pullHmsClinicalSnapshot(uiTenantId?: string) {
  if (!isHmsClinicalSupabaseSyncEnabled()) {
    return { ok: false as const, reason: "Supabase secret missing or HMS sync disabled" };
  }
  const admin = getSupabaseAdminClient();
  const dbTenant = uiTenantId ? toDbTenantId(uiTenantId) : null;
  const errors: string[] = [];

  const tables = [
    "hms_branches",
    "hms_wards",
    "hms_beds",
    "hms_admissions",
    "hms_transfers",
    "hms_vitals",
    "hms_mar",
    "hms_prescriptions",
    "hms_lab_orders",
    "hms_lab_results",
    "hms_imaging_orders",
    "hms_pharmacy_stock",
    "hms_dispenses",
    "hms_insurance_claims",
    "hms_telemedicine_sessions",
    "hms_ambulance_dispatches",
    "hms_emergency_intakes",
    "hms_staff",
    "hms_duty_rosters",
    "hms_equipment_assets",
    "hms_notification_prefs",
    "hms_notifications",
    "hms_message_threads",
    "hms_messages",
    "hms_appointment_waitlist",
    "hms_doctor_leave",
    "hms_emr_attachments",
    "hms_pharmacy_purchase_orders",
    "hms_pharmacy_po_items",
    "hms_branch_share_consents",
    "hms_reminder_queue"
  ] as const;

  const results: Record<string, unknown[]> = {};
  await Promise.all(
    tables.map(async (table) => {
      let q = admin.from(table).select("*");
      if (dbTenant) q = q.eq("tenant_id", dbTenant);
      const { data, error } = await q;
      if (error) errors.push(`${table}: ${error.message}`);
      results[table] = data ?? [];
    })
  );

  const snapshot: HmsClinicalRemoteSnapshot = {
    version: 1,
    tenantId: uiTenantId,
    branches: (results.hms_branches as Record<string, unknown>[]).map(branchFromDb),
    wards: (results.hms_wards as Record<string, unknown>[]).map(wardFromDb),
    beds: (results.hms_beds as Record<string, unknown>[]).map(bedFromDb),
    admissions: (results.hms_admissions as Record<string, unknown>[]).map(admissionFromDb),
    transfers: (results.hms_transfers as Record<string, unknown>[]).map(transferFromDb),
    vitals: (results.hms_vitals as Record<string, unknown>[]).map(vitalFromDb),
    mar: (results.hms_mar as Record<string, unknown>[]).map(marFromDb),
    prescriptions: (results.hms_prescriptions as Record<string, unknown>[]).map(prescriptionFromDb),
    labOrders: (results.hms_lab_orders as Record<string, unknown>[]).map(labOrderFromDb),
    labResults: (results.hms_lab_results as Record<string, unknown>[]).map(labResultFromDb),
    imagingOrders: (results.hms_imaging_orders as Record<string, unknown>[]).map(imagingOrderFromDb),
    pharmacyStock: (results.hms_pharmacy_stock as Record<string, unknown>[]).map(pharmacyStockFromDb),
    dispenses: (results.hms_dispenses as Record<string, unknown>[]).map(dispenseFromDb),
    insuranceClaims: (results.hms_insurance_claims as Record<string, unknown>[]).map(insuranceClaimFromDb),
    telemedicineSessions: (results.hms_telemedicine_sessions as Record<string, unknown>[]).map(telemedicineFromDb),
    ambulanceDispatches: (results.hms_ambulance_dispatches as Record<string, unknown>[]).map(ambulanceFromDb),
    emergencyIntakes: (results.hms_emergency_intakes as Record<string, unknown>[]).map(emergencyIntakeFromDb),
    staff: (results.hms_staff as Record<string, unknown>[]).map(staffFromDb),
    dutyRosters: (results.hms_duty_rosters as Record<string, unknown>[]).map(dutyRosterFromDb),
    equipmentAssets: (results.hms_equipment_assets as Record<string, unknown>[]).map(equipmentFromDb),
    notificationPrefs: (results.hms_notification_prefs as Record<string, unknown>[]).map(notificationPrefFromDb),
    notifications: (results.hms_notifications as Record<string, unknown>[]).map(notificationFromDb),
    messageThreads: (results.hms_message_threads as Record<string, unknown>[]).map(messageThreadFromDb),
    messages: (results.hms_messages as Record<string, unknown>[]).map(messageFromDb),
    waitlistEntries: (results.hms_appointment_waitlist as Record<string, unknown>[]).map(waitlistFromDb),
    doctorLeaves: (results.hms_doctor_leave as Record<string, unknown>[]).map(doctorLeaveFromDb),
    emrAttachments: (results.hms_emr_attachments as Record<string, unknown>[]).map(emrAttachmentFromDb),
    pharmacyPos: (results.hms_pharmacy_purchase_orders as Record<string, unknown>[]).map(pharmacyPoFromDb),
    pharmacyPoItems: (results.hms_pharmacy_po_items as Record<string, unknown>[]).map(pharmacyPoItemFromDb),
    branchShareConsents: (results.hms_branch_share_consents as Record<string, unknown>[]).map(branchShareFromDb),
    reminderQueue: (results.hms_reminder_queue as Record<string, unknown>[]).map(reminderFromDb)
  };

  return { ok: errors.length === 0 || snapshot.wards.length > 0 || true, snapshot, errors: errors.length ? errors : undefined };
}

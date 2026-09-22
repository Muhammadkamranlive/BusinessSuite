import type { TenantEntity, UUID } from "@/modules/core/types";

export type HmsBranch = TenantEntity & {
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
};

export type HmsWardType = "general" | "icu" | "private" | "maternity" | "pediatric" | "isolation";

export type HmsWard = TenantEntity & {
  branch_id?: UUID | null;
  code: string;
  name: string;
  ward_type: HmsWardType;
};

export type HmsBedStatus = "available" | "occupied" | "housekeeping" | "maintenance" | "blocked";
export type HmsHousekeepingStatus = "clean" | "dirty" | "in_progress";

export type HmsBed = TenantEntity & {
  ward_id: UUID;
  bed_no: string;
  status: HmsBedStatus;
  housekeeping_status: HmsHousekeepingStatus;
};

export type HmsAdmissionType = "elective" | "emergency" | "transfer_in" | "opd_referral";
export type HmsAdmissionStatus = "admitted" | "transferred" | "discharged" | "deceased" | "absconded";

export type HmsAdmission = TenantEntity & {
  admission_no: string;
  patient_id?: UUID | null;
  patient_name: string;
  encounter_id?: UUID | null;
  ward_id?: UUID | null;
  bed_id?: UUID | null;
  admitted_at: string;
  admission_type: HmsAdmissionType;
  attending_doctor?: string | null;
  status: HmsAdmissionStatus;
  discharge_summary?: string | null;
  discharged_at?: string | null;
  mortality: boolean;
  created_by?: string | null;
};

export type HmsTransfer = {
  id: UUID;
  tenant_id: UUID;
  admission_id: UUID;
  from_ward_id?: UUID | null;
  to_ward_id?: UUID | null;
  from_bed_id?: UUID | null;
  to_bed_id?: UUID | null;
  reason: string;
  transferred_at: string;
  created_by?: string | null;
  created_at: string;
};

export type HmsVital = TenantEntity & {
  patient_id?: UUID | null;
  encounter_id?: UUID | null;
  admission_id?: UUID | null;
  recorded_at: string;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  temperature_c?: number | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  spo2?: number | null;
  pulse?: number | null;
  recorded_by?: string | null;
};

export type HmsMarStatus = "scheduled" | "given" | "missed" | "held" | "refused";

export type HmsMar = TenantEntity & {
  admission_id?: UUID | null;
  patient_id?: UUID | null;
  drug_name: string;
  dose?: string | null;
  route?: string | null;
  scheduled_at: string;
  given_at?: string | null;
  status: HmsMarStatus;
  given_by?: string | null;
  notes?: string | null;
};

export type HmsPrescriptionItem = {
  drug_name: string;
  dose?: string | null;
  frequency?: string | null;
  route?: string | null;
  duration_days?: number | null;
  quantity?: number | null;
  instructions?: string | null;
};

export type HmsPrescriptionStatus = "draft" | "issued" | "dispensed" | "cancelled" | "superseded";
export type HmsPrescriptionRoute = "hospital_pharmacy" | "external" | "print";

export type HmsPrescription = TenantEntity & {
  rx_no: string;
  patient_id?: UUID | null;
  patient_name: string;
  encounter_id?: UUID | null;
  prescriber_name: string;
  status: HmsPrescriptionStatus;
  supersedes_rx_id?: UUID | null;
  route_to: HmsPrescriptionRoute;
  allergy_checked: boolean;
  issued_at?: string | null;
  items: HmsPrescriptionItem[];
  created_by?: string | null;
};

export type HmsLabTest = {
  code?: string | null;
  name: string;
  specimen?: string | null;
};

export type HmsLabOrderStatus = "ordered" | "collected" | "processing" | "resulted" | "critical" | "cancelled";

export type HmsLabOrder = TenantEntity & {
  order_no: string;
  patient_id?: UUID | null;
  patient_name: string;
  encounter_id?: UUID | null;
  ordering_physician?: string | null;
  sample_barcode?: string | null;
  barcode_printed_at?: string | null;
  collected_at?: string | null;
  tests: HmsLabTest[];
  status: HmsLabOrderStatus;
  hl7_stub?: Record<string, unknown> | null;
  critical_alerted: boolean;
  created_by?: string | null;
};

export type HmsLabResultFlag = "normal" | "high" | "low" | "critical";

export type HmsLabResult = {
  id: UUID;
  tenant_id: UUID;
  lab_order_id: UUID;
  test_name: string;
  result_value?: string | null;
  unit?: string | null;
  reference_range?: string | null;
  flag?: HmsLabResultFlag | null;
  resulted_at: string;
  resulted_by?: string | null;
  created_at: string;
};

export type HmsImagingModality = "xray" | "ct" | "mri" | "ultrasound" | "other";
export type HmsImagingStatus = "ordered" | "scheduled" | "in_progress" | "reported" | "signed_off" | "cancelled";

export type HmsImagingOrder = TenantEntity & {
  order_no: string;
  patient_id?: UUID | null;
  patient_name: string;
  encounter_id?: UUID | null;
  modality: HmsImagingModality;
  body_part?: string | null;
  clinical_indication?: string | null;
  status: HmsImagingStatus;
  dicom_ref?: string | null;
  pacs_viewer_url?: string | null;
  report_text?: string | null;
  radiologist_name?: string | null;
  signed_at?: string | null;
  created_by?: string | null;
};

export type HmsPharmacyStock = TenantEntity & {
  sku: string;
  drug_name: string;
  batch_no: string;
  expiry_date: string;
  quantity: number;
  reorder_level: number;
  unit_cost: number;
  supplier_name?: string | null;
};

export type HmsDispense = TenantEntity & {
  dispense_no: string;
  prescription_id?: UUID | null;
  patient_name: string;
  stock_id?: UUID | null;
  drug_name: string;
  quantity: number;
  dispensed_at: string;
  dispensed_by?: string | null;
};

export type HmsEligibilityStatus = "unchecked" | "eligible" | "ineligible" | "pending";
export type HmsClaimStatus = "draft" | "ready" | "submitted" | "paid" | "denied" | "appealed";

export type HmsInsuranceClaim = TenantEntity & {
  claim_no: string;
  patient_id?: UUID | null;
  patient_name: string;
  invoice_id?: UUID | null;
  payer: string;
  policy_no?: string | null;
  eligibility_status: HmsEligibilityStatus;
  claim_status: HmsClaimStatus;
  amount: number;
  x12_stub?: Record<string, unknown> | null;
  created_by?: string | null;
};

export type HmsTelemedicineStatus = "scheduled" | "in_session" | "completed" | "cancelled" | "no_show";

export type HmsTelemedicineSession = TenantEntity & {
  session_no: string;
  patient_id?: UUID | null;
  patient_name: string;
  doctor_name: string;
  scheduled_at: string;
  status: HmsTelemedicineStatus;
  video_provider: string;
  join_token?: string | null;
  encounter_id?: UUID | null;
  notes?: string | null;
};

export type HmsAmbulanceStatus =
  | "requested"
  | "dispatched"
  | "en_route"
  | "on_scene"
  | "transporting"
  | "completed"
  | "cancelled";

export type HmsAmbulanceDispatch = TenantEntity & {
  dispatch_no: string;
  patient_name?: string | null;
  pickup_location?: string | null;
  destination?: string | null;
  status: HmsAmbulanceStatus;
  gps_lat?: number | null;
  gps_lng?: number | null;
  vehicle_id?: string | null;
  dispatched_at: string;
};

export type HmsTriagePriority = "resuscitation" | "emergency" | "urgent" | "semi_urgent" | "non_urgent";

export type HmsEmergencyIntake = TenantEntity & {
  intake_no: string;
  patient_id?: UUID | null;
  patient_name: string;
  triage_priority: HmsTriagePriority;
  chief_complaint?: string | null;
  incomplete_registration: boolean;
  encounter_id?: UUID | null;
  created_by?: string | null;
};

export type HmsStaff = TenantEntity & {
  staff_no: string;
  full_name: string;
  email?: string | null;
  role_title?: string | null;
  license_no?: string | null;
  license_expiry?: string | null;
  department?: string | null;
  status: string;
};

export type HmsShiftType = "day" | "evening" | "night";

export type HmsDutyRoster = TenantEntity & {
  staff_id?: UUID | null;
  staff_name: string;
  shift_date: string;
  shift_type: HmsShiftType;
  ward_name?: string | null;
  status: string;
};

export type HmsEquipmentAsset = TenantEntity & {
  asset_tag: string;
  name: string;
  category?: string | null;
  location?: string | null;
  next_maintenance?: string | null;
  status: string;
};

export type HmsNotificationPref = {
  id: UUID;
  tenant_id: UUID;
  patient_id?: UUID | null;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type HmsNotificationChannel = "in_app" | "email" | "sms" | "push";

export type HmsNotification = {
  id: UUID;
  tenant_id: UUID;
  recipient_ref: string;
  channel: HmsNotificationChannel;
  title: string;
  body_generic: string;
  kind: string;
  read_at?: string | null;
  created_at: string;
};

export type HmsMessageThread = TenantEntity & {
  subject: string;
  participant_emails: string[];
};

export type HmsMessage = {
  id: UUID;
  tenant_id: UUID;
  thread_id: UUID;
  sender_email: string;
  body: string;
  created_at: string;
};

export type HmsClinicalAnalytics = {
  occupancy_rate: number;
  occupied_beds: number;
  total_beds: number;
  revenue_total: number;
  pending_labs: number;
  low_stock_count: number;
  near_expiry_count: number;
};

export type HmsEmrAttachment = TenantEntity & {
  patient_id?: UUID | null;
  encounter_id?: UUID | null;
  clinical_note_id?: UUID | null;
  file_name: string;
  storage_path: string;
  content_type: string;
  file_size: number;
  uploaded_by?: string | null;
};

export type HmsPharmacyPoStatus = "draft" | "ordered" | "received" | "cancelled";

export type HmsPharmacyPoItem = {
  id: UUID;
  tenant_id: UUID;
  po_id: UUID;
  drug_name: string;
  quantity: number;
  unit_cost: number;
  created_at: string;
  is_active: boolean;
};

export type HmsPharmacyPurchaseOrder = TenantEntity & {
  po_no: string;
  supplier_name: string;
  status: HmsPharmacyPoStatus;
  ordered_at?: string | null;
  received_at?: string | null;
  notes?: string | null;
  created_by?: string | null;
  items?: HmsPharmacyPoItem[];
};

export type HmsBranchShareConsent = TenantEntity & {
  patient_id: UUID;
  from_branch_id?: UUID | null;
  to_branch_id: UUID;
  consent_version: string;
  granted_at: string;
  granted_by?: string | null;
  revoked_at?: string | null;
};

export type HmsReminderChannel = "in_app" | "email" | "sms" | "push";
export type HmsReminderStatus = "pending" | "sent" | "failed";

export type HmsReminderQueue = {
  id: UUID;
  tenant_id: UUID;
  channel: HmsReminderChannel;
  template_key: string;
  recipient_email?: string | null;
  recipient_phone?: string | null;
  payload_generic: Record<string, unknown>;
  scheduled_at: string;
  sent_at?: string | null;
  status: HmsReminderStatus;
  created_at: string;
};

/** Appointment waitlist — filled when a slot opens. */
export type HmsWaitlistEntry = TenantEntity & {
  patient_id: UUID;
  patient_name: string;
  doctor_name?: string | null;
  department?: string | null;
  preferred_date?: string | null;
  status: "waiting" | "offered" | "booked" | "cancelled";
  notes?: string | null;
  appointment_id?: UUID | null;
  created_by?: string | null;
};

/** Doctor leave / unavailability ranges. */
export type HmsDoctorLeave = TenantEntity & {
  doctor_name: string;
  department?: string | null;
  start_at: string;
  end_at: string;
  reason?: string | null;
  created_by?: string | null;
};

-- =============================================================================
-- Healthcare HMS Phases 2–4 — clinical depth, financial, scale
-- Spec: AGENT_SPEC_Hospital_Management_System.md
-- Compliance: RLS on all PHI tables; append-only audit via hms_phi_audit_logs
-- =============================================================================

-- Branches (multi-branch isolation)
create table if not exists public.hms_branches (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  address text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

-- Wards & beds
create table if not exists public.hms_wards (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid,
  code text not null,
  name text not null,
  ward_type text not null default 'general' check (ward_type in ('general', 'icu', 'private', 'maternity', 'pediatric', 'isolation')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, code)
);

create table if not exists public.hms_beds (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  ward_id uuid not null references public.hms_wards(id) on delete cascade,
  bed_no text not null,
  status text not null default 'available'
    check (status in ('available', 'occupied', 'housekeeping', 'maintenance', 'blocked')),
  housekeeping_status text not null default 'clean'
    check (housekeeping_status in ('clean', 'dirty', 'in_progress')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, ward_id, bed_no)
);

-- IPD admissions / transfers / discharges
create table if not exists public.hms_admissions (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  admission_no text not null,
  patient_id uuid,
  patient_name text not null,
  encounter_id uuid,
  ward_id uuid,
  bed_id uuid,
  admitted_at timestamptz not null,
  admission_type text not null default 'elective'
    check (admission_type in ('elective', 'emergency', 'transfer_in', 'opd_referral')),
  attending_doctor text,
  status text not null default 'admitted'
    check (status in ('admitted', 'transferred', 'discharged', 'deceased', 'absconded')),
  discharge_summary text,
  discharged_at timestamptz,
  mortality boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  is_active boolean not null default true,
  unique (tenant_id, admission_no)
);

create table if not exists public.hms_transfers (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  admission_id uuid not null references public.hms_admissions(id) on delete cascade,
  from_ward_id uuid,
  to_ward_id uuid,
  from_bed_id uuid,
  to_bed_id uuid,
  reason text not null,
  transferred_at timestamptz not null default now(),
  created_by text,
  created_at timestamptz not null default now()
);

-- Vitals & MAR
create table if not exists public.hms_vitals (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid,
  encounter_id uuid,
  admission_id uuid,
  recorded_at timestamptz not null default now(),
  bp_systolic integer,
  bp_diastolic integer,
  temperature_c numeric,
  weight_kg numeric,
  height_cm numeric,
  spo2 integer,
  pulse integer,
  recorded_by text,
  created_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists public.hms_mar (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  admission_id uuid,
  patient_id uuid,
  drug_name text not null,
  dose text,
  route text,
  scheduled_at timestamptz not null,
  given_at timestamptz,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'given', 'missed', 'held', 'refused')),
  given_by text,
  notes text,
  created_at timestamptz not null default now(),
  is_active boolean not null default true
);

-- e-Prescribing (immutable once issued)
create table if not exists public.hms_prescriptions (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  rx_no text not null,
  patient_id uuid,
  patient_name text not null,
  encounter_id uuid,
  prescriber_name text not null,
  status text not null default 'issued'
    check (status in ('draft', 'issued', 'dispensed', 'cancelled', 'superseded')),
  supersedes_rx_id uuid,
  route_to text not null default 'hospital_pharmacy'
    check (route_to in ('hospital_pharmacy', 'external', 'print')),
  allergy_checked boolean not null default false,
  issued_at timestamptz,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  is_active boolean not null default true,
  unique (tenant_id, rx_no)
);

-- Lab
create table if not exists public.hms_lab_orders (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  order_no text not null,
  patient_id uuid,
  patient_name text not null,
  encounter_id uuid,
  ordering_physician text,
  sample_barcode text,
  tests jsonb not null default '[]'::jsonb,
  status text not null default 'ordered'
    check (status in ('ordered', 'collected', 'processing', 'resulted', 'critical', 'cancelled')),
  hl7_stub jsonb,
  critical_alerted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  is_active boolean not null default true,
  unique (tenant_id, order_no)
);

create table if not exists public.hms_lab_results (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lab_order_id uuid not null references public.hms_lab_orders(id) on delete cascade,
  test_name text not null,
  result_value text,
  unit text,
  reference_range text,
  flag text check (flag is null or flag in ('normal', 'high', 'low', 'critical')),
  resulted_at timestamptz not null default now(),
  resulted_by text,
  created_at timestamptz not null default now()
);

-- Radiology
create table if not exists public.hms_imaging_orders (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  order_no text not null,
  patient_id uuid,
  patient_name text not null,
  encounter_id uuid,
  modality text not null check (modality in ('xray', 'ct', 'mri', 'ultrasound', 'other')),
  body_part text,
  clinical_indication text,
  status text not null default 'ordered'
    check (status in ('ordered', 'scheduled', 'in_progress', 'reported', 'signed_off', 'cancelled')),
  dicom_ref text,
  report_text text,
  radiologist_name text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  is_active boolean not null default true,
  unique (tenant_id, order_no)
);

-- Hospital pharmacy stock (distinct from marketplace)
create table if not exists public.hms_pharmacy_stock (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sku text not null,
  drug_name text not null,
  batch_no text not null,
  expiry_date date not null,
  quantity integer not null default 0,
  reorder_level integer not null default 10,
  unit_cost numeric not null default 0,
  supplier_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, sku, batch_no)
);

create table if not exists public.hms_dispenses (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  dispense_no text not null,
  prescription_id uuid,
  patient_name text not null,
  stock_id uuid,
  drug_name text not null,
  quantity integer not null,
  dispensed_at timestamptz not null default now(),
  dispensed_by text,
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, dispense_no)
);

-- Insurance claims
create table if not exists public.hms_insurance_claims (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  claim_no text not null,
  patient_id uuid,
  patient_name text not null,
  invoice_id uuid,
  payer text not null,
  policy_no text,
  eligibility_status text not null default 'unchecked'
    check (eligibility_status in ('unchecked', 'eligible', 'ineligible', 'pending')),
  claim_status text not null default 'draft'
    check (claim_status in ('draft', 'ready', 'submitted', 'paid', 'denied', 'appealed')),
  amount numeric not null default 0,
  x12_stub jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  is_active boolean not null default true,
  unique (tenant_id, claim_no)
);

-- Telemedicine
create table if not exists public.hms_telemedicine_sessions (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  session_no text not null,
  patient_id uuid,
  patient_name text not null,
  doctor_name text not null,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_session', 'completed', 'cancelled', 'no_show')),
  video_provider text not null default 'baa_compliant_stub',
  join_token text,
  encounter_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, session_no)
);

-- Ambulance & emergency intake
create table if not exists public.hms_ambulance_dispatches (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  dispatch_no text not null,
  patient_name text,
  pickup_location text,
  destination text,
  status text not null default 'dispatched'
    check (status in ('requested', 'dispatched', 'en_route', 'on_scene', 'transporting', 'completed', 'cancelled')),
  gps_lat numeric,
  gps_lng numeric,
  vehicle_id text,
  dispatched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, dispatch_no)
);

create table if not exists public.hms_emergency_intakes (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  intake_no text not null,
  patient_id uuid,
  patient_name text not null,
  triage_priority text not null default 'urgent'
    check (triage_priority in ('resuscitation', 'emergency', 'urgent', 'semi_urgent', 'non_urgent')),
  chief_complaint text,
  incomplete_registration boolean not null default true,
  encounter_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  is_active boolean not null default true,
  unique (tenant_id, intake_no)
);

-- Staff / roster / equipment
create table if not exists public.hms_staff (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  staff_no text not null,
  full_name text not null,
  email text,
  role_title text,
  license_no text,
  license_expiry date,
  department text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, staff_no)
);

create table if not exists public.hms_duty_rosters (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  staff_id uuid,
  staff_name text not null,
  shift_date date not null,
  shift_type text not null default 'day' check (shift_type in ('day', 'evening', 'night')),
  ward_name text,
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists public.hms_equipment_assets (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  asset_tag text not null,
  name text not null,
  category text,
  location text,
  next_maintenance date,
  status text not null default 'operational',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, asset_tag)
);

-- Notifications & secure messages (no PHI in push payload)
create table if not exists public.hms_notification_prefs (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid,
  email_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  push_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hms_notifications (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  recipient_ref text not null,
  channel text not null default 'in_app' check (channel in ('in_app', 'email', 'sms', 'push')),
  title text not null,
  body_generic text not null,
  kind text not null default 'general',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.hms_message_threads (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  subject text not null,
  participant_emails text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists public.hms_messages (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  thread_id uuid not null references public.hms_message_threads(id) on delete cascade,
  sender_email text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- Cross-branch sharing consent
alter table public.hms_patients
  add column if not exists branch_id uuid,
  add column if not exists cross_branch_share_consent boolean not null default false;

alter table public.hms_appointments
  add column if not exists branch_id uuid,
  add column if not exists reminder_sent boolean not null default false;

-- RLS enable all new tables
do $$
declare
  t text;
begin
  foreach t in array array[
    'hms_branches','hms_wards','hms_beds','hms_admissions','hms_transfers',
    'hms_vitals','hms_mar','hms_prescriptions','hms_lab_orders','hms_lab_results',
    'hms_imaging_orders','hms_pharmacy_stock','hms_dispenses','hms_insurance_claims',
    'hms_telemedicine_sessions','hms_ambulance_dispatches','hms_emergency_intakes',
    'hms_staff','hms_duty_rosters','hms_equipment_assets','hms_notification_prefs',
    'hms_notifications','hms_message_threads','hms_messages'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_tenant_isolation'
    ) then
      execute format(
        'create policy %I on public.%I for all using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id())',
        t||'_tenant_isolation', t
      );
    end if;
  end loop;
end
$$;

create index if not exists idx_hms_beds_status on public.hms_beds (tenant_id, status);
create index if not exists idx_hms_admissions_status on public.hms_admissions (tenant_id, status);
create index if not exists idx_hms_rx_patient on public.hms_prescriptions (tenant_id, patient_id);
create index if not exists idx_hms_lab_orders_status on public.hms_lab_orders (tenant_id, status);
create index if not exists idx_hms_pharmacy_expiry on public.hms_pharmacy_stock (tenant_id, expiry_date);

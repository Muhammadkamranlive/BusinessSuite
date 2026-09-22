-- =============================================================================
-- Healthcare HMS Phase 1 core — dedicated PHI tables (not catalog_records)
-- Spec: modules/healthcare/AGENT_SPEC_Hospital_Management_System.md §2, §4, §7
-- Compliance: RLS on all PHI tables; append-only PHI audit; consent versioning
-- Run: npm run db:push
-- =============================================================================

-- Clinical staff role assignments (spec §3 matrix keys)
create table if not exists public.hms_role_assignments (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_profile_id uuid,
  staff_email text not null,
  staff_name text not null,
  hms_role text not null check (hms_role in (
    'super_admin', 'hospital_admin', 'doctor', 'nurse', 'receptionist',
    'lab_technician', 'pharmacist', 'billing_staff', 'patient', 'it_security'
  )),
  branch_id text,
  mfa_required boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create index if not exists idx_hms_role_assignments_tenant on public.hms_role_assignments (tenant_id);
create index if not exists idx_hms_role_assignments_email on public.hms_role_assignments (tenant_id, staff_email);

-- Patients (auto MRN uniqueness per tenant)
create table if not exists public.hms_patients (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  mrn text not null,
  full_name text not null,
  dob date,
  gender text,
  phone text,
  email text,
  national_id text,
  address text,
  blood_group text,
  emergency_contact_name text,
  emergency_contact_phone text,
  insurance_payer text,
  insurance_policy_no text,
  insurance_group_no text,
  guardian_patient_id uuid,
  status text not null default 'active',
  anonymized boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,
  is_active boolean not null default true,
  unique (tenant_id, mrn)
);

create index if not exists idx_hms_patients_tenant on public.hms_patients (tenant_id);
create index if not exists idx_hms_patients_search on public.hms_patients (tenant_id, full_name, phone, national_id);

-- Versioned consents (spec §2 + §4.2)
create table if not exists public.hms_patient_consents (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.hms_patients(id) on delete cascade,
  consent_type text not null,
  version text not null,
  effective_date date not null,
  document_ref text,
  signed_by text,
  witness text,
  notes text,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  is_active boolean not null default true
);

create index if not exists idx_hms_consents_patient on public.hms_patient_consents (tenant_id, patient_id);

-- Appointments
create table if not exists public.hms_appointments (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid references public.hms_patients(id),
  patient_name text not null,
  doctor_name text not null,
  department text,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'checked_in', 'in_consult', 'completed', 'cancelled', 'no_show', 'waitlist')),
  cancel_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,
  is_active boolean not null default true
);

create index if not exists idx_hms_appointments_tenant on public.hms_appointments (tenant_id, scheduled_at);

-- OPD / IPD encounters
create table if not exists public.hms_encounters (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  encounter_no text not null,
  encounter_type text not null default 'opd' check (encounter_type in ('opd', 'ipd', 'emergency', 'telemedicine')),
  patient_id uuid references public.hms_patients(id),
  patient_name text not null,
  doctor_name text,
  department text,
  token_no text,
  queue_status text not null default 'waiting'
    check (queue_status in ('waiting', 'called', 'in_consult', 'completed', 'cancelled')),
  visit_date date not null,
  chief_complaint text,
  appointment_id uuid,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,
  is_active boolean not null default true,
  unique (tenant_id, encounter_no)
);

create index if not exists idx_hms_encounters_tenant on public.hms_encounters (tenant_id, visit_date);

-- Clinical notes with amendment chain (no silent overwrite)
create table if not exists public.hms_clinical_notes (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid references public.hms_patients(id),
  encounter_id uuid references public.hms_encounters(id),
  patient_name text not null,
  author_name text not null,
  note_type text not null default 'soap',
  subjective text,
  objective text,
  assessment text,
  plan text,
  free_text text,
  version_no integer not null default 1,
  amends_note_id uuid,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  is_active boolean not null default true
);

create index if not exists idx_hms_clinical_notes_patient on public.hms_clinical_notes (tenant_id, patient_id);

-- Problem / allergy / medication lists (historized on change via is_current)
create table if not exists public.hms_problem_list (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.hms_patients(id) on delete cascade,
  problem text not null,
  icd10_code text,
  status text not null default 'active' check (status in ('active', 'resolved')),
  onset_date date,
  resolved_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  is_active boolean not null default true
);

create table if not exists public.hms_allergy_list (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.hms_patients(id) on delete cascade,
  allergen text not null,
  reaction text,
  severity text check (severity is null or severity in ('mild', 'moderate', 'severe')),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  is_active boolean not null default true
);

create table if not exists public.hms_medication_list (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.hms_patients(id) on delete cascade,
  drug_name text not null,
  dose text,
  frequency text,
  route text,
  status text not null default 'current' check (status in ('current', 'stopped')),
  started_at date,
  stopped_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  is_active boolean not null default true
);

-- Clinical billing (separate from ERP sales invoices)
create table if not exists public.hms_invoices (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_no text not null,
  patient_id uuid references public.hms_patients(id),
  patient_name text not null,
  encounter_id uuid,
  invoice_date date not null,
  status text not null default 'draft'
    check (status in ('draft', 'issued', 'partially_paid', 'paid', 'void', 'refunded')),
  subtotal numeric not null default 0,
  tax_amount numeric not null default 0,
  discount_amount numeric not null default 0,
  total_amount numeric not null default 0,
  paid_amount numeric not null default 0,
  lines jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  is_active boolean not null default true,
  unique (tenant_id, invoice_no)
);

create table if not exists public.hms_payments (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  payment_no text not null,
  invoice_id uuid not null references public.hms_invoices(id),
  patient_name text not null,
  amount numeric not null,
  method text not null default 'cash',
  payment_date date not null,
  created_at timestamptz not null default now(),
  created_by text,
  is_active boolean not null default true,
  unique (tenant_id, payment_no)
);

-- Append-only PHI audit (spec §2 — no UPDATE/DELETE via RLS)
create table if not exists public.hms_phi_audit_logs (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_at timestamptz not null default now(),
  user_id text,
  actor_email text,
  action text not null,
  table_name text not null,
  record_id text,
  ip_address text,
  device_info text,
  before_diff jsonb,
  after_diff jsonb,
  justification text,
  break_glass boolean not null default false
);

create index if not exists idx_hms_phi_audit_record
  on public.hms_phi_audit_logs (tenant_id, table_name, record_id, created_at desc);

-- Break-glass emergency access (spec §2)
create table if not exists public.hms_break_glass (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_at timestamptz not null default now(),
  actor_email text not null,
  patient_id uuid,
  patient_mrn text,
  justification text not null,
  alerted_security_officer boolean not null default true,
  expires_at timestamptz
);

-- ---------------------------------------------------------------------------
-- RLS — all PHI tables
-- ---------------------------------------------------------------------------
alter table public.hms_role_assignments enable row level security;
alter table public.hms_patients enable row level security;
alter table public.hms_patient_consents enable row level security;
alter table public.hms_appointments enable row level security;
alter table public.hms_encounters enable row level security;
alter table public.hms_clinical_notes enable row level security;
alter table public.hms_problem_list enable row level security;
alter table public.hms_allergy_list enable row level security;
alter table public.hms_medication_list enable row level security;
alter table public.hms_invoices enable row level security;
alter table public.hms_payments enable row level security;
alter table public.hms_phi_audit_logs enable row level security;
alter table public.hms_break_glass enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'hms_role_assignments', 'hms_patients', 'hms_patient_consents',
    'hms_appointments', 'hms_encounters', 'hms_clinical_notes',
    'hms_problem_list', 'hms_allergy_list', 'hms_medication_list',
    'hms_invoices', 'hms_payments', 'hms_break_glass'
  ]
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t and policyname = t || '_tenant_isolation'
    ) then
      execute format(
        'create policy %I on public.%I for all using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id())',
        t || '_tenant_isolation', t
      );
    end if;
  end loop;

  -- Append-only audit: INSERT + SELECT only (no UPDATE/DELETE for any role)
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'hms_phi_audit_logs' and policyname = 'hms_phi_audit_insert'
  ) then
    create policy hms_phi_audit_insert on public.hms_phi_audit_logs
      for insert with check (tenant_id = current_tenant_id());
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'hms_phi_audit_logs' and policyname = 'hms_phi_audit_select'
  ) then
    create policy hms_phi_audit_select on public.hms_phi_audit_logs
      for select using (tenant_id = current_tenant_id());
  end if;
end
$$;

comment on table public.hms_patients is 'HMS patients — PHI; auto MRN; RLS tenant isolation.';
comment on table public.hms_patient_consents is 'Versioned consents with effective_date and document_ref.';
comment on table public.hms_phi_audit_logs is 'Append-only PHI access/change audit. No UPDATE/DELETE policies.';
comment on table public.hms_break_glass is 'Emergency access with required justification + security alert flag.';

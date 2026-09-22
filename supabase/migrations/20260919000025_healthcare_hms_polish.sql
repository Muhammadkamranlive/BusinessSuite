-- =============================================================================
-- Healthcare HMS polish — attachments, POs, consents, reminders, lockouts
-- Compliance: RLS on all PHI tables; no PHI in reminder payloads
-- =============================================================================

-- Account lockout persistence (email-scoped, not tenant-scoped)
create table if not exists public.auth_account_lockouts (
  email text primary key,
  failures_json jsonb not null default '[]'::jsonb,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.auth_account_lockouts enable row level security;
-- Service role / admin API only — no end-user policies

-- EMR attachments (PHI metadata; blobs in hms-documents bucket)
create table if not exists public.hms_emr_attachments (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid,
  encounter_id uuid,
  clinical_note_id uuid,
  file_name text not null,
  storage_path text not null,
  content_type text not null default 'application/octet-stream',
  file_size bigint not null default 0,
  uploaded_by text,
  created_at timestamptz not null default now(),
  is_active boolean not null default true
);

-- Hospital pharmacy purchase orders
create table if not exists public.hms_pharmacy_purchase_orders (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  po_no text not null,
  supplier_name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'ordered', 'received', 'cancelled')),
  ordered_at timestamptz,
  received_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  is_active boolean not null default true,
  unique (tenant_id, po_no)
);

create table if not exists public.hms_pharmacy_po_items (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  po_id uuid not null references public.hms_pharmacy_purchase_orders(id) on delete cascade,
  drug_name text not null,
  quantity numeric not null default 0,
  unit_cost numeric not null default 0,
  created_at timestamptz not null default now(),
  is_active boolean not null default true
);

-- Cross-branch patient share consent
create table if not exists public.hms_branch_share_consents (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null,
  from_branch_id uuid,
  to_branch_id uuid not null,
  consent_version text not null default '1.0',
  granted_at timestamptz not null default now(),
  granted_by text,
  revoked_at timestamptz,
  is_active boolean not null default true
);

-- Appointment waitlist
create table if not exists public.hms_appointment_waitlist (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid,
  patient_name text not null,
  doctor_name text not null,
  department text,
  preferred_date date,
  priority integer not null default 5,
  status text not null default 'waiting'
    check (status in ('waiting', 'offered', 'booked', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

-- Doctor leave calendar
create table if not exists public.hms_doctor_leave (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  doctor_name text not null,
  staff_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

-- Reminder queue (generic payloads — NO PHI)
create table if not exists public.hms_reminder_queue (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  channel text not null default 'in_app'
    check (channel in ('in_app', 'email', 'sms', 'push')),
  template_key text not null,
  recipient_email text,
  recipient_phone text,
  payload_generic jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  created_at timestamptz not null default now()
);

-- Alter existing clinical tables
alter table public.hms_imaging_orders
  add column if not exists pacs_viewer_url text;

alter table public.hms_lab_orders
  add column if not exists barcode_printed_at timestamptz,
  add column if not exists collected_at timestamptz;

alter table public.hms_invoices
  add column if not exists tax_rate numeric,
  add column if not exists payment_gateway text,
  add column if not exists payment_ref text;

-- Private HMS documents bucket (signed URLs only — never public)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hms-documents',
  'hms-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'application/octet-stream'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage policy stub: tenant-scoped paths tenants/{tenant_id}/...
-- Configure object policies in Supabase dashboard or a follow-up migration:
--   SELECT/INSERT/DELETE on storage.objects where bucket_id = 'hms-documents'
--   and (storage.foldername(name))[1] = 'tenants' and tenant match via JWT claim.

-- RLS enable tenant-scoped HMS tables
do $$
declare
  t text;
begin
  foreach t in array array[
    'hms_emr_attachments',
    'hms_pharmacy_purchase_orders',
    'hms_pharmacy_po_items',
    'hms_branch_share_consents',
    'hms_appointment_waitlist',
    'hms_doctor_leave',
    'hms_reminder_queue'
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

create index if not exists idx_hms_emr_attachments_patient on public.hms_emr_attachments (tenant_id, patient_id);
create index if not exists idx_hms_pharmacy_po_status on public.hms_pharmacy_purchase_orders (tenant_id, status);
create index if not exists idx_hms_branch_share_patient on public.hms_branch_share_consents (tenant_id, patient_id, is_active);
create index if not exists idx_hms_waitlist_status on public.hms_appointment_waitlist (tenant_id, status);
create index if not exists idx_hms_reminder_pending on public.hms_reminder_queue (tenant_id, status, scheduled_at);

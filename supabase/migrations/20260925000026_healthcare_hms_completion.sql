-- =============================================================================
-- Healthcare HMS completion — consumables, quality, HL7 stub, SSO, attendance
-- Spec: AGENT_SPEC_Hospital_Management_System.md
-- Compliance: RLS + tenant isolation; regulatory payloads aggregates only
-- =============================================================================

create table if not exists public.hms_consumables (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sku text not null,
  name text not null,
  category text,
  quantity numeric not null default 0,
  reorder_level numeric not null default 0,
  unit text not null default 'each',
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, sku)
);

create table if not exists public.hms_consumable_movements (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  consumable_id uuid not null references public.hms_consumables(id) on delete cascade,
  qty_delta numeric not null,
  reason text not null,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.hms_quality_indicators (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  period text not null,
  value_text text not null,
  target_text text,
  status text not null default 'on_track'
    check (status in ('on_track', 'at_risk', 'breached')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, code, period)
);

create table if not exists public.hms_regulatory_reports (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  template_key text not null,
  region text not null default 'default',
  title text not null,
  period_start date not null,
  period_end date not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'generated')),
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hms_hl7_inbox (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  raw_message text not null,
  parsed_stub jsonb not null default '{}'::jsonb,
  status text not null default 'received'
    check (status in ('received', 'processed', 'failed')),
  lab_order_id uuid references public.hms_lab_orders(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.hms_sso_configs (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null check (provider in ('oidc', 'saml')),
  issuer_url text not null,
  client_id text not null,
  client_secret_ref text not null default 'vault://stub-not-configured',
  enabled boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, provider)
);

create table if not exists public.hms_staff_attendance (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  staff_id uuid not null references public.hms_staff(id) on delete cascade,
  work_date date not null,
  check_in timestamptz,
  check_out timestamptz,
  status text not null default 'present'
    check (status in ('present', 'absent', 'leave')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, staff_id, work_date)
);

do $$
declare
  t text;
begin
  foreach t in array array[
    'hms_consumables',
    'hms_consumable_movements',
    'hms_quality_indicators',
    'hms_regulatory_reports',
    'hms_hl7_inbox',
    'hms_sso_configs',
    'hms_staff_attendance'
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

create index if not exists idx_hms_consumables_sku on public.hms_consumables (tenant_id, sku);
create index if not exists idx_hms_consumable_movements_item on public.hms_consumable_movements (tenant_id, consumable_id, created_at desc);
create index if not exists idx_hms_quality_indicators_period on public.hms_quality_indicators (tenant_id, period, status);
create index if not exists idx_hms_regulatory_reports_template on public.hms_regulatory_reports (tenant_id, template_key, status);
create index if not exists idx_hms_hl7_inbox_status on public.hms_hl7_inbox (tenant_id, status, created_at desc);
create index if not exists idx_hms_staff_attendance_date on public.hms_staff_attendance (tenant_id, work_date, staff_id);

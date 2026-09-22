-- Healthcare pharmacy marketplace — DB-first (no browser localStorage)
-- Run: npm run db:push

create table if not exists public.pharmacy_partners (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  code text not null,
  npi text,
  license_no text,
  email text,
  phone text,
  address text,
  api_mode text not null default 'manual' check (api_mode in ('api', 'manual')),
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, code)
);

create table if not exists public.marketplace_products (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  pharmacy_id uuid not null references public.pharmacy_partners(id) on delete cascade,
  pharmacy_name text not null,
  sku text not null,
  name text not null,
  category text not null,
  description text,
  strength text,
  form text,
  unit_price numeric not null default 0,
  compare_price numeric,
  stock_qty integer not null default 0,
  featured boolean not null default false,
  controlled boolean not null default false,
  warning text,
  education text,
  image_url text,
  status text not null default 'active' check (status in ('active', 'inactive', 'out_of_stock')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, sku)
);

create table if not exists public.provider_credentials (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  full_name text not null,
  role_type text not null check (role_type in ('physician', 'np', 'pa', 'clinic_staff', 'clinic_admin')),
  clinic_name text not null,
  email text not null,
  phone text,
  npi text not null,
  license_no text not null,
  license_state text,
  dea_number text,
  document_note text,
  verification_status text not null default 'submitted'
    check (verification_status in ('draft', 'submitted', 'approved', 'rejected', 'suspended')),
  can_order boolean not null default false,
  mfa_enabled boolean not null default false,
  reviewed_by text,
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists public.clinic_orders (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  order_no text not null,
  provider_id uuid not null,
  provider_name text not null,
  clinic_name text not null,
  patient_name text not null,
  patient_dob date,
  patient_mrn text,
  pharmacy_id uuid not null,
  pharmacy_name text not null,
  status text not null default 'pending'
    check (status in ('draft', 'pending', 'processing', 'accepted', 'rejected', 'shipped', 'completed', 'canceled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  order_date date not null,
  shipping_address text,
  dosage_notes text,
  medical_necessity text,
  attestation_signed boolean not null default false,
  consent_acknowledged boolean not null default false,
  subtotal numeric not null default 0,
  shipping_fee numeric not null default 0,
  platform_fee numeric not null default 0,
  tax_amount numeric not null default 0,
  total_amount numeric not null default 0,
  tracking_no text,
  invoice_no text,
  lines jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, order_no)
);

create table if not exists public.marketplace_compliance_events (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_at timestamptz not null default now(),
  actor text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  detail text not null,
  phi_touch boolean not null default false
);

create index if not exists idx_pharmacy_partners_tenant on public.pharmacy_partners (tenant_id);
create index if not exists idx_marketplace_products_tenant on public.marketplace_products (tenant_id);
create index if not exists idx_marketplace_products_pharmacy on public.marketplace_products (pharmacy_id);
create index if not exists idx_provider_credentials_tenant on public.provider_credentials (tenant_id);
create index if not exists idx_clinic_orders_tenant on public.clinic_orders (tenant_id);
create index if not exists idx_clinic_orders_pharmacy on public.clinic_orders (pharmacy_id);
create index if not exists idx_clinic_orders_status on public.clinic_orders (tenant_id, status);
create index if not exists idx_marketplace_compliance_tenant on public.marketplace_compliance_events (tenant_id, created_at desc);

alter table public.pharmacy_partners enable row level security;
alter table public.marketplace_products enable row level security;
alter table public.provider_credentials enable row level security;
alter table public.clinic_orders enable row level security;
alter table public.marketplace_compliance_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'pharmacy_partners' and policyname = 'pharmacy_partners_tenant_isolation'
  ) then
    create policy pharmacy_partners_tenant_isolation on public.pharmacy_partners
      for all using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'marketplace_products' and policyname = 'marketplace_products_tenant_isolation'
  ) then
    create policy marketplace_products_tenant_isolation on public.marketplace_products
      for all using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'provider_credentials' and policyname = 'provider_credentials_tenant_isolation'
  ) then
    create policy provider_credentials_tenant_isolation on public.provider_credentials
      for all using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'clinic_orders' and policyname = 'clinic_orders_tenant_isolation'
  ) then
    create policy clinic_orders_tenant_isolation on public.clinic_orders
      for all using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'marketplace_compliance_events' and policyname = 'marketplace_compliance_tenant_isolation'
  ) then
    create policy marketplace_compliance_tenant_isolation on public.marketplace_compliance_events
      for all using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());
  end if;
end
$$;

comment on table public.pharmacy_partners is 'Multi-pharmacy partners for the Healthcare Rx marketplace.';
comment on table public.marketplace_products is 'Pharmacy-specific product catalog for licensed professional ordering.';
comment on table public.provider_credentials is 'NPI/license verification for marketplace ordering access.';
comment on table public.clinic_orders is 'Patient-specific clinic Rx orders with fee breakdown and line items (jsonb).';
comment on table public.marketplace_compliance_events is 'Append-only PHI/access audit trail for marketplace entities.';

-- Alif Pharmacy (retail POS) — durable Supabase tables (not HMS hospital pharmacy)
-- Run: npm run db:push

create table if not exists public.alif_pharmacy_products (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sku text not null,
  barcode text not null default '',
  name text not null,
  generic_name text not null default '',
  strength text not null default '',
  pack_size text not null default '',
  category text not null default 'medicine'
    check (category in ('medicine', 'otc', 'surgical', 'other')),
  unit text not null default 'pack',
  cost_price numeric not null default 0,
  sale_price numeric not null default 0,
  reorder_level integer not null default 0,
  requires_rx boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, sku)
);

create table if not exists public.alif_pharmacy_batches (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.alif_pharmacy_products(id) on delete cascade,
  batch_no text not null,
  expiry_date date not null,
  quantity integer not null default 0,
  location text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, product_id, batch_no)
);

create table if not exists public.alif_pharmacy_customers (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  phone text not null default '',
  national_id text not null default '',
  address text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, code)
);

create index if not exists alif_pharmacy_customers_phone_idx
  on public.alif_pharmacy_customers (tenant_id, phone);

create table if not exists public.alif_pharmacy_sales (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sale_no text not null,
  customer_id uuid,
  customer_name text not null default 'Walk-in',
  customer_phone text not null default '',
  customer_national_id text not null default '',
  lines jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null default 0,
  tender text not null default 'cash' check (tender in ('cash', 'card', 'mixed')),
  amount_paid numeric not null default 0,
  change_due numeric not null default 0,
  cashier text not null default '',
  sold_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, sale_no)
);

create index if not exists alif_pharmacy_products_tenant_idx on public.alif_pharmacy_products (tenant_id);
create index if not exists alif_pharmacy_batches_tenant_idx on public.alif_pharmacy_batches (tenant_id);
create index if not exists alif_pharmacy_batches_product_idx on public.alif_pharmacy_batches (product_id);
create index if not exists alif_pharmacy_sales_tenant_idx on public.alif_pharmacy_sales (tenant_id);
create index if not exists alif_pharmacy_sales_sold_at_idx on public.alif_pharmacy_sales (tenant_id, sold_at desc);

alter table public.alif_pharmacy_products enable row level security;
alter table public.alif_pharmacy_batches enable row level security;
alter table public.alif_pharmacy_customers enable row level security;
alter table public.alif_pharmacy_sales enable row level security;

-- Service-role sync uses secret key; keep permissive authenticated policies for future direct clients
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'alif_pharmacy_products' and policyname = 'alif_pharmacy_products_tenant'
  ) then
    create policy alif_pharmacy_products_tenant on public.alif_pharmacy_products
      for all using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'alif_pharmacy_batches' and policyname = 'alif_pharmacy_batches_tenant'
  ) then
    create policy alif_pharmacy_batches_tenant on public.alif_pharmacy_batches
      for all using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'alif_pharmacy_customers' and policyname = 'alif_pharmacy_customers_tenant'
  ) then
    create policy alif_pharmacy_customers_tenant on public.alif_pharmacy_customers
      for all using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'alif_pharmacy_sales' and policyname = 'alif_pharmacy_sales_tenant'
  ) then
    create policy alif_pharmacy_sales_tenant on public.alif_pharmacy_sales
      for all using (true) with check (true);
  end if;
end $$;

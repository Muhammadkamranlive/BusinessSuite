-- Sales / Purchase / CRM / Inventory / Finance completeness
-- Additive only. App stores dual-write here; database is the source of truth.

/* =========================================================================
 * 1. Document numbering (DB sequences — not hardcoded JS counters)
 * ========================================================================= */

create table if not exists document_sequences (
  tenant_id uuid not null references tenants(id) on delete cascade,
  module_code text not null,
  prefix text not null,
  next_number integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, module_code)
);

create or replace function next_document_number(p_tenant_id uuid, p_module_code text, p_prefix text default null)
returns text
language plpgsql
as $$
declare
  v_prefix text;
  v_next integer;
begin
  insert into document_sequences (tenant_id, module_code, prefix, next_number)
  values (
    p_tenant_id,
    p_module_code,
    coalesce(nullif(p_prefix, ''), upper(left(replace(p_module_code, '_', ''), 4))),
    2
  )
  on conflict (tenant_id, module_code) do update
    set next_number = document_sequences.next_number + 1,
        prefix = coalesce(nullif(p_prefix, ''), document_sequences.prefix),
        updated_at = now()
  returning prefix, next_number - 1 into v_prefix, v_next;

  return v_prefix || '-' || lpad(v_next::text, 5, '0');
end
$$;

/* =========================================================================
 * 2. Alter existing CRM / sales / purchase / inventory / finance columns
 * ========================================================================= */

alter table leads
  add column if not exists score integer not null default 0,
  add column if not exists territory text,
  add column if not exists campaign_id uuid,
  add column if not exists converted_customer_id uuid,
  add column if not exists converted_deal_id uuid;

alter table customers
  add column if not exists credit_limit numeric not null default 0,
  add column if not exists credit_terms text,
  add column if not exists payment_terms text,
  add column if not exists price_group text,
  add column if not exists customer_group_id uuid,
  add column if not exists parent_id uuid references customers(id),
  add column if not exists salesperson_id uuid,
  add column if not exists territory text,
  add column if not exists currency text not null default 'USD',
  add column if not exists tax_region text;

alter table deals
  add column if not exists win_loss_reason text,
  add column if not exists quotation_id uuid,
  add column if not exists sales_order_id uuid;

alter table products
  add column if not exists category_id uuid,
  add column if not exists tax_class text,
  add column if not exists barcode text;

alter table invoices
  add column if not exists customer_name text,
  add column if not exists sales_order_id uuid,
  add column if not exists delivery_note_id uuid,
  add column if not exists currency text not null default 'USD',
  add column if not exists exchange_rate numeric not null default 1,
  add column if not exists lines jsonb not null default '[]'::jsonb,
  add column if not exists is_proforma boolean not null default false,
  add column if not exists recurring_interval text,
  add column if not exists salesperson_id uuid,
  add column if not exists notes text;

alter table quotations
  add column if not exists customer_name text,
  add column if not exists lead_id uuid,
  add column if not exists deal_id uuid,
  add column if not exists revision integer not null default 1,
  add column if not exists parent_quotation_id uuid,
  add column if not exists currency text not null default 'USD',
  add column if not exists lines jsonb not null default '[]'::jsonb,
  add column if not exists approved_by text,
  add column if not exists approved_at timestamptz,
  add column if not exists notes text;

alter table payments_received
  add column if not exists customer_name text,
  add column if not exists is_advance boolean not null default false,
  add column if not exists sales_order_id uuid,
  add column if not exists updated_at timestamptz not null default now();

alter table suppliers
  add column if not exists tax_number text,
  add column if not exists bank_name text,
  add column if not exists bank_account text,
  add column if not exists category text,
  add column if not exists rating numeric,
  add column if not exists address text,
  add column if not exists payment_terms text;

alter table purchase_orders
  add column if not exists supplier_name text,
  add column if not exists lines jsonb not null default '[]'::jsonb,
  add column if not exists requisition_id uuid,
  add column if not exists rfq_id uuid,
  add column if not exists currency text not null default 'USD',
  add column if not exists notes text,
  add column if not exists approved_by text,
  add column if not exists approved_at timestamptz;

alter table expenses
  add column if not exists account_name text;

alter table projects
  add column if not exists customer_name text,
  add column if not exists budget numeric,
  add column if not exists progress numeric;

/* =========================================================================
 * 3. CRM extras
 * ========================================================================= */

create table if not exists customer_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  code text not null,
  price_group text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, code)
);

create table if not exists crm_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  designation text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists crm_activities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  related_type text not null,
  related_id uuid not null,
  activity_type text not null,
  subject text not null,
  description text,
  due_date timestamptz,
  completed_at timestamptz,
  assigned_to uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists crm_campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  campaign_no text not null,
  name text not null,
  channel text not null default 'email',
  status text not null default 'draft',
  budget numeric not null default 0,
  spend numeric not null default 0,
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, campaign_no)
);

create table if not exists crm_tickets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  ticket_no text not null,
  customer_id uuid references customers(id) on delete set null,
  subject text not null,
  description text,
  priority text not null default 'medium',
  status text not null default 'open',
  sla_hours integer not null default 24,
  due_at timestamptz,
  csat_score integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, ticket_no)
);

/* =========================================================================
 * 4. Sales masters + fulfillment + AR docs
 * ========================================================================= */

create table if not exists salespeople (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  email text,
  territory text,
  team text,
  commission_pct numeric not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists price_lists (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  currency text not null default 'USD',
  valid_from date,
  valid_until date,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists price_list_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  price_list_id uuid not null references price_lists(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  min_qty numeric not null default 1,
  unit_price numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists discount_schemes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  kind text not null default 'volume',
  percent numeric not null default 0,
  min_qty numeric not null default 0,
  valid_from date,
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists sales_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  order_no text not null,
  customer_name text not null,
  customer_id uuid references customers(id),
  order_date date not null,
  status text not null default 'draft',
  total_amount numeric not null default 0,
  lines jsonb not null default '[]'::jsonb,
  quotation_id uuid,
  warehouse_id uuid,
  credit_hold boolean not null default false,
  shipping_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, order_no)
);

create table if not exists delivery_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  delivery_no text not null,
  sales_order_id uuid references sales_orders(id),
  customer_name text not null,
  delivery_date date not null,
  status text not null default 'draft',
  warehouse_id uuid,
  transporter text,
  tracking_no text,
  pod_notes text,
  lines jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, delivery_no)
);

create table if not exists sales_returns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  return_no text not null,
  customer_name text not null,
  invoice_no text,
  return_date date not null,
  status text not null default 'draft',
  total_amount numeric not null default 0,
  reason text,
  lines jsonb not null default '[]'::jsonb,
  warehouse_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, return_no)
);

create table if not exists credit_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  credit_note_no text not null,
  customer_name text not null,
  invoice_no text,
  note_date date not null,
  amount numeric not null default 0,
  reason text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, credit_note_no)
);

create table if not exists debit_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  debit_note_no text not null,
  party_name text not null,
  party_type text not null default 'customer',
  source_no text,
  note_date date not null,
  amount numeric not null default 0,
  reason text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, debit_note_no)
);

/* =========================================================================
 * 5. Purchase extras
 * ========================================================================= */

create table if not exists purchase_requisitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  requisition_no text not null,
  requested_by text not null,
  department text,
  status text not null default 'draft',
  needed_by date,
  notes text,
  lines jsonb not null default '[]'::jsonb,
  total_amount numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, requisition_no)
);

create table if not exists purchase_rfqs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  rfq_no text not null,
  title text not null,
  status text not null default 'open',
  due_date date,
  notes text,
  lines jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, rfq_no)
);

create table if not exists vendor_quotes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  rfq_id uuid not null references purchase_rfqs(id) on delete cascade,
  supplier_id uuid references suppliers(id),
  supplier_name text not null,
  total_amount numeric not null default 0,
  valid_until date,
  status text not null default 'received',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists goods_receipts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  receipt_no text not null,
  purchase_order_no text,
  purchase_order_id uuid references purchase_orders(id),
  supplier_name text,
  receipt_date date not null,
  status text not null default 'draft',
  notes text,
  lines jsonb not null default '[]'::jsonb,
  warehouse_id uuid,
  qc_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, receipt_no)
);

create table if not exists vendor_bills (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  bill_no text not null,
  supplier_name text not null,
  bill_date date not null,
  due_date date,
  status text not null default 'open',
  total_amount numeric not null default 0,
  paid_amount numeric not null default 0,
  lines jsonb not null default '[]'::jsonb,
  purchase_order_id uuid,
  goods_receipt_id uuid,
  match_status text not null default 'unmatched',
  match_variance numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, bill_no)
);

create table if not exists vendor_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  payment_no text not null,
  supplier_name text not null,
  payment_date date not null,
  amount numeric not null,
  payment_method text not null default 'bank',
  bill_no text,
  is_advance boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, payment_no)
);

create table if not exists match_tolerances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  qty_pct numeric not null default 2,
  amount_pct numeric not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id)
);

/* =========================================================================
 * 6. Inventory extras
 * ========================================================================= */

create table if not exists product_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists stock_transfers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  transfer_no text not null,
  product_id uuid references products(id),
  from_warehouse_id uuid references warehouses(id),
  to_warehouse_id uuid references warehouses(id),
  quantity numeric not null,
  transfer_date date not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, transfer_no)
);

create table if not exists stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  adjustment_no text not null,
  product_id uuid references products(id),
  warehouse_id uuid references warehouses(id),
  quantity_delta numeric not null,
  adjustment_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, adjustment_no)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_category_id_fkey'
  ) then
    alter table products
      add constraint products_category_id_fkey
      foreign key (category_id) references product_categories(id) on delete set null;
  end if;
end $$;

/* =========================================================================
 * 7. Finance extras + GL + approvals
 * ========================================================================= */

create table if not exists income_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  income_no text not null,
  income_date date not null,
  account_name text not null,
  amount numeric not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, income_no)
);

create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  journal_no text not null,
  journal_date date not null,
  account_name text not null,
  debit numeric not null default 0,
  credit numeric not null default 0,
  memo text,
  reference_type text,
  reference_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists tax_rates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  rate numeric not null default 0,
  country text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists ops_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  module text not null,
  entity_name text not null,
  entity_id uuid not null,
  title text not null,
  status text not null default 'pending',
  requested_by text,
  decided_by text,
  decided_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists project_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  status text not null default 'todo',
  owner text,
  due date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists project_timesheets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  person text,
  project_name text,
  hours numeric not null default 0,
  week text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

/* =========================================================================
 * 8. Indexes
 * ========================================================================= */

create index if not exists idx_crm_contacts_tenant on crm_contacts(tenant_id);
create index if not exists idx_crm_activities_tenant on crm_activities(tenant_id, related_type);
create index if not exists idx_crm_campaigns_tenant on crm_campaigns(tenant_id);
create index if not exists idx_crm_tickets_tenant on crm_tickets(tenant_id, status);
create index if not exists idx_sales_orders_tenant on sales_orders(tenant_id, status);
create index if not exists idx_delivery_notes_tenant on delivery_notes(tenant_id);
create index if not exists idx_sales_returns_tenant on sales_returns(tenant_id);
create index if not exists idx_credit_notes_tenant on credit_notes(tenant_id);
create index if not exists idx_goods_receipts_tenant on goods_receipts(tenant_id);
create index if not exists idx_vendor_bills_tenant on vendor_bills(tenant_id, status);
create index if not exists idx_vendor_payments_tenant on vendor_payments(tenant_id);
create index if not exists idx_purchase_requisitions_tenant on purchase_requisitions(tenant_id);
create index if not exists idx_purchase_rfqs_tenant on purchase_rfqs(tenant_id);
create index if not exists idx_journal_entries_tenant on journal_entries(tenant_id, journal_date);
create index if not exists idx_ops_approvals_tenant on ops_approvals(tenant_id, status);

/* =========================================================================
 * 9. RLS
 * ========================================================================= */

do $$
declare
  t text;
begin
  foreach t in array array[
    'document_sequences',
    'customer_groups',
    'crm_contacts',
    'crm_activities',
    'crm_campaigns',
    'crm_tickets',
    'salespeople',
    'price_lists',
    'price_list_items',
    'discount_schemes',
    'sales_orders',
    'delivery_notes',
    'sales_returns',
    'credit_notes',
    'debit_notes',
    'purchase_requisitions',
    'purchase_rfqs',
    'vendor_quotes',
    'goods_receipts',
    'vendor_bills',
    'vendor_payments',
    'match_tolerances',
    'product_categories',
    'stock_transfers',
    'stock_adjustments',
    'income_entries',
    'journal_entries',
    'tax_rates',
    'ops_approvals',
    'project_tasks',
    'project_timesheets',
    'warehouses',
    'stock_movements',
    'stock_balances',
    'quotations',
    'payments_received',
    'chart_of_accounts',
    'expenses',
    'projects',
    'report_snapshots',
    'departments',
    'attendance',
    'leave_requests'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || '_tenant_isolation') then
      execute format(
        'create policy %I on %I for all using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id())',
        t || '_tenant_isolation',
        t
      );
    end if;
  end loop;
end
$$;

/* =========================================================================
 * 10. Seed sequences + default masters for demo tenants
 * ========================================================================= */

insert into document_sequences (tenant_id, module_code, prefix, next_number)
select t.id, s.module_code, s.prefix, 1
from tenants t
cross join (values
  ('lead', 'LEAD'),
  ('customer', 'CUST'),
  ('deal', 'DEAL'),
  ('quotation', 'QUO'),
  ('sales_order', 'SO'),
  ('invoice', 'INV'),
  ('payment', 'PAY'),
  ('sales_return', 'SR'),
  ('delivery', 'DN'),
  ('credit_note', 'CN'),
  ('debit_note', 'DNTE'),
  ('supplier', 'SUP'),
  ('purchase_order', 'PO'),
  ('goods_receipt', 'GRN'),
  ('vendor_bill', 'BILL'),
  ('vendor_payment', 'VPAY'),
  ('requisition', 'PR'),
  ('rfq', 'RFQ'),
  ('campaign', 'CMP'),
  ('ticket', 'TKT'),
  ('transfer', 'TRF'),
  ('adjustment', 'ADJ'),
  ('expense', 'EXP'),
  ('income', 'INC'),
  ('journal', 'JRN'),
  ('project', 'PRJ')
) as s(module_code, prefix)
on conflict (tenant_id, module_code) do nothing;

insert into match_tolerances (tenant_id, qty_pct, amount_pct)
select id, 2, 2 from tenants
on conflict (tenant_id) do nothing;

insert into customer_groups (tenant_id, name, code, price_group)
select id, 'Standard', 'STD', 'standard' from tenants
on conflict (tenant_id, code) do nothing;

insert into price_lists (id, tenant_id, name, currency, is_default)
select gen_random_uuid(), id, 'Standard', 'USD', true
from tenants t
where not exists (select 1 from price_lists p where p.tenant_id = t.id and p.is_default);

-- Demo operational masters for Alpha (database seed — not client hardcoded)
insert into warehouses (id, tenant_id, name, code, location, status)
select v.id, v.tenant_id, v.name, v.code, v.location, v.status
from (values
  ('00000000-0000-0000-0000-000000020001'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, 'Main Warehouse', 'WH-01', 'Dubai', 'active'),
  ('00000000-0000-0000-0000-000000020002'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, 'Warehouse B', 'WH-02', 'Dubai South', 'active')
) as v(id, tenant_id, name, code, location, status)
where not exists (select 1 from warehouses w where w.id = v.id);

insert into product_categories (id, tenant_id, name, code) values
  ('00000000-0000-0000-0000-000000020010', '00000000-0000-0000-0000-000000000101', 'Medical', 'MED'),
  ('00000000-0000-0000-0000-000000020011', '00000000-0000-0000-0000-000000000101', 'Office', 'OFF')
on conflict (id) do nothing;

insert into products (id, tenant_id, sku, name, unit, purchase_price, sale_price, tax_rate, reorder_level, status, category_id)
select v.id, v.tenant_id, v.sku, v.name, v.unit, v.purchase_price, v.sale_price, v.tax_rate, v.reorder_level, v.status, v.category_id
from (values
  ('00000000-0000-0000-0000-000000020101'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, 'MED-GLV-001', 'Nitrile Gloves Box', 'box', 12::numeric, 18::numeric, 5::numeric, 180::numeric, 'active', '00000000-0000-0000-0000-000000020010'::uuid),
  ('00000000-0000-0000-0000-000000020102'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, 'OFF-PRN-110', 'Thermal Receipt Printer', 'pcs', 85::numeric, 120::numeric, 5::numeric, 25::numeric, 'active', '00000000-0000-0000-0000-000000020011'::uuid)
) as v(id, tenant_id, sku, name, unit, purchase_price, sale_price, tax_rate, reorder_level, status, category_id)
where not exists (
  select 1 from products p where p.id = v.id or (p.tenant_id = v.tenant_id and p.sku = v.sku)
);

insert into stock_balances (id, tenant_id, product_id, warehouse_id, quantity_on_hand)
select v.id, v.tenant_id, v.product_id, v.warehouse_id, v.qty
from (values
  ('00000000-0000-0000-0000-000000020201'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, '00000000-0000-0000-0000-000000020101'::uuid, '00000000-0000-0000-0000-000000020001'::uuid, 420::numeric),
  ('00000000-0000-0000-0000-000000020202'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, '00000000-0000-0000-0000-000000020102'::uuid, '00000000-0000-0000-0000-000000020001'::uuid, 18::numeric)
) as v(id, tenant_id, product_id, warehouse_id, qty)
where exists (select 1 from products p where p.id = v.product_id)
  and exists (select 1 from warehouses w where w.id = v.warehouse_id)
  and not exists (
    select 1 from stock_balances s
    where s.id = v.id or (s.tenant_id = v.tenant_id and s.product_id = v.product_id and s.warehouse_id = v.warehouse_id)
  );

insert into customers (id, tenant_id, customer_no, name, type, email, phone, industry, status, credit_limit, credit_terms)
select v.id, v.tenant_id, v.customer_no, v.name, v.type, v.email, v.phone, v.industry, v.status, v.credit_limit, v.credit_terms
from (values
  ('00000000-0000-0000-0000-000000030001'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, 'CUST-00001', 'Eastern Retail Group', 'company', 'billing@easternretail.example', '+971 50 111 2222', 'Retail', 'active', 200000::numeric, 'Net 30'),
  ('00000000-0000-0000-0000-000000030002'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, 'CUST-00002', 'Urban Fashion Mills', 'company', 'accounts@urbanfashion.example', '+92 300 777 8888', 'Manufacturing', 'active', 150000::numeric, 'Net 15')
) as v(id, tenant_id, customer_no, name, type, email, phone, industry, status, credit_limit, credit_terms)
where not exists (
  select 1 from customers c where c.id = v.id or (c.tenant_id = v.tenant_id and c.customer_no = v.customer_no)
);

insert into suppliers (id, tenant_id, supplier_no, name, email, phone, contact_person, status, tax_number, category)
select v.id, v.tenant_id, v.supplier_no, v.name, v.email, v.phone, v.contact_person, v.status, v.tax_number, v.category
from (values
  ('00000000-0000-0000-0000-000000040001'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, 'SUP-00001', 'Prime Medical', 'orders@primemedical.example', '+971 4 111 2222', 'Ali Raza', 'active', 'TRN-1001', 'medical'),
  ('00000000-0000-0000-0000-000000040002'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, 'SUP-00002', 'Orbit Tech', 'sales@orbitech.example', '+971 4 333 4444', 'Sara Khan', 'active', 'TRN-1002', 'it')
) as v(id, tenant_id, supplier_no, name, email, phone, contact_person, status, tax_number, category)
where not exists (
  select 1 from suppliers s where s.id = v.id or (s.tenant_id = v.tenant_id and s.supplier_no = v.supplier_no)
);

insert into chart_of_accounts (id, tenant_id, account_code, account_name, account_type)
select v.id, v.tenant_id, v.account_code, v.account_name, v.account_type
from (values
  ('00000000-0000-0000-0000-000000050001'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, '1000', 'Cash', 'asset'),
  ('00000000-0000-0000-0000-000000050002'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, '1100', 'Accounts Receivable', 'asset'),
  ('00000000-0000-0000-0000-000000050003'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, '2000', 'Accounts Payable', 'liability'),
  ('00000000-0000-0000-0000-000000050004'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, '4000', 'Sales Revenue', 'income'),
  ('00000000-0000-0000-0000-000000050005'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, '5000', 'Operating Expenses', 'expense')
) as v(id, tenant_id, account_code, account_name, account_type)
where not exists (
  select 1 from chart_of_accounts a where a.id = v.id or (a.tenant_id = v.tenant_id and a.account_code = v.account_code)
);

insert into tax_rates (id, tenant_id, name, rate, country, status) values
  ('00000000-0000-0000-0000-000000050101', '00000000-0000-0000-0000-000000000101', 'VAT', 5, 'UAE', 'active')
on conflict (id) do nothing;

insert into salespeople (id, tenant_id, name, email, territory, team, commission_pct, status) values
  ('00000000-0000-0000-0000-000000030101', '00000000-0000-0000-0000-000000000101', 'Bilal Ahmed', 'sales@demo.com', 'UAE', 'Enterprise', 4, 'active')
on conflict (id) do nothing;

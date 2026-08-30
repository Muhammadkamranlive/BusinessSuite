-- Business domain tables for BusinessSuite ERP Cloud
-- Run after database/schema.sql (platform/auth layer)

-- CRM
create table leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  lead_no text not null,
  company_name text not null,
  contact_name text not null,
  email text, phone text, source text, status text not null default 'new',
  priority text not null default 'medium', estimated_value numeric not null default 0,
  assigned_to uuid references user_profiles(id), notes text,
  created_by uuid references user_profiles(id), updated_by uuid references user_profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, lead_no)
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_no text not null, name text not null, type text not null default 'company',
  email text, phone text, tax_number text, industry text,
  billing_address text, shipping_address text, status text not null default 'active',
  created_by uuid references user_profiles(id), updated_by uuid references user_profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, customer_no)
);

create table deals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  deal_no text not null, title text not null,
  customer_id uuid references customers(id), lead_id uuid references leads(id),
  stage text not null default 'prospecting', amount numeric not null default 0,
  probability integer not null default 0, expected_close_date date,
  assigned_to uuid references user_profiles(id), status text not null default 'open',
  created_by uuid references user_profiles(id), updated_by uuid references user_profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, deal_no)
);

-- HRM
create table departments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null, code text not null, description text,
  manager_id uuid references user_profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_no text not null, full_name text not null, email text not null, phone text,
  department_id uuid references departments(id), designation_id uuid,
  employment_type text not null default 'full_time', status text not null default 'active',
  basic_salary numeric not null default 0, joining_date date not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, employee_no)
);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  attendance_date date not null, check_in timestamptz, check_out timestamptz,
  status text not null default 'present', working_hours numeric not null default 0,
  created_by uuid references user_profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  leave_type text not null, start_date date not null, end_date date not null,
  total_days numeric not null, reason text, status text not null default 'pending',
  approved_by uuid references user_profiles(id), approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

-- Inventory
create table products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  sku text not null, name text not null, unit text not null default 'pcs',
  purchase_price numeric not null default 0, sale_price numeric not null default 0,
  tax_rate numeric not null default 0, reorder_level numeric not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, sku)
);

create table warehouses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null, code text not null, location text, status text not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  product_id uuid not null references products(id), warehouse_id uuid not null references warehouses(id),
  movement_type text not null, reference_type text, reference_id uuid,
  quantity numeric not null, unit_cost numeric not null default 0,
  movement_date timestamptz not null default now(), notes text,
  created_by uuid references user_profiles(id),
  created_at timestamptz not null default now(), is_active boolean not null default true
);

create table stock_balances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  product_id uuid not null references products(id), warehouse_id uuid not null references warehouses(id),
  quantity_on_hand numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (tenant_id, product_id, warehouse_id)
);

-- Sales
create table invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  invoice_no text not null, customer_id uuid references customers(id),
  invoice_date date not null, due_date date not null,
  status text not null default 'draft',
  subtotal numeric not null default 0, tax_amount numeric not null default 0,
  total_amount numeric not null default 0, paid_amount numeric not null default 0,
  balance_due numeric not null default 0,
  created_by uuid references user_profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, invoice_no)
);

create table quotations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  quotation_no text not null, customer_id uuid references customers(id),
  quotation_date date not null, valid_until date not null,
  status text not null default 'draft', total_amount numeric not null default 0,
  created_by uuid references user_profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, quotation_no)
);

create table payments_received (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  payment_no text not null, customer_id uuid references customers(id),
  invoice_id uuid references invoices(id), payment_date date not null,
  amount numeric not null, payment_method text not null,
  created_by uuid references user_profiles(id),
  created_at timestamptz not null default now(), is_active boolean not null default true,
  unique (tenant_id, payment_no)
);

-- Purchase
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  supplier_no text not null, name text not null, email text, phone text,
  contact_person text, status text not null default 'active',
  created_by uuid references user_profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, supplier_no)
);

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  purchase_order_no text not null, supplier_id uuid not null references suppliers(id),
  order_date date not null, expected_delivery_date date,
  status text not null default 'draft', total_amount numeric not null default 0,
  created_by uuid references user_profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, purchase_order_no)
);

-- Finance
create table chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  account_code text not null, account_name text not null,
  account_type text not null, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tenant_id, account_code)
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  expense_no text not null, expense_date date not null,
  account_id uuid references chart_of_accounts(id), amount numeric not null,
  payment_method text, description text,
  created_by uuid references user_profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, expense_no)
);

-- Projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  project_no text not null, name text not null,
  customer_id uuid references customers(id),
  start_date date, end_date date, status text not null default 'planned',
  budget numeric not null default 0, description text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, project_no)
);

-- BI
create table report_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  snapshot_name text not null, module text not null,
  period_start date, period_end date, data jsonb not null default '{}',
  created_by uuid references user_profiles(id),
  created_at timestamptz not null default now()
);

-- Indexes for tenant isolation and performance
create index idx_leads_tenant on leads(tenant_id, status);
create index idx_customers_tenant on customers(tenant_id);
create index idx_deals_tenant on deals(tenant_id, stage);
create index idx_employees_tenant on employees(tenant_id);
create index idx_products_tenant on products(tenant_id);
create index idx_invoices_tenant on invoices(tenant_id, status);
create index idx_purchase_orders_tenant on purchase_orders(tenant_id);

-- Enable RLS on all business tables
alter table leads enable row level security;
alter table customers enable row level security;
alter table deals enable row level security;
alter table departments enable row level security;
alter table employees enable row level security;
alter table attendance enable row level security;
alter table leave_requests enable row level security;
alter table products enable row level security;
alter table warehouses enable row level security;
alter table stock_movements enable row level security;
alter table stock_balances enable row level security;
alter table invoices enable row level security;
alter table quotations enable row level security;
alter table payments_received enable row level security;
alter table suppliers enable row level security;
alter table purchase_orders enable row level security;
alter table chart_of_accounts enable row level security;
alter table expenses enable row level security;
alter table projects enable row level security;
alter table report_snapshots enable row level security;

-- Tenant isolation policies (template for all business tables)
create policy leads_tenant_isolation on leads for all using (tenant_id = current_tenant_id());
create policy customers_tenant_isolation on customers for all using (tenant_id = current_tenant_id());
create policy deals_tenant_isolation on deals for all using (tenant_id = current_tenant_id());
create policy employees_tenant_isolation on employees for all using (tenant_id = current_tenant_id());
create policy products_tenant_isolation on products for all using (tenant_id = current_tenant_id());
create policy invoices_tenant_isolation on invoices for all using (tenant_id = current_tenant_id());
create policy suppliers_tenant_isolation on suppliers for all using (tenant_id = current_tenant_id());
create policy purchase_orders_tenant_isolation on purchase_orders for all using (tenant_id = current_tenant_id());

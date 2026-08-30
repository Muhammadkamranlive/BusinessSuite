create extension if not exists "pgcrypto";

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begina
  new.updated_at = now();
  return new;
end;
$$;

create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  legal_name text,
  industry text,
  email text,
  phone text,
  website text,
  country text,
  city text,
  address text,
  logo_url text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  tenant_id uuid not null references tenants(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  avatar_url text,
  job_title text,
  department_id uuid,
  status text not null default 'active' check (status in ('active', 'invited', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  name text not null,
  description text,
  is_system_role boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  module text not null,
  description text,
  created_at timestamptz not null default now()
);

create table user_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_profile_id uuid not null references user_profiles(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tenant_id, user_profile_id, role_id)
);

create table role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (role_id, permission_id)
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete set null,
  user_profile_id uuid references user_profiles(id) on delete set null,
  module text not null,
  action text not null check (action in ('create', 'update', 'delete', 'login', 'logout', 'export', 'approve', 'reject', 'post', 'cancel')),
  entity_name text,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_profile_id uuid references user_profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('info', 'warning', 'success', 'error')),
  is_read boolean not null default false,
  target_module text,
  target_id uuid,
  created_at timestamptz not null default now()
);

create index idx_user_profiles_tenant on user_profiles(tenant_id);
create index idx_roles_tenant on roles(tenant_id);
create index idx_user_roles_tenant_user on user_roles(tenant_id, user_profile_id);
create index idx_audit_logs_tenant_created_at on audit_logs(tenant_id, created_at desc);
create index idx_notifications_user_read on notifications(user_profile_id, is_read, created_at desc);

create trigger tenants_set_updated_at before update on tenants
for each row execute function set_updated_at();

create trigger user_profiles_set_updated_at before update on user_profiles
for each row execute function set_updated_at();

create trigger roles_set_updated_at before update on roles
for each row execute function set_updated_at();

alter table tenants enable row level security;
alter table user_profiles enable row level security;
alter table roles enable row level security;
alter table permissions enable row level security;
alter table user_roles enable row level security;
alter table role_permissions enable row level security;
alter table audit_logs enable row level security;
alter table notifications enable row level security;

create or replace function current_user_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from user_profiles
  where auth_user_id = auth.uid()
  limit 1
$$;

create or replace function current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from user_profiles
  where auth_user_id = auth.uid()
  limit 1
$$;

create or replace function has_permission(permission_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from user_roles ur
    join role_permissions rp on rp.role_id = ur.role_id
    join permissions p on p.id = rp.permission_id
    where ur.user_profile_id = current_user_profile_id()
      and p.code = permission_code
  )
$$;

create policy tenants_select_own on tenants
for select using (id = current_tenant_id());

create policy user_profiles_select_own_tenant on user_profiles
for select using (tenant_id = current_tenant_id());

create policy user_profiles_update_self on user_profiles
for update using (id = current_user_profile_id())
with check (id = current_user_profile_id());

create policy roles_select_own_tenant_or_system on roles
for select using (tenant_id = current_tenant_id() or tenant_id is null);

create policy permissions_select_authenticated on permissions
for select to authenticated using (true);

create policy user_roles_select_own_tenant on user_roles
for select using (tenant_id = current_tenant_id());

create policy role_permissions_select_for_visible_roles on role_permissions
for select using (
  exists (
    select 1
    from roles r
    where r.id = role_permissions.role_id
      and (r.tenant_id = current_tenant_id() or r.tenant_id is null)
  )
);

create policy audit_logs_select_own_tenant on audit_logs
for select using (tenant_id = current_tenant_id());

create policy audit_logs_insert_own_tenant on audit_logs
for insert with check (tenant_id = current_tenant_id());

create policy notifications_select_own_user on notifications
for select using (
  tenant_id = current_tenant_id()
  and (user_profile_id is null or user_profile_id = current_user_profile_id())
);

create policy notifications_update_own_user on notifications
for update using (user_profile_id = current_user_profile_id())
with check (user_profile_id = current_user_profile_id());
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
insert into tenants (id, name, legal_name, industry, email, phone, website, country, city, address, status) values
  ('00000000-0000-0000-0000-000000000101', 'Alpha Trading LLC', 'Alpha Trading LLC', 'Wholesale distribution', 'info@alphatrading.example', '+971 55 100 1000', 'https://alpha.example', 'UAE', 'Dubai', 'Business Bay, Dubai', 'active'),
  ('00000000-0000-0000-0000-000000000102', 'Medix Pharmacy Supplies', 'Medix Pharmacy Supplies Pvt Ltd', 'Healthcare supply', 'hello@medix.example', '+92 300 200 2000', 'https://medix.example', 'Pakistan', 'Karachi', 'Shahrah-e-Faisal, Karachi', 'active'),
  ('00000000-0000-0000-0000-000000000103', 'AutoParts Distribution', 'AutoParts Distribution Co.', 'Automotive parts', 'contact@autoparts.example', '+966 50 300 3000', 'https://autoparts.example', 'Saudi Arabia', 'Jeddah', 'Industrial Area, Jeddah', 'active')
on conflict (id) do update set
  name = excluded.name,
  legal_name = excluded.legal_name,
  industry = excluded.industry,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  country = excluded.country,
  city = excluded.city,
  address = excluded.address,
  status = excluded.status;

insert into user_profiles (id, tenant_id, full_name, email, phone, job_title, status) values
  ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000101', 'Ayesha Khan', 'admin@demo.com', '+971 55 100 1001', 'Super Admin', 'active'),
  ('00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000000101', 'Omar Farooq', 'manager@demo.com', '+971 55 100 1002', 'Company Admin', 'active'),
  ('00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000000101', 'Sana Malik', 'hr@demo.com', '+971 55 100 1003', 'HR Manager', 'active'),
  ('00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000000101', 'Bilal Ahmed', 'sales@demo.com', '+971 55 100 1004', 'Sales Manager', 'active'),
  ('00000000-0000-0000-0000-000000001005', '00000000-0000-0000-0000-000000000101', 'Nadia Raza', 'warehouse@demo.com', '+971 55 100 1005', 'Warehouse Manager', 'active'),
  ('00000000-0000-0000-0000-000000001006', '00000000-0000-0000-0000-000000000101', 'Mariam Ali', 'finance@demo.com', '+971 55 100 1006', 'Finance Manager', 'active'),
  ('00000000-0000-0000-0000-000000001007', '00000000-0000-0000-0000-000000000101', 'Imran Shah', 'viewer@demo.com', '+971 55 100 1007', 'Viewer', 'active')
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone,
  job_title = excluded.job_title,
  status = excluded.status;

insert into roles (id, tenant_id, name, description, is_system_role) values
  ('00000000-0000-0000-0000-000000002001', null, 'Super Admin', 'Platform-level access across tenants', true),
  ('00000000-0000-0000-0000-000000002002', '00000000-0000-0000-0000-000000000101', 'Company Admin', 'Full access inside one tenant', true),
  ('00000000-0000-0000-0000-000000002003', '00000000-0000-0000-0000-000000000101', 'HR Manager', 'HRM, attendance, leave, payroll, and HR reports', true),
  ('00000000-0000-0000-0000-000000002004', '00000000-0000-0000-0000-000000000101', 'Sales Manager', 'CRM, quotations, orders, invoices, and payments', true),
  ('00000000-0000-0000-0000-000000002005', '00000000-0000-0000-0000-000000000101', 'Warehouse Manager', 'Inventory, stock movement, and purchasing visibility', true),
  ('00000000-0000-0000-0000-000000002006', '00000000-0000-0000-0000-000000000101', 'Finance Manager', 'Finance, reports, invoices, and vendor bill visibility', true),
  ('00000000-0000-0000-0000-000000002007', '00000000-0000-0000-0000-000000000101', 'Viewer', 'Read-only reports and dashboard access', true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  is_system_role = excluded.is_system_role;

insert into permissions (code, module, description) values
  ('dashboard.view', 'dashboard', 'View executive dashboard'),
  ('crm.leads.view', 'crm', 'View leads'),
  ('crm.leads.create', 'crm', 'Create leads'),
  ('crm.leads.update', 'crm', 'Update leads'),
  ('crm.leads.delete', 'crm', 'Delete leads'),
  ('crm.customers.view', 'crm', 'View customers'),
  ('crm.deals.view', 'crm', 'View deal pipeline'),
  ('crm.activities.view', 'crm', 'View CRM activities'),
  ('sales.quotations.view', 'sales', 'View quotations'),
  ('sales.invoices.view', 'sales', 'View invoices'),
  ('sales.invoices.create', 'sales', 'Create invoices'),
  ('sales.invoices.update', 'sales', 'Update invoices'),
  ('sales.invoices.delete', 'sales', 'Delete invoices'),
  ('sales.payments.view', 'sales', 'View payments received'),
  ('purchase.suppliers.view', 'purchase', 'View suppliers'),
  ('purchase.orders.view', 'purchase', 'View purchase orders'),
  ('purchase.receipts.view', 'purchase', 'View goods receipts'),
  ('inventory.products.view', 'inventory', 'View products'),
  ('inventory.products.create', 'inventory', 'Create products'),
  ('inventory.stock_movement.create', 'inventory', 'Create stock movement'),
  ('inventory.stock_movements.view', 'inventory', 'View stock movement ledger'),
  ('hrm.employees.view', 'hrm', 'View employees'),
  ('hrm.employees.create', 'hrm', 'Create employees'),
  ('hrm.employees.update', 'hrm', 'Update employees'),
  ('hrm.employees.delete', 'hrm', 'Delete employees'),
  ('hrm.attendance.view', 'hrm', 'View attendance'),
  ('hrm.leave.view', 'hrm', 'View leave requests'),
  ('hrm.payroll.view', 'hrm', 'View payroll'),
  ('finance.accounts.view', 'finance', 'View chart of accounts'),
  ('finance.expenses.view', 'finance', 'View expenses'),
  ('finance.income.view', 'finance', 'View income'),
  ('finance.journals.view', 'finance', 'View journal entries'),
  ('finance.reports.view', 'finance', 'View finance reports'),
  ('projects.projects.view', 'projects', 'View projects'),
  ('projects.tasks.view', 'projects', 'View tasks'),
  ('projects.timesheets.view', 'projects', 'View timesheets'),
  ('reports.view', 'reports', 'View reports and BI dashboards'),
  ('admin.users.manage', 'admin', 'Manage users'),
  ('admin.roles.manage', 'admin', 'Manage roles and permissions'),
  ('admin.tenants.manage', 'admin', 'Manage companies and tenants'),
  ('admin.audit.view', 'admin', 'View audit logs'),
  ('admin.notifications.view', 'admin', 'View notifications'),
  ('admin.settings.manage', 'admin', 'Manage system settings')
on conflict (code) do update set
  module = excluded.module,
  description = excluded.description;

insert into user_roles (tenant_id, user_profile_id, role_id) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000002001'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000002002'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000002003'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000002004'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001005', '00000000-0000-0000-0000-000000002005'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001006', '00000000-0000-0000-0000-000000002006'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001007', '00000000-0000-0000-0000-000000002007')
on conflict (tenant_id, user_profile_id, role_id) do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
cross join permissions p
where r.name in ('Super Admin', 'Company Admin')
on conflict (role_id, permission_id) do nothing;

insert into role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000002003', id
from permissions
where code in ('dashboard.view', 'hrm.employees.view', 'hrm.employees.create', 'hrm.employees.update', 'hrm.attendance.view', 'hrm.leave.view', 'hrm.payroll.view', 'reports.view')
on conflict (role_id, permission_id) do nothing;

insert into role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000002004', id
from permissions
where code in ('dashboard.view', 'crm.leads.view', 'crm.leads.create', 'crm.leads.update', 'crm.customers.view', 'crm.deals.view', 'crm.activities.view', 'sales.quotations.view', 'sales.invoices.view', 'sales.invoices.create', 'sales.invoices.update', 'sales.payments.view', 'reports.view')
on conflict (role_id, permission_id) do nothing;

insert into role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000002005', id
from permissions
where code in ('dashboard.view', 'inventory.products.view', 'inventory.products.create', 'inventory.stock_movement.create', 'inventory.stock_movements.view', 'purchase.suppliers.view', 'purchase.orders.view', 'purchase.receipts.view', 'reports.view')
on conflict (role_id, permission_id) do nothing;

insert into role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000002006', id
from permissions
where code in ('dashboard.view', 'finance.accounts.view', 'finance.expenses.view', 'finance.income.view', 'finance.journals.view', 'finance.reports.view', 'sales.invoices.view', 'purchase.orders.view', 'reports.view')
on conflict (role_id, permission_id) do nothing;

insert into role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000002007', id
from permissions
where code in ('dashboard.view', 'reports.view')
on conflict (role_id, permission_id) do nothing;

insert into audit_logs (id, tenant_id, user_profile_id, module, action, entity_name, entity_id, new_data, ip_address, created_at) values
  ('00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001001', 'admin', 'login', 'user_profiles', '00000000-0000-0000-0000-000000001001', '{"email":"admin@demo.com"}', '127.0.0.1', '2026-06-30 09:00+00'),
  ('00000000-0000-0000-0000-000000003002', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001002', 'admin', 'update', 'roles', '00000000-0000-0000-0000-000000002004', '{"permission":"sales.invoices.create"}', '127.0.0.1', '2026-06-30 12:40+00')
on conflict (id) do update set
  new_data = excluded.new_data,
  created_at = excluded.created_at;

insert into notifications (id, tenant_id, user_profile_id, title, message, type, target_module, created_at) values
  ('00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001004', 'Follow-ups due', 'Nine high-priority CRM follow-ups are due today.', 'warning', 'crm', '2026-06-30 10:00+00'),
  ('00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001005', 'Low stock alert', 'Brake Pad Set is below reorder level.', 'warning', 'inventory', '2026-06-30 11:00+00'),
  ('00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000000101', null, 'Phase 2 seed ready', 'Core tenants, users, roles, permissions, audit logs, and notifications are seeded.', 'success', 'admin', '2026-06-30 12:00+00')
on conflict (id) do update set
  title = excluded.title,
  message = excluded.message,
  type = excluded.type,
  target_module = excluded.target_module,
  created_at = excluded.created_at;

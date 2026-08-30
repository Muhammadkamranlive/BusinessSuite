-- PelicanHRM parity schema for BusinessSuite ERP Cloud (multi-tenant HRM)
-- Run after 20260804000002_business_schema.sql
-- Style/pattern reference: 20260804000002_business_schema.sql (tenant_id + RLS tenant_isolation policies)
--
-- Strategy:
--   1. ALTER existing HRM tables (departments, employees, attendance, leave_requests) with
--      PelicanHRM-parity columns instead of dropping/recreating them.
--   2. Backfill the tenant_isolation RLS policies that were missing for departments/attendance/
--      leave_requests in the original business schema.
--   3. Create NEW tables prefixed `hrm_` for every entity that has no existing counterpart, to
--      avoid any naming collision with existing business tables.
--   4. Every new table carries tenant_id + RLS tenant isolation, matching the existing pattern.

/* =========================================================================
 * 1. Extend existing HRM tables (no data loss - additive columns only)
 * ========================================================================= */

alter table employees
  add column if not exists father_name text,
  add column if not exists cnic text,
  add column if not exists bank_name text,
  add column if not exists bank_account text,
  add column if not exists shift_id uuid,
  add column if not exists resignation_date date,
  add column if not exists emergency_contact text,
  add column if not exists address text,
  add column if not exists machine_id text;

alter table attendance
  add column if not exists notes text;

alter table leave_requests
  add column if not exists leave_type_id uuid,
  add column if not exists manager_status text not null default 'pending',
  add column if not exists hr_status text not null default 'pending';

-- Backfill tenant isolation RLS policies that were missing for these tables.
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'departments_tenant_isolation') then
    create policy departments_tenant_isolation on departments for all using (tenant_id = current_tenant_id());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'attendance_tenant_isolation') then
    create policy attendance_tenant_isolation on attendance for all using (tenant_id = current_tenant_id());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'leave_requests_tenant_isolation') then
    create policy leave_requests_tenant_isolation on leave_requests for all using (tenant_id = current_tenant_id());
  end if;
end
$$;

/* =========================================================================
 * 2. New PelicanHRM tables (hrm_ prefixed to avoid any naming collision)
 * ========================================================================= */

create table hrm_designations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, code)
);

alter table employees
  add constraint employees_designation_id_fkey foreign key (designation_id) references hrm_designations(id);

create table hrm_shifts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  start_time time not null,
  end_time time not null,
  grace_minutes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

alter table employees
  add constraint employees_shift_id_fkey foreign key (shift_id) references hrm_shifts(id);

create table hrm_holidays (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  date date not null,
  type text not null default 'company',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table hrm_company_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  legal_name text not null,
  ntn text,
  address text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id)
);

create table hrm_candidates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  position text not null,
  stage text not null default 'applied',
  source text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table hrm_onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  title text not null,
  status text not null default 'pending',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table hrm_timesheets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  work_date date not null,
  hours numeric not null default 0,
  project text,
  notes text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table hrm_leave_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  code text not null,
  days_per_year numeric not null default 0,
  paid boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, code)
);

alter table leave_requests
  add constraint leave_requests_leave_type_id_fkey foreign key (leave_type_id) references hrm_leave_types(id);

create table hrm_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  tag_code text not null,
  category text not null,
  assigned_employee_id uuid references employees(id),
  status text not null default 'available',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, tag_code)
);

create table hrm_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  category text not null,
  employee_id uuid references employees(id),
  file_name text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table hrm_payroll_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  period text not null,
  status text not null default 'draft',
  total_gross numeric not null default 0,
  total_net numeric not null default 0,
  employee_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, period)
);

create table hrm_payroll_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  run_id uuid not null references hrm_payroll_runs(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  basic numeric not null default 0,
  allowances numeric not null default 0,
  deductions numeric not null default 0,
  pf numeric not null default 0,
  net numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table hrm_pf_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  percent numeric not null default 0,
  effective_from date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table hrm_pf_contributions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  period text not null,
  employee_amount numeric not null default 0,
  employer_amount numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table hrm_eobi_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  amount numeric not null default 0,
  effective_from date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table hrm_loans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  amount numeric not null default 0,
  repayment_amount numeric not null default 0,
  start_date date not null,
  reason text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table hrm_disciplinary_actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  action_date date not null,
  reason text not null,
  severity text not null default 'warning',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table hrm_notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table hrm_payment_txns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  amount numeric not null default 0,
  method text not null,
  reference text,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table hrm_workflow_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  provider text not null default 'other',
  enabled boolean not null default false,
  config_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, name)
);

create table hrm_security_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  mfa_required boolean not null default false,
  session_hours integer not null default 24,
  password_min_length integer not null default 8,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id)
);

/* =========================================================================
 * 3. Indexes for tenant isolation and common lookups
 * ========================================================================= */

create index idx_hrm_designations_tenant on hrm_designations(tenant_id);
create index idx_hrm_shifts_tenant on hrm_shifts(tenant_id);
create index idx_hrm_holidays_tenant on hrm_holidays(tenant_id, date);
create index idx_hrm_company_profiles_tenant on hrm_company_profiles(tenant_id);
create index idx_hrm_candidates_tenant on hrm_candidates(tenant_id, stage);
create index idx_hrm_onboarding_tasks_tenant on hrm_onboarding_tasks(tenant_id, employee_id);
create index idx_hrm_timesheets_tenant on hrm_timesheets(tenant_id, employee_id, work_date);
create index idx_hrm_leave_types_tenant on hrm_leave_types(tenant_id);
create index idx_hrm_assets_tenant on hrm_assets(tenant_id, status);
create index idx_hrm_documents_tenant on hrm_documents(tenant_id, employee_id);
create index idx_hrm_payroll_runs_tenant on hrm_payroll_runs(tenant_id, period);
create index idx_hrm_payroll_items_tenant on hrm_payroll_items(tenant_id, run_id);
create index idx_hrm_pf_settings_tenant on hrm_pf_settings(tenant_id, effective_from);
create index idx_hrm_pf_contributions_tenant on hrm_pf_contributions(tenant_id, employee_id, period);
create index idx_hrm_eobi_settings_tenant on hrm_eobi_settings(tenant_id, effective_from);
create index idx_hrm_loans_tenant on hrm_loans(tenant_id, employee_id);
create index idx_hrm_disciplinary_actions_tenant on hrm_disciplinary_actions(tenant_id, employee_id);
create index idx_hrm_notifications_tenant on hrm_notifications(tenant_id, read);
create index idx_hrm_payment_txns_tenant on hrm_payment_txns(tenant_id, status);
create index idx_hrm_workflow_integrations_tenant on hrm_workflow_integrations(tenant_id);
create index idx_hrm_security_policies_tenant on hrm_security_policies(tenant_id);

/* =========================================================================
 * 4. Row level security + tenant isolation policies (existing pattern)
 * ========================================================================= */

alter table hrm_designations enable row level security;
alter table hrm_shifts enable row level security;
alter table hrm_holidays enable row level security;
alter table hrm_company_profiles enable row level security;
alter table hrm_candidates enable row level security;
alter table hrm_onboarding_tasks enable row level security;
alter table hrm_timesheets enable row level security;
alter table hrm_leave_types enable row level security;
alter table hrm_assets enable row level security;
alter table hrm_documents enable row level security;
alter table hrm_payroll_runs enable row level security;
alter table hrm_payroll_items enable row level security;
alter table hrm_pf_settings enable row level security;
alter table hrm_pf_contributions enable row level security;
alter table hrm_eobi_settings enable row level security;
alter table hrm_loans enable row level security;
alter table hrm_disciplinary_actions enable row level security;
alter table hrm_notifications enable row level security;
alter table hrm_payment_txns enable row level security;
alter table hrm_workflow_integrations enable row level security;
alter table hrm_security_policies enable row level security;

create policy hrm_designations_tenant_isolation on hrm_designations for all using (tenant_id = current_tenant_id());
create policy hrm_shifts_tenant_isolation on hrm_shifts for all using (tenant_id = current_tenant_id());
create policy hrm_holidays_tenant_isolation on hrm_holidays for all using (tenant_id = current_tenant_id());
create policy hrm_company_profiles_tenant_isolation on hrm_company_profiles for all using (tenant_id = current_tenant_id());
create policy hrm_candidates_tenant_isolation on hrm_candidates for all using (tenant_id = current_tenant_id());
create policy hrm_onboarding_tasks_tenant_isolation on hrm_onboarding_tasks for all using (tenant_id = current_tenant_id());
create policy hrm_timesheets_tenant_isolation on hrm_timesheets for all using (tenant_id = current_tenant_id());
create policy hrm_leave_types_tenant_isolation on hrm_leave_types for all using (tenant_id = current_tenant_id());
create policy hrm_assets_tenant_isolation on hrm_assets for all using (tenant_id = current_tenant_id());
create policy hrm_documents_tenant_isolation on hrm_documents for all using (tenant_id = current_tenant_id());
create policy hrm_payroll_runs_tenant_isolation on hrm_payroll_runs for all using (tenant_id = current_tenant_id());
create policy hrm_payroll_items_tenant_isolation on hrm_payroll_items for all using (tenant_id = current_tenant_id());
create policy hrm_pf_settings_tenant_isolation on hrm_pf_settings for all using (tenant_id = current_tenant_id());
create policy hrm_pf_contributions_tenant_isolation on hrm_pf_contributions for all using (tenant_id = current_tenant_id());
create policy hrm_eobi_settings_tenant_isolation on hrm_eobi_settings for all using (tenant_id = current_tenant_id());
create policy hrm_loans_tenant_isolation on hrm_loans for all using (tenant_id = current_tenant_id());
create policy hrm_disciplinary_actions_tenant_isolation on hrm_disciplinary_actions for all using (tenant_id = current_tenant_id());
create policy hrm_notifications_tenant_isolation on hrm_notifications for all using (tenant_id = current_tenant_id());
create policy hrm_payment_txns_tenant_isolation on hrm_payment_txns for all using (tenant_id = current_tenant_id());
create policy hrm_workflow_integrations_tenant_isolation on hrm_workflow_integrations for all using (tenant_id = current_tenant_id());
create policy hrm_security_policies_tenant_isolation on hrm_security_policies for all using (tenant_id = current_tenant_id());

create index idx_employees_designation on employees(designation_id);
create index idx_employees_shift on employees(shift_id);
create index idx_leave_requests_leave_type on leave_requests(leave_type_id);

-- Workday-shaped HRM (jobs, positions, inbox, benefits, talent, leave balances)
-- UI stores still hydrate from localStorage; this schema is the cloud source of truth
-- when NEXT_PUBLIC_HRM_USE_SUPABASE=true. Additive only — no drops.

/* =========================================================================
 * 1. Employee + payroll columns added after PelicanHRM (pay / org / OT)
 * ========================================================================= */

alter table employees
  add column if not exists housing_allowance numeric,
  add column if not exists transport_allowance numeric,
  add column if not exists medical_allowance numeric,
  add column if not exists other_allowance numeric,
  add column if not exists manager_id uuid references employees(id),
  add column if not exists location text,
  add column if not exists business_title text,
  add column if not exists tax_status text,
  add column if not exists tax_ntn text,
  add column if not exists pf_enrolled boolean not null default true,
  add column if not exists eobi_enrolled boolean not null default true;

create index if not exists idx_employees_manager on employees(manager_id);

alter table hrm_payroll_items
  add column if not exists tax numeric,
  add column if not exists eobi numeric,
  add column if not exists housing numeric,
  add column if not exists transport numeric,
  add column if not exists medical numeric,
  add column if not exists overtime_hours numeric,
  add column if not exists overtime_pay numeric,
  add column if not exists benefits numeric;

/* =========================================================================
 * 2. Org catalog
 * ========================================================================= */

create table if not exists hrm_work_locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  code text not null,
  city text,
  country text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, code)
);

create table if not exists hrm_cost_centers (
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

create table if not exists hrm_job_families (
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

create table if not exists hrm_pay_grades (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  code text not null,
  min_salary numeric not null default 0,
  mid_salary numeric not null default 0,
  max_salary numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, code)
);

create table if not exists hrm_job_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  family_id uuid not null references hrm_job_families(id) on delete cascade,
  title text not null,
  code text not null,
  job_level text not null,
  description text,
  pay_grade_id uuid references hrm_pay_grades(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, code)
);

create table if not exists hrm_positions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  code text not null,
  title text not null,
  job_profile_id uuid not null references hrm_job_profiles(id),
  department_id uuid not null references departments(id),
  location_id uuid references hrm_work_locations(id),
  cost_center_id uuid references hrm_cost_centers(id),
  worker_id uuid references employees(id),
  status text not null default 'open',
  fte numeric not null default 1,
  headcount integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, code)
);

create table if not exists hrm_worker_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  preferred_name text,
  legal_name text,
  pronouns text,
  worker_type text not null default 'employee',
  position_id uuid references hrm_positions(id),
  location_id uuid references hrm_work_locations(id),
  cost_center_id uuid references hrm_cost_centers(id),
  matrix_manager_id uuid references employees(id),
  pay_grade_id uuid references hrm_pay_grades(id),
  probation_end date,
  contract_end date,
  confirmation_date date,
  notice_days integer,
  overtime_eligible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, employee_id)
);

/* =========================================================================
 * 3. Worker personal / career / identity
 * ========================================================================= */

create table if not exists hrm_worker_dependents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  full_name text not null,
  relation text not null,
  date_of_birth date,
  national_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists hrm_emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  full_name text not null,
  relation text not null,
  phone text not null,
  email text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists hrm_worker_education (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  school text not null,
  degree text not null,
  field text,
  year text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists hrm_worker_experience (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  company text not null,
  title text not null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists hrm_worker_certifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  name text not null,
  issuer text,
  expiry date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists hrm_identity_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  kind text not null,
  number text not null,
  country text,
  issued_on date,
  expiry date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists hrm_payment_elections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  bank_name text not null,
  bank_account text not null,
  percent numeric not null default 100,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists hrm_costing_allocations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  cost_center_id uuid not null references hrm_cost_centers(id),
  percent numeric not null default 100,
  effective_from date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

/* =========================================================================
 * 4. Benefits, leave balances, talent
 * ========================================================================= */

create table if not exists hrm_benefit_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  category text not null,
  employee_cost numeric not null default 0,
  employer_cost numeric not null default 0,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists hrm_benefit_enrollments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  plan_id uuid not null references hrm_benefit_plans(id) on delete cascade,
  coverage text not null default 'self',
  status text not null default 'enrolled',
  effective_from date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists hrm_leave_balances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  leave_type_id uuid not null references hrm_leave_types(id) on delete cascade,
  year integer not null,
  entitled numeric not null default 0,
  used numeric not null default 0,
  pending numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id, employee_id, leave_type_id, year)
);

create table if not exists hrm_goals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  title text not null,
  period text not null,
  progress numeric not null default 0,
  status text not null default 'not_started',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists hrm_performance_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  cycle text not null,
  rating text,
  comments text,
  status text not null default 'draft',
  reviewer_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

/* =========================================================================
 * 5. Business processes
 * ========================================================================= */

create table if not exists hrm_job_changes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  type text not null,
  effective_date date not null,
  status text not null default 'pending',
  reason text not null,
  from_department_id uuid references departments(id),
  to_department_id uuid references departments(id),
  from_manager_id uuid references employees(id),
  to_manager_id uuid references employees(id),
  from_designation_id uuid references hrm_designations(id),
  to_designation_id uuid references hrm_designations(id),
  from_location_id uuid references hrm_work_locations(id),
  to_location_id uuid references hrm_work_locations(id),
  from_salary numeric,
  to_salary numeric,
  requested_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists hrm_inbox_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  status text not null default 'pending',
  assignee_email text not null,
  subject_employee_id uuid references employees(id),
  ref_id uuid not null,
  requested_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists hrm_personal_data_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  status text not null default 'pending',
  phone text,
  address text,
  emergency_name text,
  emergency_phone text,
  requested_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists hrm_job_requisitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  department_id uuid not null references departments(id),
  position_id uuid references hrm_positions(id),
  location_id uuid references hrm_work_locations(id),
  openings integer not null default 1,
  status text not null default 'draft',
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists hrm_offboarding_tasks (
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

/* =========================================================================
 * 6. Indexes
 * ========================================================================= */

create index if not exists idx_hrm_work_locations_tenant on hrm_work_locations(tenant_id);
create index if not exists idx_hrm_cost_centers_tenant on hrm_cost_centers(tenant_id);
create index if not exists idx_hrm_job_families_tenant on hrm_job_families(tenant_id);
create index if not exists idx_hrm_pay_grades_tenant on hrm_pay_grades(tenant_id);
create index if not exists idx_hrm_job_profiles_tenant on hrm_job_profiles(tenant_id, family_id);
create index if not exists idx_hrm_positions_tenant on hrm_positions(tenant_id, status);
create index if not exists idx_hrm_worker_profiles_employee on hrm_worker_profiles(tenant_id, employee_id);
create index if not exists idx_hrm_worker_dependents_employee on hrm_worker_dependents(tenant_id, employee_id);
create index if not exists idx_hrm_emergency_contacts_employee on hrm_emergency_contacts(tenant_id, employee_id);
create index if not exists idx_hrm_worker_education_employee on hrm_worker_education(tenant_id, employee_id);
create index if not exists idx_hrm_worker_experience_employee on hrm_worker_experience(tenant_id, employee_id);
create index if not exists idx_hrm_worker_certifications_employee on hrm_worker_certifications(tenant_id, employee_id);
create index if not exists idx_hrm_identity_documents_employee on hrm_identity_documents(tenant_id, employee_id);
create index if not exists idx_hrm_identity_documents_expiry on hrm_identity_documents(tenant_id, expiry);
create index if not exists idx_hrm_payment_elections_employee on hrm_payment_elections(tenant_id, employee_id);
create index if not exists idx_hrm_costing_allocations_employee on hrm_costing_allocations(tenant_id, employee_id);
create index if not exists idx_hrm_benefit_plans_tenant on hrm_benefit_plans(tenant_id, category);
create index if not exists idx_hrm_benefit_enrollments_employee on hrm_benefit_enrollments(tenant_id, employee_id);
create index if not exists idx_hrm_leave_balances_employee on hrm_leave_balances(tenant_id, employee_id, year);
create index if not exists idx_hrm_goals_employee on hrm_goals(tenant_id, employee_id);
create index if not exists idx_hrm_performance_reviews_employee on hrm_performance_reviews(tenant_id, employee_id);
create index if not exists idx_hrm_job_changes_employee on hrm_job_changes(tenant_id, employee_id, status);
create index if not exists idx_hrm_inbox_tasks_assignee on hrm_inbox_tasks(tenant_id, assignee_email, status);
create index if not exists idx_hrm_personal_data_requests_employee on hrm_personal_data_requests(tenant_id, employee_id);
create index if not exists idx_hrm_job_requisitions_tenant on hrm_job_requisitions(tenant_id, status);
create index if not exists idx_hrm_offboarding_tasks_employee on hrm_offboarding_tasks(tenant_id, employee_id);

/* =========================================================================
 * 7. RLS
 * ========================================================================= */

do $$
declare
  t text;
begin
  foreach t in array array[
    'hrm_work_locations',
    'hrm_cost_centers',
    'hrm_job_families',
    'hrm_pay_grades',
    'hrm_job_profiles',
    'hrm_positions',
    'hrm_worker_profiles',
    'hrm_worker_dependents',
    'hrm_emergency_contacts',
    'hrm_worker_education',
    'hrm_worker_experience',
    'hrm_worker_certifications',
    'hrm_identity_documents',
    'hrm_payment_elections',
    'hrm_costing_allocations',
    'hrm_benefit_plans',
    'hrm_benefit_enrollments',
    'hrm_leave_balances',
    'hrm_goals',
    'hrm_performance_reviews',
    'hrm_job_changes',
    'hrm_inbox_tasks',
    'hrm_personal_data_requests',
    'hrm_job_requisitions',
    'hrm_offboarding_tasks'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    if not exists (select 1 from pg_policies where policyname = t || '_tenant_isolation') then
      execute format(
        'create policy %I on %I for all using (tenant_id = current_tenant_id())',
        t || '_tenant_isolation',
        t
      );
    end if;
  end loop;
end
$$;

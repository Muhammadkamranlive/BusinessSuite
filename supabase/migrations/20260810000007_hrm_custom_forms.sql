-- Optional cloud tables for HRM custom forms (localStorage store is primary for demo)
create table if not exists hrm_custom_forms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'draft',
  show_letterhead boolean not null default true,
  fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists hrm_form_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  form_id uuid not null references hrm_custom_forms(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  status text not null default 'pending',
  due_date date,
  assigned_by text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists hrm_form_responses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  assignment_id uuid not null references hrm_form_assignments(id) on delete cascade,
  form_id uuid not null references hrm_custom_forms(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  file_names jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

alter table hrm_company_profiles
  add column if not exists logo_data_url text,
  add column if not exists letterhead_title text,
  add column if not exists letterhead_tagline text,
  add column if not exists letterhead_footer text,
  add column if not exists brand_color text;

alter table hrm_custom_forms enable row level security;
alter table hrm_form_assignments enable row level security;
alter table hrm_form_responses enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'hrm_custom_forms_tenant_isolation') then
    create policy hrm_custom_forms_tenant_isolation on hrm_custom_forms for all using (tenant_id = current_tenant_id());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'hrm_form_assignments_tenant_isolation') then
    create policy hrm_form_assignments_tenant_isolation on hrm_form_assignments for all using (tenant_id = current_tenant_id());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'hrm_form_responses_tenant_isolation') then
    create policy hrm_form_responses_tenant_isolation on hrm_form_responses for all using (tenant_id = current_tenant_id());
  end if;
end
$$;

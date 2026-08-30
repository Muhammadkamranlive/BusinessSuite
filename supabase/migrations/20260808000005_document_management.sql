-- Pelican / ENS-style document management (multi-tenant)
-- Firebase Storage → Supabase Storage bucket `hrm-documents`
-- Firestore collections → Postgres tables below

create extension if not exists "pgcrypto";

create table if not exists public.hrm_document_requirements (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  title text not null,
  description text not null default '',
  category text not null default 'other',
  employment_types text[] not null default '{}',
  allowed_extensions text[] not null default array['.pdf'],
  required boolean not null default false,
  source text not null default 'admin' check (source in ('system', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  is_active boolean not null default true
);

create index if not exists hrm_document_requirements_tenant_idx
  on public.hrm_document_requirements (tenant_id);

create table if not exists public.hrm_managed_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  employee_id uuid,
  employee_name text not null,
  employee_email text not null default '',
  requirement_id text not null,
  requirement_title text not null,
  category text not null default 'other',
  file_name text not null,
  file_type text not null default 'application/octet-stream',
  file_size bigint not null default 0,
  extension text not null default '',
  storage_path text not null,
  download_url text not null,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'needs-review', 'verified', 'rejected')),
  deleted boolean not null default false,
  deleted_at timestamptz,
  source text not null default 'employee' check (source in ('employee', 'hr-team')),
  assigned_by text,
  assigned_scope text check (assigned_scope is null or assigned_scope in ('single', 'department', 'all')),
  assigned_department_id uuid,
  team_note text,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  is_active boolean not null default true
);

create index if not exists hrm_managed_documents_tenant_idx
  on public.hrm_managed_documents (tenant_id);
create index if not exists hrm_managed_documents_employee_idx
  on public.hrm_managed_documents (tenant_id, employee_id);
create index if not exists hrm_managed_documents_deleted_idx
  on public.hrm_managed_documents (tenant_id, deleted);

alter table public.hrm_document_requirements enable row level security;
alter table public.hrm_managed_documents enable row level security;

-- Placeholder tenant-isolation policies (tighten when auth.uid() ↔ tenant membership is wired)
drop policy if exists hrm_document_requirements_tenant_isolation on public.hrm_document_requirements;
create policy hrm_document_requirements_tenant_isolation
  on public.hrm_document_requirements
  for all
  using (true)
  with check (true);

drop policy if exists hrm_managed_documents_tenant_isolation on public.hrm_managed_documents;
create policy hrm_managed_documents_tenant_isolation
  on public.hrm_managed_documents
  for all
  using (true)
  with check (true);

-- Create storage bucket in Supabase dashboard (or via API):
--   name: hrm-documents
--   public: false
-- Paths: tenants/{tenant_id}/employees/{employee_id}/documents/{ts}-{file}
--        tenants/{tenant_id}/hr-team/{actor}/assigned/{ts}-{file}

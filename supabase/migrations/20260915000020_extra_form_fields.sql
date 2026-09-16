-- =============================================================================
-- Extra form fields — WHOLE ERP (all modules, company-wise)
-- =============================================================================
-- One pair of tables covers EVERY form in form-catalog.ts via form_key, including:
--   CRM, Sales, Purchases, Inventory, Finance, Operations, Healthcare,
--   Projects, HRM, Documents, Settings / Admin, Billing
-- Examples of form_key: crm.customer, sales.invoice, hrm.employee, finance.account
-- Schemas + answers are scoped by tenant_id (company). No per-module tables needed.
-- Run: npm run db:push
-- =============================================================================

create table if not exists public.extra_form_schemas (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  form_key text not null,
  fields jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, form_key),
  constraint extra_form_schemas_form_key_nonempty check (char_length(trim(form_key)) > 0)
);

create table if not exists public.extra_field_values (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  form_key text not null,
  -- Record ids may be local string ids (not always UUID), so use text.
  record_id text not null,
  extra_fields_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, form_key, record_id),
  constraint extra_field_values_form_key_nonempty check (char_length(trim(form_key)) > 0),
  constraint extra_field_values_record_id_nonempty check (char_length(trim(record_id)) > 0)
);

create index if not exists idx_extra_field_values_tenant_form
  on public.extra_field_values (tenant_id, form_key);

create index if not exists idx_extra_form_schemas_tenant
  on public.extra_form_schemas (tenant_id);

create index if not exists idx_extra_field_values_tenant
  on public.extra_field_values (tenant_id);

alter table public.extra_form_schemas enable row level security;
alter table public.extra_field_values enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'extra_form_schemas' and policyname = 'extra_form_schemas_tenant_isolation'
  ) then
    create policy extra_form_schemas_tenant_isolation on public.extra_form_schemas
      for all
      using (tenant_id = current_tenant_id())
      with check (tenant_id = current_tenant_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'extra_field_values' and policyname = 'extra_field_values_tenant_isolation'
  ) then
    create policy extra_field_values_tenant_isolation on public.extra_field_values
      for all
      using (tenant_id = current_tenant_id())
      with check (tenant_id = current_tenant_id());
  end if;
end
$$;

comment on table public.extra_form_schemas is
  'ERP-wide per-company field definitions for ExtraFieldsBlock. form_key matches modules/forms/form-catalog.ts (crm.*, sales.*, hrm.*, finance.*, …).';
comment on table public.extra_field_values is
  'ERP-wide per-company answers for ExtraFieldsBlock. One row per (tenant, form_key, record_id).';
comment on column public.extra_form_schemas.form_key is
  'Stable catalog key e.g. crm.customer, sales.invoice, hrm.employee — covers all ERP modules.';
comment on column public.extra_field_values.form_key is
  'Same catalog key as extra_form_schemas.form_key.';

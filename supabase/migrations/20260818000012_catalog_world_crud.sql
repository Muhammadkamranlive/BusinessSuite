-- World-CRUD catalogs (finance extras, inventory extras, operations, healthcare)
-- Additive. App dual-writes via /api/ops/sync; Postgres is the durable store.

create table if not exists catalog_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  slug text not null,
  status text not null default 'active',
  payload jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists catalog_records_tenant_slug_idx
  on catalog_records (tenant_id, slug);

comment on table catalog_records is
  'Generic CRUD rows for catalog specs (finance.banks, healthcare.patients, operations.bom, …). Field answers live in payload.';

alter table catalog_records enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'catalog_records'
      and policyname = 'catalog_records_tenant_isolation'
  ) then
    create policy catalog_records_tenant_isolation
      on catalog_records
      for all
      using (tenant_id = current_tenant_id())
      with check (tenant_id = current_tenant_id());
  end if;
end
$$;

-- Multi-tenant Data Warehouse / BI snapshots (optional cloud persist)
-- Live reports today use in-app stores via buildTenantWarehouse(tenant_id).

create table if not exists bi_report_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  domain text not null check (domain in (
    'executive', 'sales', 'inventory', 'purchases', 'finance', 'crm', 'hrm'
  )),
  title text not null,
  generated_at timestamptz not null default now(),
  generated_by text,
  kpi_json jsonb not null default '{}'::jsonb,
  payload_json jsonb not null default '{}'::jsonb,
  branding_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create index if not exists bi_report_snapshots_tenant_idx
  on bi_report_snapshots (tenant_id, generated_at desc);

create index if not exists bi_report_snapshots_domain_idx
  on bi_report_snapshots (tenant_id, domain, generated_at desc);

alter table bi_report_snapshots enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'bi_report_snapshots_tenant_isolation') then
    create policy bi_report_snapshots_tenant_isolation on bi_report_snapshots
      for all using (tenant_id = current_tenant_id());
  end if;
end
$$;

-- Lightweight KPI rollup (swap / extend when ops tables grow)
create or replace view bi_tenant_kpi_overview as
select
  t.id as tenant_id,
  t.name as tenant_name,
  (select count(*) from invoices i where i.tenant_id = t.id and coalesce(i.is_active, true)) as invoice_count,
  (select coalesce(sum(i.total_amount), 0) from invoices i where i.tenant_id = t.id and coalesce(i.is_active, true)) as invoice_total,
  (select count(*) from products p where p.tenant_id = t.id and coalesce(p.is_active, true)) as product_count,
  (select count(*) from employees e where e.tenant_id = t.id and coalesce(e.is_active, true)) as employee_count
from tenants t
where t.status = 'active';

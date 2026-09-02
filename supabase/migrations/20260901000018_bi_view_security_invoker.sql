-- Fix Supabase advisor: bi_tenant_kpi_overview must not bypass RLS (SECURITY DEFINER).
-- Recreate as security_invoker so policies on tenants/invoices/products/employees apply to the caller.

drop view if exists public.bi_tenant_kpi_overview;

create view public.bi_tenant_kpi_overview
with (security_invoker = true)
as
select
  t.id as tenant_id,
  t.name as tenant_name,
  (
    select count(*)
    from invoices i
    where i.tenant_id = t.id
      and coalesce(i.is_active, true)
  ) as invoice_count,
  (
    select coalesce(sum(i.total_amount), 0)
    from invoices i
    where i.tenant_id = t.id
      and coalesce(i.is_active, true)
  ) as invoice_total,
  (
    select count(*)
    from products p
    where p.tenant_id = t.id
      and coalesce(p.is_active, true)
  ) as product_count,
  (
    select count(*)
    from employees e
    where e.tenant_id = t.id
      and coalesce(e.is_active, true)
  ) as employee_count
from tenants t
where t.status = 'active'
  and t.id = current_tenant_id();

comment on view public.bi_tenant_kpi_overview is
  'Tenant-scoped KPI rollup; security_invoker enforces RLS of the querying user.';

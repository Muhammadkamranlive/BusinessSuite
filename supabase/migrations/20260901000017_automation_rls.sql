-- Enable RLS on automation + email outbox tables (Supabase security advisor)

alter table public.automation_rules enable row level security;
alter table public.automation_schedules enable row level security;
alter table public.automation_events enable row level security;
alter table public.email_outbox_jobs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'automation_rules' and policyname = 'automation_rules_tenant_isolation'
  ) then
    create policy automation_rules_tenant_isolation on public.automation_rules
      for all
      using (tenant_id = current_tenant_id())
      with check (tenant_id = current_tenant_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'automation_schedules' and policyname = 'automation_schedules_tenant_isolation'
  ) then
    create policy automation_schedules_tenant_isolation on public.automation_schedules
      for all
      using (tenant_id = current_tenant_id())
      with check (tenant_id = current_tenant_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'automation_events' and policyname = 'automation_events_tenant_isolation'
  ) then
    create policy automation_events_tenant_isolation on public.automation_events
      for all
      using (tenant_id = current_tenant_id())
      with check (tenant_id = current_tenant_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'email_outbox_jobs' and policyname = 'email_outbox_jobs_tenant_isolation'
  ) then
    create policy email_outbox_jobs_tenant_isolation on public.email_outbox_jobs
      for all
      using (tenant_id is not null and tenant_id = current_tenant_id())
      with check (tenant_id is not null and tenant_id = current_tenant_id());
  end if;
end
$$;

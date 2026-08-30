-- Automation engine + durable email outbox (DB-first; replaces browser-only localStorage)

create table if not exists automation_rules (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  description text,
  module text not null,
  event_key text not null,
  enabled boolean not null default true,
  is_system boolean not null default false,
  conditions jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists automation_rules_tenant_event_idx
  on automation_rules (tenant_id, event_key) where enabled = true;

create table if not exists automation_schedules (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  description text,
  module text not null,
  enabled boolean not null default true,
  is_system boolean not null default false,
  frequency text not null,
  time_hhmm text not null default '08:00',
  weekday int,
  event_key text not null,
  payload jsonb not null default '{}'::jsonb,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists automation_schedules_tenant_idx on automation_schedules (tenant_id);

create table if not exists automation_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  module text not null,
  event_key text not null,
  title text not null,
  message text,
  actor_email text,
  entity_id text,
  entity_label text,
  payload jsonb not null default '{}'::jsonb,
  matched_rule_ids jsonb not null default '[]'::jsonb,
  action_results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists automation_events_tenant_created_idx
  on automation_events (tenant_id, created_at desc);

create table if not exists email_outbox_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts int not null default 0,
  last_error text,
  kind text not null default 'templated',
  payload jsonb not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_outbox_jobs_status_idx
  on email_outbox_jobs (status, created_at) where status in ('pending', 'failed');

drop trigger if exists automation_rules_updated_at on automation_rules;
create trigger automation_rules_updated_at
  before update on automation_rules
  for each row execute function set_updated_at();

drop trigger if exists automation_schedules_updated_at on automation_schedules;
create trigger automation_schedules_updated_at
  before update on automation_schedules
  for each row execute function set_updated_at();

drop trigger if exists email_outbox_jobs_updated_at on email_outbox_jobs;
create trigger email_outbox_jobs_updated_at
  before update on email_outbox_jobs
  for each row execute function set_updated_at();

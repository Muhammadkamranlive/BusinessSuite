create extension if not exists "pgcrypto";

create or replace function set_updated_at()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  legal_name text,
  industry text,
  email text,
  phone text,
  website text,
  country text,
  city text,
  address text,
  logo_url text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  tenant_id uuid not null references tenants(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  avatar_url text,
  job_title text,
  department_id uuid,
  status text not null default 'active' check (status in ('active', 'invited', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  name text not null,
  description text,
  is_system_role boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  module text not null,
  description text,
  created_at timestamptz not null default now()
);

create table user_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_profile_id uuid not null references user_profiles(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tenant_id, user_profile_id, role_id)
);

create table role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (role_id, permission_id)
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete set null,
  user_profile_id uuid references user_profiles(id) on delete set null,
  module text not null,
  action text not null check (action in ('create', 'update', 'delete', 'login', 'logout', 'export', 'approve', 'reject', 'post', 'cancel')),
  entity_name text,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_profile_id uuid references user_profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('info', 'warning', 'success', 'error')),
  is_read boolean not null default false,
  target_module text,
  target_id uuid,
  created_at timestamptz not null default now()
);

create index idx_user_profiles_tenant on user_profiles(tenant_id);
create index idx_roles_tenant on roles(tenant_id);
create index idx_user_roles_tenant_user on user_roles(tenant_id, user_profile_id);
create index idx_audit_logs_tenant_created_at on audit_logs(tenant_id, created_at desc);
create index idx_notifications_user_read on notifications(user_profile_id, is_read, created_at desc);

create trigger tenants_set_updated_at before update on tenants
for each row execute function set_updated_at();

create trigger user_profiles_set_updated_at before update on user_profiles
for each row execute function set_updated_at();

create trigger roles_set_updated_at before update on roles
for each row execute function set_updated_at();

alter table tenants enable row level security;
alter table user_profiles enable row level security;
alter table roles enable row level security;
alter table permissions enable row level security;
alter table user_roles enable row level security;
alter table role_permissions enable row level security;
alter table audit_logs enable row level security;
alter table notifications enable row level security;

create or replace function current_user_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $function$
  select id
  from user_profiles
  where auth_user_id = auth.uid()
  limit 1
$function$;

create or replace function current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $function$
  select tenant_id
  from user_profiles
  where auth_user_id = auth.uid()
  limit 1
$function$;

create or replace function has_permission(permission_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from user_roles ur
    join role_permissions rp on rp.role_id = ur.role_id
    join permissions p on p.id = rp.permission_id
    where ur.user_profile_id = current_user_profile_id()
      and p.code = permission_code
  )
$function$;

create policy tenants_select_own on tenants
for select using (id = current_tenant_id());

create policy user_profiles_select_own_tenant on user_profiles
for select using (tenant_id = current_tenant_id());

create policy user_profiles_update_self on user_profiles
for update using (id = current_user_profile_id())
with check (id = current_user_profile_id());

create policy roles_select_own_tenant_or_system on roles
for select using (tenant_id = current_tenant_id() or tenant_id is null);

create policy permissions_select_authenticated on permissions
for select to authenticated using (true);

create policy user_roles_select_own_tenant on user_roles
for select using (tenant_id = current_tenant_id());

create policy role_permissions_select_for_visible_roles on role_permissions
for select using (
  exists (
    select 1
    from roles r
    where r.id = role_permissions.role_id
      and (r.tenant_id = current_tenant_id() or r.tenant_id is null)
  )
);

create policy audit_logs_select_own_tenant on audit_logs
for select using (tenant_id = current_tenant_id());

create policy audit_logs_insert_own_tenant on audit_logs
for insert with check (tenant_id = current_tenant_id());

create policy notifications_select_own_user on notifications
for select using (
  tenant_id = current_tenant_id()
  and (user_profile_id is null or user_profile_id = current_user_profile_id())
);

create policy notifications_update_own_user on notifications
for update using (user_profile_id = current_user_profile_id())
with check (user_profile_id = current_user_profile_id());

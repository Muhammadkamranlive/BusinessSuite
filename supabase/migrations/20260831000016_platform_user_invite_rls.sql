-- Allow company admins (via permission) to invite users into their tenant.
-- Server invite API uses service role (bypasses RLS); these policies support future user-JWT flows.

create policy user_profiles_insert_admin on user_profiles
for insert
to authenticated
with check (
  tenant_id = current_tenant_id()
  and has_permission('admin.users.manage')
);

create policy user_profiles_update_admin on user_profiles
for update
to authenticated
using (
  tenant_id = current_tenant_id()
  and has_permission('admin.users.manage')
)
with check (tenant_id = current_tenant_id());

create policy user_roles_insert_admin on user_roles
for insert
to authenticated
with check (
  tenant_id = current_tenant_id()
  and has_permission('admin.users.manage')
);

create policy roles_insert_admin on roles
for insert
to authenticated
with check (
  tenant_id = current_tenant_id()
  and has_permission('admin.roles.manage')
);

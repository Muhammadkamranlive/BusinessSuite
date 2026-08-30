insert into tenants (id, name, legal_name, industry, email, phone, website, country, city, address, status) values
  ('00000000-0000-0000-0000-000000000101', 'Alpha Trading LLC', 'Alpha Trading LLC', 'Wholesale distribution', 'info@alphatrading.example', '+971 55 100 1000', 'https://alpha.example', 'UAE', 'Dubai', 'Business Bay, Dubai', 'active'),
  ('00000000-0000-0000-0000-000000000102', 'Medix Pharmacy Supplies', 'Medix Pharmacy Supplies Pvt Ltd', 'Healthcare supply', 'hello@medix.example', '+92 300 200 2000', 'https://medix.example', 'Pakistan', 'Karachi', 'Shahrah-e-Faisal, Karachi', 'active'),
  ('00000000-0000-0000-0000-000000000103', 'AutoParts Distribution', 'AutoParts Distribution Co.', 'Automotive parts', 'contact@autoparts.example', '+966 50 300 3000', 'https://autoparts.example', 'Saudi Arabia', 'Jeddah', 'Industrial Area, Jeddah', 'active')
on conflict (id) do update set
  name = excluded.name,
  legal_name = excluded.legal_name,
  industry = excluded.industry,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  country = excluded.country,
  city = excluded.city,
  address = excluded.address,
  status = excluded.status;

insert into user_profiles (id, tenant_id, full_name, email, phone, job_title, status) values
  ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000101', 'Ayesha Khan', 'admin@demo.com', '+971 55 100 1001', 'Super Admin', 'active'),
  ('00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000000101', 'Omar Farooq', 'manager@demo.com', '+971 55 100 1002', 'Company Admin', 'active'),
  ('00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000000101', 'Sana Malik', 'hr@demo.com', '+971 55 100 1003', 'HR Manager', 'active'),
  ('00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000000101', 'Bilal Ahmed', 'sales@demo.com', '+971 55 100 1004', 'Sales Manager', 'active'),
  ('00000000-0000-0000-0000-000000001005', '00000000-0000-0000-0000-000000000101', 'Nadia Raza', 'warehouse@demo.com', '+971 55 100 1005', 'Warehouse Manager', 'active'),
  ('00000000-0000-0000-0000-000000001006', '00000000-0000-0000-0000-000000000101', 'Mariam Ali', 'finance@demo.com', '+971 55 100 1006', 'Finance Manager', 'active'),
  ('00000000-0000-0000-0000-000000001007', '00000000-0000-0000-0000-000000000101', 'Imran Shah', 'viewer@demo.com', '+971 55 100 1007', 'Viewer', 'active')
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone,
  job_title = excluded.job_title,
  status = excluded.status;

insert into roles (id, tenant_id, name, description, is_system_role) values
  ('00000000-0000-0000-0000-000000002001', null, 'Super Admin', 'Platform-level access across tenants', true),
  ('00000000-0000-0000-0000-000000002002', '00000000-0000-0000-0000-000000000101', 'Company Admin', 'Full access inside one tenant', true),
  ('00000000-0000-0000-0000-000000002003', '00000000-0000-0000-0000-000000000101', 'HR Manager', 'HRM, attendance, leave, payroll, and HR reports', true),
  ('00000000-0000-0000-0000-000000002004', '00000000-0000-0000-0000-000000000101', 'Sales Manager', 'CRM, quotations, orders, invoices, and payments', true),
  ('00000000-0000-0000-0000-000000002005', '00000000-0000-0000-0000-000000000101', 'Warehouse Manager', 'Inventory, stock movement, and purchasing visibility', true),
  ('00000000-0000-0000-0000-000000002006', '00000000-0000-0000-0000-000000000101', 'Finance Manager', 'Finance, reports, invoices, and vendor bill visibility', true),
  ('00000000-0000-0000-0000-000000002007', '00000000-0000-0000-0000-000000000101', 'Viewer', 'Read-only reports and dashboard access', true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  is_system_role = excluded.is_system_role;

insert into permissions (code, module, description) values
  ('dashboard.view', 'dashboard', 'View executive dashboard'),
  ('crm.leads.view', 'crm', 'View leads'),
  ('crm.leads.create', 'crm', 'Create leads'),
  ('crm.leads.update', 'crm', 'Update leads'),
  ('crm.leads.delete', 'crm', 'Delete leads'),
  ('crm.customers.view', 'crm', 'View customers'),
  ('crm.deals.view', 'crm', 'View deal pipeline'),
  ('crm.activities.view', 'crm', 'View CRM activities'),
  ('sales.quotations.view', 'sales', 'View quotations'),
  ('sales.invoices.view', 'sales', 'View invoices'),
  ('sales.invoices.create', 'sales', 'Create invoices'),
  ('sales.invoices.update', 'sales', 'Update invoices'),
  ('sales.invoices.delete', 'sales', 'Delete invoices'),
  ('sales.payments.view', 'sales', 'View payments received'),
  ('purchase.suppliers.view', 'purchase', 'View suppliers'),
  ('purchase.orders.view', 'purchase', 'View purchase orders'),
  ('purchase.receipts.view', 'purchase', 'View goods receipts'),
  ('inventory.products.view', 'inventory', 'View products'),
  ('inventory.products.create', 'inventory', 'Create products'),
  ('inventory.stock_movement.create', 'inventory', 'Create stock movement'),
  ('inventory.stock_movements.view', 'inventory', 'View stock movement ledger'),
  ('hrm.employees.view', 'hrm', 'View employees'),
  ('hrm.employees.create', 'hrm', 'Create employees'),
  ('hrm.employees.update', 'hrm', 'Update employees'),
  ('hrm.employees.delete', 'hrm', 'Delete employees'),
  ('hrm.attendance.view', 'hrm', 'View attendance'),
  ('hrm.leave.view', 'hrm', 'View leave requests'),
  ('hrm.payroll.view', 'hrm', 'View payroll'),
  ('finance.accounts.view', 'finance', 'View chart of accounts'),
  ('finance.expenses.view', 'finance', 'View expenses'),
  ('finance.income.view', 'finance', 'View income'),
  ('finance.journals.view', 'finance', 'View journal entries'),
  ('finance.reports.view', 'finance', 'View finance reports'),
  ('projects.projects.view', 'projects', 'View projects'),
  ('projects.tasks.view', 'projects', 'View tasks'),
  ('projects.timesheets.view', 'projects', 'View timesheets'),
  ('reports.view', 'reports', 'View reports and BI dashboards'),
  ('admin.users.manage', 'admin', 'Manage users'),
  ('admin.roles.manage', 'admin', 'Manage roles and permissions'),
  ('admin.tenants.manage', 'admin', 'Manage companies and tenants'),
  ('admin.audit.view', 'admin', 'View audit logs'),
  ('admin.notifications.view', 'admin', 'View notifications'),
  ('admin.settings.manage', 'admin', 'Manage system settings')
on conflict (code) do update set
  module = excluded.module,
  description = excluded.description;

insert into user_roles (tenant_id, user_profile_id, role_id) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000002001'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000002002'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000002003'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000002004'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001005', '00000000-0000-0000-0000-000000002005'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001006', '00000000-0000-0000-0000-000000002006'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001007', '00000000-0000-0000-0000-000000002007')
on conflict (tenant_id, user_profile_id, role_id) do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
cross join permissions p
where r.name in ('Super Admin', 'Company Admin')
on conflict (role_id, permission_id) do nothing;

insert into role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000002003', id
from permissions
where code in ('dashboard.view', 'hrm.employees.view', 'hrm.employees.create', 'hrm.employees.update', 'hrm.attendance.view', 'hrm.leave.view', 'hrm.payroll.view', 'reports.view')
on conflict (role_id, permission_id) do nothing;

insert into role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000002004', id
from permissions
where code in ('dashboard.view', 'crm.leads.view', 'crm.leads.create', 'crm.leads.update', 'crm.customers.view', 'crm.deals.view', 'crm.activities.view', 'sales.quotations.view', 'sales.invoices.view', 'sales.invoices.create', 'sales.invoices.update', 'sales.payments.view', 'reports.view')
on conflict (role_id, permission_id) do nothing;

insert into role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000002005', id
from permissions
where code in ('dashboard.view', 'inventory.products.view', 'inventory.products.create', 'inventory.stock_movement.create', 'inventory.stock_movements.view', 'purchase.suppliers.view', 'purchase.orders.view', 'purchase.receipts.view', 'reports.view')
on conflict (role_id, permission_id) do nothing;

insert into role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000002006', id
from permissions
where code in ('dashboard.view', 'finance.accounts.view', 'finance.expenses.view', 'finance.income.view', 'finance.journals.view', 'finance.reports.view', 'sales.invoices.view', 'purchase.orders.view', 'reports.view')
on conflict (role_id, permission_id) do nothing;

insert into role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000002007', id
from permissions
where code in ('dashboard.view', 'reports.view')
on conflict (role_id, permission_id) do nothing;

insert into audit_logs (id, tenant_id, user_profile_id, module, action, entity_name, entity_id, new_data, ip_address, created_at) values
  ('00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001001', 'admin', 'login', 'user_profiles', '00000000-0000-0000-0000-000000001001', '{"email":"admin@demo.com"}', '127.0.0.1', '2026-06-30 09:00+00'),
  ('00000000-0000-0000-0000-000000003002', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001002', 'admin', 'update', 'roles', '00000000-0000-0000-0000-000000002004', '{"permission":"sales.invoices.create"}', '127.0.0.1', '2026-06-30 12:40+00')
on conflict (id) do update set
  new_data = excluded.new_data,
  created_at = excluded.created_at;

insert into notifications (id, tenant_id, user_profile_id, title, message, type, target_module, created_at) values
  ('00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001004', 'Follow-ups due', 'Nine high-priority CRM follow-ups are due today.', 'warning', 'crm', '2026-06-30 10:00+00'),
  ('00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001005', 'Low stock alert', 'Brake Pad Set is below reorder level.', 'warning', 'inventory', '2026-06-30 11:00+00'),
  ('00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000000101', null, 'Phase 2 seed ready', 'Core tenants, users, roles, permissions, audit logs, and notifications are seeded.', 'success', 'admin', '2026-06-30 12:00+00')
on conflict (id) do update set
  title = excluded.title,
  message = excluded.message,
  type = excluded.type,
  target_module = excluded.target_module,
  created_at = excluded.created_at;

-- Full client demo seed — all 4 companies, all synced modules (CRM, Sales, Purchase, Inventory, Finance, HRM, Projects, Catalog)
-- Run: npm run db:push
-- Idempotent: safe to re-run (ON CONFLICT / WHERE NOT EXISTS)

/* Tenant UUIDs (match lib/tenants/ids.ts)
   alpha     00000000-0000-0000-0000-000000000101
   medix     00000000-0000-0000-0000-000000000102
   autoparts 00000000-0000-0000-0000-000000000103
   textile   00000000-0000-0000-0000-000000000104
*/

insert into tenants (id, name, legal_name, industry, email, phone, website, country, city, address, status) values
  ('00000000-0000-0000-0000-000000000104', 'Textile Manufacturing Co.', 'Textile Manufacturing Co.', 'Textile manufacturing', 'info@textile.example', '+92 300 400 4000', 'https://textile.example', 'Pakistan', 'Lahore', 'Ferozepur Road, Lahore', 'active')
on conflict (id) do update set
  name = excluded.name, legal_name = excluded.legal_name, industry = excluded.industry,
  email = excluded.email, phone = excluded.phone, website = excluded.website,
  country = excluded.country, city = excluded.city, address = excluded.address, status = excluded.status;

-- Company admins for Medix / AutoParts / Textile (Alpha users already in 000003 seed)
insert into user_profiles (id, tenant_id, full_name, email, phone, job_title, status) values
  ('00000000-0000-0000-0000-000000001201', '00000000-0000-0000-0000-000000000102', 'Dr. Hina Shah', 'admin.medix@demo.com', '+92 300 200 2001', 'Company Admin', 'active'),
  ('00000000-0000-0000-0000-000000001301', '00000000-0000-0000-0000-000000000103', 'Khalid Mansoor', 'admin.autoparts@demo.com', '+966 50 300 3001', 'Company Admin', 'active'),
  ('00000000-0000-0000-0000-000000001401', '00000000-0000-0000-0000-000000000104', 'Rashid Malik', 'admin.textile@demo.com', '+92 300 400 4001', 'Company Admin', 'active')
on conflict (id) do update set full_name = excluded.full_name, email = excluded.email, job_title = excluded.job_title, status = excluded.status;

insert into roles (id, tenant_id, name, description, is_system_role) values
  ('00000000-0000-0000-0000-000000002102', '00000000-0000-0000-0000-000000000102', 'Company Admin', 'Full access inside Medix', true),
  ('00000000-0000-0000-0000-000000002103', '00000000-0000-0000-0000-000000000103', 'Company Admin', 'Full access inside AutoParts', true),
  ('00000000-0000-0000-0000-000000002104', '00000000-0000-0000-0000-000000000104', 'Company Admin', 'Full access inside Textile', true)
on conflict (id) do update set name = excluded.name, description = excluded.description;

insert into user_roles (tenant_id, user_profile_id, role_id) values
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000001201', '00000000-0000-0000-0000-000000002102'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000001301', '00000000-0000-0000-0000-000000002103'),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000001401', '00000000-0000-0000-0000-000000002104')
on conflict (tenant_id, user_profile_id, role_id) do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r cross join permissions p
where r.id in (
  '00000000-0000-0000-0000-000000002102',
  '00000000-0000-0000-0000-000000002103',
  '00000000-0000-0000-0000-000000002104'
)
on conflict (role_id, permission_id) do nothing;

-- Per-tenant HRM + ops demo (function keeps migration maintainable)
create or replace function _seed_demo_company(p_tenant uuid, p_code text, p_company text, p_country text) returns void
language plpgsql as $$
declare
  d_hr uuid := ('00000000-0000-0000-0001-' || p_code || '00000001')::uuid;
  d_ops uuid := ('00000000-0000-0000-0001-' || p_code || '00000002')::uuid;
  d_fin uuid := ('00000000-0000-0000-0001-' || p_code || '00000003')::uuid;
  desig_mgr uuid := ('00000000-0000-0000-0002-' || p_code || '00000001')::uuid;
  desig_exec uuid := ('00000000-0000-0000-0002-' || p_code || '00000002')::uuid;
  shift_gen uuid := ('00000000-0000-0000-0003-' || p_code || '00000001')::uuid;
  wh_main uuid := ('00000000-0000-0000-0004-' || p_code || '00000001')::uuid;
  cat_main uuid := ('00000000-0000-0000-0005-' || p_code || '00000001')::uuid;
  prod_a uuid := ('00000000-0000-0000-0006-' || p_code || '00000001')::uuid;
  prod_b uuid := ('00000000-0000-0000-0006-' || p_code || '00000002')::uuid;
  cust_a uuid := ('00000000-0000-0000-0007-' || p_code || '00000001')::uuid;
  cust_b uuid := ('00000000-0000-0000-0007-' || p_code || '00000002')::uuid;
  sup_a uuid := ('00000000-0000-0000-0008-' || p_code || '00000001')::uuid;
  lead_a uuid := ('00000000-0000-0000-0009-' || p_code || '00000001')::uuid;
  deal_a uuid := ('00000000-0000-0000-000a-' || p_code || '00000001')::uuid;
  inv_a uuid := ('00000000-0000-0000-000b-' || p_code || '00000001')::uuid;
  quo_a uuid := ('00000000-0000-0000-000c-' || p_code || '00000001')::uuid;
  po_a uuid := ('00000000-0000-0000-000d-' || p_code || '00000001')::uuid;
  emp_ceo uuid := ('00000000-0000-0000-000e-' || p_code || '00000001')::uuid;
  emp_staff uuid := ('00000000-0000-0000-000e-' || p_code || '00000002')::uuid;
  emp_hr uuid := ('00000000-0000-0000-000e-' || p_code || '00000003')::uuid;
  proj_a uuid := ('00000000-0000-0000-000f-' || p_code || '00000001')::uuid;
  coa_cash uuid := ('00000000-0000-0000-0010-' || p_code || '00000001')::uuid;
  coa_rev uuid := ('00000000-0000-0000-0010-' || p_code || '00000004')::uuid;
  exp_a uuid := ('00000000-0000-0000-0011-' || p_code || '00000001')::uuid;
  pay_a uuid := ('00000000-0000-0000-0012-' || p_code || '00000001')::uuid;
  sp_a uuid := ('00000000-0000-0000-0013-' || p_code || '00000001')::uuid;
begin
  insert into departments (id, tenant_id, name, code, description, is_active) values
    (d_hr, p_tenant, 'Human Resources', 'HR', 'People operations', true),
    (d_ops, p_tenant, 'Operations', 'OPS', 'Daily operations', true),
    (d_fin, p_tenant, 'Finance', 'FIN', 'Accounts & finance', true)
  on conflict (id) do nothing;

  insert into hrm_designations (id, tenant_id, name, code, description, is_active) values
    (desig_mgr, p_tenant, 'Manager', 'MGR', 'People manager', true),
    (desig_exec, p_tenant, 'Executive', 'EXEC', 'Individual contributor', true)
  on conflict (id) do nothing;

  insert into hrm_shifts (id, tenant_id, name, start_time, end_time, grace_minutes, is_active) values
    (shift_gen, p_tenant, 'General Shift', '09:00', '18:00', 10, true)
  on conflict (id) do nothing;

  insert into hrm_holidays (id, tenant_id, name, date, type, is_active) values
    (('00000000-0000-0000-0014-' || p_code || '00000001')::uuid, p_tenant, 'Company Foundation Day', '2026-09-05', 'company', true),
    (('00000000-0000-0000-0014-' || p_code || '00000002')::uuid, p_tenant, 'National Day', '2026-08-14', 'gazetted', true)
  on conflict (id) do nothing;

  insert into hrm_company_profiles (id, tenant_id, legal_name, ntn, address, phone, email, is_active) values
    (('00000000-0000-0000-0015-' || p_code || '00000001')::uuid, p_tenant, p_company, 'SEED-' || p_code, p_country || ' HQ', '+000 000 0000', 'hr@' || lower(replace(p_company, ' ', '')) || '.example', true)
  on conflict (tenant_id) do update set legal_name = excluded.legal_name;

  insert into hrm_leave_types (id, tenant_id, name, code, days_per_year, paid, is_active) values
    (('00000000-0000-0000-0016-' || p_code || '00000001')::uuid, p_tenant, 'Annual Leave', 'ANNUAL', 18, true, true),
    (('00000000-0000-0000-0016-' || p_code || '00000002')::uuid, p_tenant, 'Sick Leave', 'SICK', 10, true, true)
  on conflict (id) do nothing;

  insert into hrm_pf_settings (id, tenant_id, percent, effective_from, is_active) values
    (('00000000-0000-0000-0017-' || p_code || '00000001')::uuid, p_tenant, 5, '2024-01-01', true)
  on conflict (id) do nothing;

  insert into hrm_eobi_settings (id, tenant_id, amount, effective_from, is_active) values
    (('00000000-0000-0000-0018-' || p_code || '00000001')::uuid, p_tenant, 370, '2024-01-01', true)
  on conflict (id) do nothing;

  insert into hrm_security_policies (id, tenant_id, mfa_required, session_hours, password_min_length, is_active) values
    (('00000000-0000-0000-0019-' || p_code || '00000001')::uuid, p_tenant, false, 24, 8, true)
  on conflict (id) do nothing;

  insert into employees (id, tenant_id, employee_no, full_name, email, phone, department_id, designation_id, shift_id, employment_type, status, basic_salary, joining_date, is_active) values
    (emp_ceo, p_tenant, 'EMP-CEO-' || p_code, p_company || ' GM', 'gm.' || p_code || '@demo.com', '+000 111 0001', d_ops, desig_mgr, shift_gen, 'full_time', 'active', 8500, '2022-01-15', true),
    (emp_hr, p_tenant, 'EMP-HR-' || p_code, 'HR Lead ' || p_code, 'hr.' || p_code || '@demo.com', '+000 111 0002', d_hr, desig_mgr, shift_gen, 'full_time', 'active', 6200, '2023-03-01', true),
    (emp_staff, p_tenant, 'EMP-01-' || p_code, 'Staff Member ' || p_code, 'staff.' || p_code || '@demo.com', '+000 111 0003', d_ops, desig_exec, shift_gen, 'full_time', 'active', 4200, '2024-06-01', true)
  on conflict (tenant_id, employee_no) do nothing;

  select id into emp_ceo from employees where tenant_id = p_tenant and employee_no = 'EMP-CEO-' || p_code limit 1;
  select id into emp_staff from employees where tenant_id = p_tenant and employee_no = 'EMP-01-' || p_code limit 1;

  insert into attendance (id, tenant_id, employee_id, attendance_date, status, working_hours, is_active) values
    (('00000000-0000-0000-001a-' || p_code || '00000001')::uuid, p_tenant, emp_ceo, current_date - 1, 'present', 8, true),
    (('00000000-0000-0000-001a-' || p_code || '00000002')::uuid, p_tenant, emp_staff, current_date - 1, 'present', 8, true)
  on conflict (id) do nothing;

  insert into warehouses (id, tenant_id, name, code, location, status, is_active) values
    (wh_main, p_tenant, 'Main Warehouse', 'WH-01', p_country, 'active', true)
  on conflict (id) do nothing;

  insert into product_categories (id, tenant_id, name, code, is_active) values
    (cat_main, p_tenant, 'General', 'GEN', true)
  on conflict (id) do nothing;

  insert into products (id, tenant_id, sku, name, unit, purchase_price, sale_price, tax_rate, reorder_level, status, category_id, is_active) values
    (prod_a, p_tenant, 'SKU-A-' || p_code, p_company || ' Product A', 'pcs', 50, 75, 5, 20, 'active', cat_main, true),
    (prod_b, p_tenant, 'SKU-B-' || p_code, p_company || ' Product B', 'pcs', 120, 180, 5, 10, 'active', cat_main, true)
  on conflict (tenant_id, sku) do nothing;

  select id into prod_a from products where tenant_id = p_tenant and sku = 'SKU-A-' || p_code limit 1;
  select id into prod_b from products where tenant_id = p_tenant and sku = 'SKU-B-' || p_code limit 1;

  insert into stock_balances (id, tenant_id, product_id, warehouse_id, quantity_on_hand) values
    (('00000000-0000-0000-001b-' || p_code || '00000001')::uuid, p_tenant, prod_a, wh_main, 250),
    (('00000000-0000-0000-001b-' || p_code || '00000002')::uuid, p_tenant, prod_b, wh_main, 40)
  on conflict (tenant_id, product_id, warehouse_id) do update set quantity_on_hand = excluded.quantity_on_hand;

  insert into customers (id, tenant_id, customer_no, name, type, email, phone, industry, status, credit_limit, is_active) values
    (cust_a, p_tenant, 'CUST-A-' || p_code, p_company || ' Customer A', 'company', 'cust-a-' || p_code || '@example.com', '+000 222 0001', 'Retail', 'active', 100000, true),
    (cust_b, p_tenant, 'CUST-B-' || p_code, p_company || ' Customer B', 'company', 'cust-b-' || p_code || '@example.com', '+000 222 0002', 'Services', 'active', 80000, true)
  on conflict (tenant_id, customer_no) do nothing;

  select id into cust_a from customers where tenant_id = p_tenant and customer_no = 'CUST-A-' || p_code limit 1;
  select id into cust_b from customers where tenant_id = p_tenant and customer_no = 'CUST-B-' || p_code limit 1;

  insert into suppliers (id, tenant_id, supplier_no, name, email, phone, contact_person, status, is_active) values
    (sup_a, p_tenant, 'SUP-A-' || p_code, p_company || ' Supplier', 'sup-' || p_code || '@example.com', '+000 333 0001', 'Vendor Contact', 'active', true)
  on conflict (tenant_id, supplier_no) do nothing;

  select id into sup_a from suppliers where tenant_id = p_tenant and supplier_no = 'SUP-A-' || p_code limit 1;

  insert into salespeople (id, tenant_id, name, email, territory, team, commission_pct, status, is_active) values
    (sp_a, p_tenant, 'Sales Lead ' || p_code, 'sales.' || p_code || '@demo.com', p_country, 'Core', 3, 'active', true)
  on conflict (id) do nothing;

  insert into leads (id, tenant_id, lead_no, company_name, contact_name, email, phone, source, status, priority, estimated_value, is_active) values
    (lead_a, p_tenant, 'LEAD-' || p_code || '-001', 'Prospect Co ' || p_code, 'Contact Person', 'lead-' || p_code || '@example.com', '+000 444 0001', 'Website', 'qualified', 'high', 75000, true)
  on conflict (tenant_id, lead_no) do nothing;

  select id into lead_a from leads where tenant_id = p_tenant and lead_no = 'LEAD-' || p_code || '-001' limit 1;

  insert into chart_of_accounts (id, tenant_id, account_code, account_name, account_type, is_active) values
    (coa_cash, p_tenant, '1000', 'Cash', 'asset', true),
    (('00000000-0000-0000-0010-' || p_code || '00000002')::uuid, p_tenant, '1100', 'Accounts Receivable', 'asset', true),
    (('00000000-0000-0000-0010-' || p_code || '00000003')::uuid, p_tenant, '2000', 'Accounts Payable', 'liability', true),
    (coa_rev, p_tenant, '4000', 'Sales Revenue', 'income', true),
    (('00000000-0000-0000-0010-' || p_code || '00000005')::uuid, p_tenant, '5000', 'Operating Expenses', 'expense', true)
  on conflict (tenant_id, account_code) do nothing;

  select id into coa_cash from chart_of_accounts where tenant_id = p_tenant and account_code = '1000' limit 1;

  if cust_a is null or lead_a is null then
    return;
  end if;

  insert into deals (id, tenant_id, deal_no, title, customer_id, lead_id, stage, amount, probability, expected_close_date, status, is_active) values
    (deal_a, p_tenant, 'DEAL-' || p_code || '-001', 'ERP rollout ' || p_code, cust_a, lead_a, 'proposal', 125000, 60, current_date + 45, 'open', true)
  on conflict (tenant_id, deal_no) do nothing;

  insert into tax_rates (id, tenant_id, name, rate, country, status, is_active) values
    (('00000000-0000-0000-001c-' || p_code || '00000001')::uuid, p_tenant, 'VAT', 5, p_country, 'active', true)
  on conflict (id) do nothing;

  insert into quotations (id, tenant_id, quotation_no, customer_id, quotation_date, valid_until, status, total_amount, is_active) values
    (quo_a, p_tenant, 'QUO-' || p_code || '-001', cust_a, current_date - 7, current_date + 21, 'sent', 45000, true)
  on conflict (tenant_id, quotation_no) do nothing;

  insert into invoices (id, tenant_id, invoice_no, customer_id, invoice_date, due_date, status, subtotal, tax_amount, total_amount, paid_amount, balance_due, is_active) values
    (inv_a, p_tenant, 'INV-' || p_code || '-001', cust_a, current_date - 14, current_date + 14, 'partially_paid', 40000, 2000, 42000, 20000, 22000, true)
  on conflict (tenant_id, invoice_no) do nothing;

  select id into inv_a from invoices where tenant_id = p_tenant and invoice_no = 'INV-' || p_code || '-001' limit 1;

  insert into payments_received (id, tenant_id, payment_no, customer_id, invoice_id, payment_date, amount, payment_method, is_active) values
    (pay_a, p_tenant, 'PAY-' || p_code || '-001', cust_a, inv_a, current_date - 7, 20000, 'bank_transfer', true)
  on conflict (tenant_id, payment_no) do nothing;

  if sup_a is not null then
    insert into purchase_orders (id, tenant_id, purchase_order_no, supplier_id, order_date, expected_delivery_date, status, total_amount, is_active) values
      (po_a, p_tenant, 'PO-' || p_code || '-001', sup_a, current_date - 5, current_date + 10, 'approved', 18000, true)
    on conflict (tenant_id, purchase_order_no) do nothing;
  end if;

  if coa_cash is not null then
    insert into expenses (id, tenant_id, expense_no, expense_date, account_id, amount, payment_method, description, is_active) values
      (exp_a, p_tenant, 'EXP-' || p_code || '-001', current_date - 3, coa_cash, 3500, 'cash', 'Office supplies', true)
    on conflict (tenant_id, expense_no) do nothing;
  end if;

  insert into projects (id, tenant_id, project_no, name, customer_id, start_date, end_date, status, budget, description, is_active) values
    (proj_a, p_tenant, 'PRJ-' || p_code || '-001', p_company || ' ERP rollout', cust_a, current_date - 30, current_date + 90, 'active', 150000, 'Client demo project', true)
  on conflict (tenant_id, project_no) do nothing;

  select id into proj_a from projects where tenant_id = p_tenant and project_no = 'PRJ-' || p_code || '-001' limit 1;

  if proj_a is not null then
    insert into project_tasks (id, tenant_id, project_id, title, status, due, is_active) values
      (('00000000-0000-0000-001d-' || p_code || '00000001')::uuid, p_tenant, proj_a, 'Discovery workshop', 'done', current_date - 20, true),
      (('00000000-0000-0000-001d-' || p_code || '00000002')::uuid, p_tenant, proj_a, 'Configuration sprint', 'in_progress', current_date + 14, true)
    on conflict (id) do nothing;
  end if;

  if lead_a is not null then
    insert into crm_activities (id, tenant_id, related_type, related_id, activity_type, subject, description, is_active) values
      (('00000000-0000-0000-001e-' || p_code || '00000001')::uuid, p_tenant, 'lead', lead_a, 'call', 'Intro call', 'Qualified budget holder', true)
    on conflict (id) do nothing;
  end if;

  insert into catalog_records (id, tenant_id, slug, status, payload, is_active) values
    (('00000000-0000-0000-001f-' || p_code || '00000001')::uuid, p_tenant, 'healthcare.patients', 'active', jsonb_build_object('name', 'Demo Patient ' || p_code, 'mrn', 'MRN-' || p_code, 'phone', '+000 555 0001'), true),
    (('00000000-0000-0000-001f-' || p_code || '00000002')::uuid, p_tenant, 'operations.work_orders', 'active', jsonb_build_object('code', 'WO-' || p_code, 'title', 'Maintenance ' || p_code, 'status', 'open'), true),
    (('00000000-0000-0000-001f-' || p_code || '00000003')::uuid, p_tenant, 'finance.banks', 'active', jsonb_build_object('code', 'BNK-' || p_code, 'name', p_company || ' Bank', 'country', p_country), true)
  on conflict (id) do nothing;
end;
$$;

select _seed_demo_company('00000000-0000-0000-0000-000000000101', '0101', 'Alpha Trading LLC', 'UAE');
select _seed_demo_company('00000000-0000-0000-0000-000000000102', '0102', 'Medix Pharmacy Supplies', 'Pakistan');
select _seed_demo_company('00000000-0000-0000-0000-000000000103', '0103', 'AutoParts Distribution', 'Saudi Arabia');
select _seed_demo_company('00000000-0000-0000-0000-000000000104', '0104', 'Textile Manufacturing Co.', 'Pakistan');

drop function if exists _seed_demo_company(uuid, text, text, text);

-- Bump document sequences so new numbers don't collide
update document_sequences set next_number = greatest(next_number, 100)
where tenant_id in (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000103',
  '00000000-0000-0000-0000-000000000104'
);

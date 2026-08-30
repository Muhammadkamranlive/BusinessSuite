-- Extend demo seed: CRM, Sales, Purchase, Inventory, Finance, Projects, HRM, Operations & Healthcare catalogs
-- Idempotent — safe to re-run. Requires 20260824000013_demo_full_client_seed.sql

create or replace function _seed_demo_modules_extended(p_tenant uuid, p_code text, p_company text) returns void
language plpgsql as $$
declare
  cust_a uuid;
  cust_b uuid;
  sup_a uuid;
  prod_a uuid;
  prod_b uuid;
  wh_main uuid;
  wh_sec uuid;
  emp_staff uuid;
  emp_ceo uuid;
  inv_a uuid;
  po_a uuid;
  quo_a uuid;
  proj_a uuid;
  lead_a uuid;
  deal_a uuid;
  lt_annual uuid;
  sp_a uuid;
  pl_default uuid;
  so_a uuid;
  rfq_a uuid;
  grp_std uuid;
  pay_run uuid;
  pay_period text;
begin
  select id into cust_a from customers where tenant_id = p_tenant and customer_no = 'CUST-A-' || p_code limit 1;
  select id into cust_b from customers where tenant_id = p_tenant and customer_no = 'CUST-B-' || p_code limit 1;
  select id into sup_a from suppliers where tenant_id = p_tenant and supplier_no = 'SUP-A-' || p_code limit 1;
  select id into prod_a from products where tenant_id = p_tenant and sku = 'SKU-A-' || p_code limit 1;
  select id into prod_b from products where tenant_id = p_tenant and sku = 'SKU-B-' || p_code limit 1;
  select id into wh_main from warehouses where tenant_id = p_tenant and code = 'WH-01' limit 1;
  select id into emp_staff from employees where tenant_id = p_tenant and employee_no = 'EMP-01-' || p_code limit 1;
  select id into emp_ceo from employees where tenant_id = p_tenant and employee_no = 'EMP-CEO-' || p_code limit 1;
  select id into inv_a from invoices where tenant_id = p_tenant and invoice_no = 'INV-' || p_code || '-001' limit 1;
  select id into po_a from purchase_orders where tenant_id = p_tenant and purchase_order_no = 'PO-' || p_code || '-001' limit 1;
  select id into quo_a from quotations where tenant_id = p_tenant and quotation_no = 'QUO-' || p_code || '-001' limit 1;
  select id into proj_a from projects where tenant_id = p_tenant and project_no = 'PRJ-' || p_code || '-001' limit 1;
  select id into lead_a from leads where tenant_id = p_tenant and lead_no = 'LEAD-' || p_code || '-001' limit 1;
  select id into deal_a from deals where tenant_id = p_tenant and deal_no = 'DEAL-' || p_code || '-001' limit 1;
  select id into lt_annual from hrm_leave_types where tenant_id = p_tenant and code = 'ANNUAL' limit 1;
  select id into sp_a from salespeople where tenant_id = p_tenant limit 1;
  select id into pl_default from price_lists where tenant_id = p_tenant and is_default = true limit 1;

  wh_sec := ('00000000-0000-0000-0020-' || p_code || '00000001')::uuid;
  insert into warehouses (id, tenant_id, name, code, location, status, is_active) values
    (wh_sec, p_tenant, 'Secondary Warehouse', 'WH-02', 'Branch', 'active', true)
  on conflict (id) do nothing;
  if wh_main is null then select id into wh_main from warehouses where tenant_id = p_tenant limit 1; end if;

  insert into customer_groups (id, tenant_id, name, code, price_group, is_active) values
    (('00000000-0000-0000-0021-' || p_code || '00000001')::uuid, p_tenant, 'Premium', 'PREM', 'premium', true)
  on conflict (tenant_id, code) do nothing;
  select id into grp_std from customer_groups where tenant_id = p_tenant and code = 'STD' limit 1;

  if cust_a is not null then
    insert into crm_contacts (id, tenant_id, customer_id, full_name, email, phone, designation, is_primary, is_active) values
      (('00000000-0000-0000-0022-' || p_code || '00000001')::uuid, p_tenant, cust_a, 'Primary Contact ' || p_code, 'contact-a-' || p_code || '@example.com', '+000 777 0001', 'Procurement Manager', true, true),
      (('00000000-0000-0000-0022-' || p_code || '00000002')::uuid, p_tenant, cust_a, 'Finance Contact ' || p_code, 'finance-a-' || p_code || '@example.com', '+000 777 0002', 'AP Clerk', false, true)
    on conflict (id) do nothing;
  end if;

  insert into crm_campaigns (id, tenant_id, campaign_no, name, channel, status, budget, spend, start_date, end_date, is_active) values
    (('00000000-0000-0000-0023-' || p_code || '00000001')::uuid, p_tenant, 'CMP-' || p_code || '-001', p_company || ' Q3 outreach', 'email', 'active', 15000, 4200, current_date - 30, current_date + 30, true)
  on conflict (tenant_id, campaign_no) do nothing;

  if cust_a is not null then
    insert into crm_tickets (id, tenant_id, ticket_no, customer_id, subject, description, priority, status, sla_hours, is_active) values
      (('00000000-0000-0000-0024-' || p_code || '00000001')::uuid, p_tenant, 'TKT-' || p_code || '-001', cust_a, 'Delivery delay inquiry', 'Customer asking for ETA on last shipment.', 'high', 'open', 24, true),
      (('00000000-0000-0000-0024-' || p_code || '00000002')::uuid, p_tenant, 'TKT-' || p_code || '-002', cust_a, 'Invoice clarification', 'Need copy of tax breakdown.', 'medium', 'in_progress', 48, true)
    on conflict (tenant_id, ticket_no) do nothing;
  end if;

  if pl_default is null then
    pl_default := ('00000000-0000-0000-0025-' || p_code || '00000001')::uuid;
    insert into price_lists (id, tenant_id, name, currency, is_default, is_active) values
      (pl_default, p_tenant, 'Standard', 'USD', true, true)
    on conflict (id) do nothing;
  end if;

  if pl_default is not null and prod_a is not null then
    insert into price_list_items (id, tenant_id, price_list_id, product_id, min_qty, unit_price, is_active) values
      (('00000000-0000-0000-0026-' || p_code || '00000001')::uuid, p_tenant, pl_default, prod_a, 1, 75, true),
      (('00000000-0000-0000-0026-' || p_code || '00000002')::uuid, p_tenant, pl_default, prod_b, 1, 180, true)
    on conflict (id) do nothing;
  end if;

  insert into discount_schemes (id, tenant_id, name, kind, percent, min_qty, valid_from, valid_until, is_active) values
    (('00000000-0000-0000-0027-' || p_code || '00000001')::uuid, p_tenant, 'Volume 5%', 'volume', 5, 50, current_date - 90, current_date + 365, true)
  on conflict (id) do nothing;

  if cust_a is not null then
    so_a := ('00000000-0000-0000-0028-' || p_code || '00000001')::uuid;
    insert into sales_orders (id, tenant_id, order_no, customer_name, customer_id, order_date, status, total_amount, quotation_id, warehouse_id, is_active) values
      (so_a, p_tenant, 'SO-' || p_code || '-001', p_company || ' Customer A', cust_a, current_date - 10, 'confirmed', 52000, quo_a, wh_main, true)
    on conflict (tenant_id, order_no) do nothing;

    insert into delivery_notes (id, tenant_id, delivery_no, sales_order_id, customer_name, delivery_date, status, warehouse_id, transporter, tracking_no, is_active) values
      (('00000000-0000-0000-0029-' || p_code || '00000001')::uuid, p_tenant, 'DN-' || p_code || '-001', so_a, p_company || ' Customer A', current_date - 3, 'delivered', wh_main, 'Demo Logistics', 'TRK-' || p_code || '-001', true)
    on conflict (tenant_id, delivery_no) do nothing;

    insert into sales_returns (id, tenant_id, return_no, customer_name, invoice_no, return_date, status, total_amount, reason, warehouse_id, is_active) values
      (('00000000-0000-0000-002a-' || p_code || '00000001')::uuid, p_tenant, 'SR-' || p_code || '-001', p_company || ' Customer A', 'INV-' || p_code || '-001', current_date - 2, 'approved', 2500, 'Damaged carton', wh_main, true)
    on conflict (tenant_id, return_no) do nothing;

    insert into credit_notes (id, tenant_id, credit_note_no, customer_name, invoice_no, note_date, amount, reason, status, is_active) values
      (('00000000-0000-0000-002b-' || p_code || '00000001')::uuid, p_tenant, 'CN-' || p_code || '-001', p_company || ' Customer A', 'INV-' || p_code || '-001', current_date - 1, 2500, 'Sales return credit', 'open', true)
    on conflict (tenant_id, credit_note_no) do nothing;

    insert into debit_notes (id, tenant_id, debit_note_no, party_name, party_type, source_no, note_date, amount, reason, status, is_active) values
      (('00000000-0000-0000-002c-' || p_code || '00000001')::uuid, p_tenant, 'DBN-' || p_code || '-001', p_company || ' Customer B', 'customer', 'INV-' || p_code || '-001', current_date, 500, 'Freight charge', 'open', true)
    on conflict (tenant_id, debit_note_no) do nothing;
  end if;

  insert into purchase_requisitions (id, tenant_id, requisition_no, requested_by, department, status, needed_by, total_amount, is_active) values
    (('00000000-0000-0000-002d-' || p_code || '00000001')::uuid, p_tenant, 'PR-' || p_code || '-001', 'Ops Lead', 'Operations', 'approved', current_date + 7, 12000, true)
  on conflict (tenant_id, requisition_no) do nothing;

  rfq_a := ('00000000-0000-0000-002e-' || p_code || '00000001')::uuid;
  insert into purchase_rfqs (id, tenant_id, rfq_no, title, status, due_date, is_active) values
    (rfq_a, p_tenant, 'RFQ-' || p_code || '-001', 'Raw materials quote ' || p_code, 'open', current_date + 14, true)
  on conflict (tenant_id, rfq_no) do nothing;

  if sup_a is not null and rfq_a is not null then
    insert into vendor_quotes (id, tenant_id, rfq_id, supplier_id, supplier_name, total_amount, valid_until, status, is_active) values
      (('00000000-0000-0000-002f-' || p_code || '00000001')::uuid, p_tenant, rfq_a, sup_a, p_company || ' Supplier', 11500, current_date + 21, 'received', true)
    on conflict (id) do nothing;
  end if;

  if po_a is not null and sup_a is not null then
    insert into goods_receipts (id, tenant_id, receipt_no, purchase_order_no, purchase_order_id, supplier_name, receipt_date, status, warehouse_id, qc_status, is_active) values
      (('00000000-0000-0000-0030-' || p_code || '00000001')::uuid, p_tenant, 'GRN-' || p_code || '-001', 'PO-' || p_code || '-001', po_a, p_company || ' Supplier', current_date - 2, 'posted', wh_main, 'passed', true)
    on conflict (tenant_id, receipt_no) do nothing;

    insert into vendor_bills (id, tenant_id, bill_no, supplier_name, bill_date, due_date, status, total_amount, paid_amount, purchase_order_id, match_status, is_active) values
      (('00000000-0000-0000-0031-' || p_code || '00000001')::uuid, p_tenant, 'VB-' || p_code || '-001', p_company || ' Supplier', current_date - 2, current_date + 28, 'partially_paid', 18000, 8000, po_a, 'matched', true)
    on conflict (tenant_id, bill_no) do nothing;

    insert into vendor_payments (id, tenant_id, payment_no, supplier_name, payment_date, amount, payment_method, bill_no, is_active) values
      (('00000000-0000-0000-0032-' || p_code || '00000001')::uuid, p_tenant, 'VP-' || p_code || '-001', p_company || ' Supplier', current_date - 1, 8000, 'bank', 'VB-' || p_code || '-001', true)
    on conflict (tenant_id, payment_no) do nothing;
  end if;

  insert into match_tolerances (id, tenant_id, qty_pct, amount_pct, is_active) values
    (('00000000-0000-0000-0033-' || p_code || '00000001')::uuid, p_tenant, 2, 2, true)
  on conflict (tenant_id) do nothing;

  if prod_a is not null and wh_main is not null then
    insert into stock_movements (id, tenant_id, product_id, warehouse_id, movement_type, reference_type, quantity, unit_cost, movement_date, notes, is_active) values
      (('00000000-0000-0000-0034-' || p_code || '00000001')::uuid, p_tenant, prod_a, wh_main, 'in', 'goods_receipt', 100, 50, now() - interval '2 days', 'GRN receipt', true),
      (('00000000-0000-0000-0034-' || p_code || '00000002')::uuid, p_tenant, prod_a, wh_main, 'out', 'sales_order', 25, 50, now() - interval '1 day', 'SO shipment', true)
    on conflict (id) do nothing;

    if wh_sec is not null then
      insert into stock_transfers (id, tenant_id, transfer_no, product_id, from_warehouse_id, to_warehouse_id, quantity, transfer_date, status, is_active) values
        (('00000000-0000-0000-0035-' || p_code || '00000001')::uuid, p_tenant, 'ST-' || p_code || '-001', prod_a, wh_main, wh_sec, 15, current_date - 4, 'completed', true)
      on conflict (tenant_id, transfer_no) do nothing;
    end if;

    insert into stock_adjustments (id, tenant_id, adjustment_no, product_id, warehouse_id, quantity_delta, reason, adjustment_date, is_active) values
      (('00000000-0000-0000-0036-' || p_code || '00000001')::uuid, p_tenant, 'ADJ-' || p_code || '-001', prod_a, wh_main, -2, 'Cycle count variance', current_date - 6, true)
    on conflict (tenant_id, adjustment_no) do nothing;
  end if;

  insert into income_entries (id, tenant_id, income_no, income_date, account_name, amount, description, is_active) values
    (('00000000-0000-0000-0037-' || p_code || '00000001')::uuid, p_tenant, 'INC-' || p_code || '-001', current_date - 5, 'Sales Revenue', 8500, 'Misc service income', true)
  on conflict (tenant_id, income_no) do nothing;

  insert into journal_entries (id, tenant_id, journal_no, journal_date, account_name, debit, credit, memo, is_active) values
    (('00000000-0000-0000-0038-' || p_code || '00000001')::uuid, p_tenant, 'JE-' || p_code || '-001', current_date - 4, 'Cash', 42000, 0, 'Customer receipt', true),
    (('00000000-0000-0000-0038-' || p_code || '00000002')::uuid, p_tenant, 'JE-' || p_code || '-001', current_date - 4, 'Accounts Receivable', 0, 42000, 'Customer receipt', true)
  on conflict (id) do nothing;

  if po_a is not null then
    insert into ops_approvals (id, tenant_id, module, entity_name, entity_id, title, status, requested_by, is_active) values
      (('00000000-0000-0000-0039-' || p_code || '00000001')::uuid, p_tenant, 'purchase', 'purchase_order', po_a, 'Approve PO-' || p_code || '-001', 'approved', 'gm.' || p_code || '@demo.com', true)
    on conflict (id) do nothing;
  end if;

  if proj_a is not null then
    insert into project_timesheets (id, tenant_id, project_id, person, project_name, hours, week, is_active) values
      (('00000000-0000-0000-003a-' || p_code || '00000001')::uuid, p_tenant, proj_a, 'Consultant ' || p_code, p_company || ' ERP rollout', 16, to_char(current_date, 'IYYY-"W"IW'), true),
      (('00000000-0000-0000-003a-' || p_code || '00000002')::uuid, p_tenant, proj_a, 'Staff Member ' || p_code, p_company || ' ERP rollout', 8, to_char(current_date, 'IYYY-"W"IW'), true)
    on conflict (id) do nothing;
  end if;

  insert into hrm_candidates (id, tenant_id, full_name, email, phone, position, stage, source, is_active) values
    (('00000000-0000-0000-003b-' || p_code || '00000001')::uuid, p_tenant, 'Candidate One ' || p_code, 'candidate1.' || p_code || '@example.com', '+000 888 0001', 'Sales Executive', 'interview', 'LinkedIn', true),
    (('00000000-0000-0000-003b-' || p_code || '00000002')::uuid, p_tenant, 'Candidate Two ' || p_code, 'candidate2.' || p_code || '@example.com', '+000 888 0002', 'Warehouse Associate', 'offer', 'Referral', true)
  on conflict (id) do nothing;

  if emp_staff is not null then
    insert into hrm_onboarding_tasks (id, tenant_id, employee_id, title, status, due_date, is_active) values
      (('00000000-0000-0000-003c-' || p_code || '00000001')::uuid, p_tenant, emp_staff, 'Complete policy handbook', 'done', current_date - 20, true),
      (('00000000-0000-0000-003c-' || p_code || '00000002')::uuid, p_tenant, emp_staff, 'IT access & email setup', 'in_progress', current_date + 3, true)
    on conflict (id) do nothing;

    insert into hrm_timesheets (id, tenant_id, employee_id, work_date, hours, project, notes, status, is_active) values
      (('00000000-0000-0000-003d-' || p_code || '00000001')::uuid, p_tenant, emp_staff, current_date - 1, 8, 'Operations', 'Floor duties', 'approved', true),
      (('00000000-0000-0000-003d-' || p_code || '00000002')::uuid, p_tenant, emp_staff, current_date - 2, 7.5, 'Operations', 'Inventory count support', 'submitted', true)
    on conflict (id) do nothing;
  end if;

  if emp_staff is not null and lt_annual is not null then
    insert into leave_requests (id, tenant_id, employee_id, leave_type_id, leave_type, start_date, end_date, total_days, reason, status, is_active) values
      (('00000000-0000-0000-003e-' || p_code || '00000001')::uuid, p_tenant, emp_staff, lt_annual, 'Annual Leave', current_date + 14, current_date + 16, 3, 'Family event', 'pending', true),
      (('00000000-0000-0000-003e-' || p_code || '00000002')::uuid, p_tenant, emp_staff, lt_annual, 'Annual Leave', current_date - 30, current_date - 28, 3, 'Personal', 'approved', true)
    on conflict (id) do nothing;
  end if;

  insert into hrm_assets (id, tenant_id, tag_code, name, category, assigned_employee_id, status, notes, is_active) values
    (('00000000-0000-0000-003f-' || p_code || '00000001')::uuid, p_tenant, 'AST-' || p_code || '-001', 'Laptop Dell 5540', 'IT', emp_ceo, 'assigned', 'Issued to GM', true),
    (('00000000-0000-0000-003f-' || p_code || '00000002')::uuid, p_tenant, 'AST-' || p_code || '-002', 'Forklift FL-02', 'Plant', null, 'available', 'Warehouse equipment', true)
  on conflict (tenant_id, tag_code) do nothing;

  pay_period := to_char(current_date, 'YYYY-MM');
  pay_run := ('00000000-0000-0000-0040-' || p_code || '00000001')::uuid;
  insert into hrm_payroll_runs (id, tenant_id, period, status, total_gross, total_net, employee_count, is_active) values
    (pay_run, p_tenant, pay_period, 'finalized', 18900, 16200, 3, true)
  on conflict (tenant_id, period) do nothing;
  select id into pay_run from hrm_payroll_runs where tenant_id = p_tenant and period = pay_period limit 1;
  if pay_run is not null and emp_staff is not null then
    insert into hrm_payroll_items (id, tenant_id, run_id, employee_id, basic, allowances, deductions, pf, net, is_active) values
      (('00000000-0000-0000-0041-' || p_code || '00000001')::uuid, p_tenant, pay_run, emp_staff, 4200, 300, 150, 210, 4140, true)
    on conflict (id) do nothing;
  end if;

  -- Finance / inventory / operations / healthcare catalog rows (world-CRUD pages)
  insert into catalog_records (id, tenant_id, slug, status, payload, is_active) values
    (('00000000-0000-0000-0042-' || p_code || '00000001')::uuid, p_tenant, 'finance.bank_accounts', 'active', jsonb_build_object('code', 'BA-' || p_code, 'name', p_company || ' Operating', 'bank_name', p_company || ' Bank', 'currency', 'USD'), true),
    (('00000000-0000-0000-0042-' || p_code || '00000002')::uuid, p_tenant, 'finance.cheques', 'active', jsonb_build_object('cheque_no', 'CHQ-' || p_code || '-001', 'party_name', p_company || ' Customer A', 'cheque_date', current_date + 7, 'amount', 22000, 'type', 'received'), true),
    (('00000000-0000-0000-0042-' || p_code || '00000003')::uuid, p_tenant, 'finance.fiscal_years', 'active', jsonb_build_object('code', 'FY26', 'name', 'FY 2026', 'start_date', '2026-01-01', 'end_date', '2026-12-31'), true),
    (('00000000-0000-0000-0042-' || p_code || '00000004')::uuid, p_tenant, 'finance.reconciliation', 'active', jsonb_build_object('statement_date', current_date - 3, 'bank_account', 'BA-' || p_code, 'statement_balance', 125000, 'book_balance', 124500), true),
    (('00000000-0000-0000-0043-' || p_code || '00000001')::uuid, p_tenant, 'inventory.uom', 'active', jsonb_build_object('code', 'PCS', 'name', 'Pieces', 'ratio', 1), true),
    (('00000000-0000-0000-0043-' || p_code || '00000002')::uuid, p_tenant, 'inventory.batches', 'active', jsonb_build_object('batch_no', 'LOT-' || p_code || '-001', 'product_name', p_company || ' Product A', 'qty', 120, 'expiry_date', current_date + 180), true),
    (('00000000-0000-0000-0043-' || p_code || '00000003')::uuid, p_tenant, 'inventory.brands', 'active', jsonb_build_object('code', 'BR-' || p_code, 'name', p_company || ' Brand'), true),
    (('00000000-0000-0000-0044-' || p_code || '00000001')::uuid, p_tenant, 'operations.bom', 'active', jsonb_build_object('code', 'BOM-' || p_code, 'finished_item', p_company || ' Product A', 'component', 'Raw material', 'qty', 2), true),
    (('00000000-0000-0000-0044-' || p_code || '00000002')::uuid, p_tenant, 'operations.maintenance', 'active', jsonb_build_object('order_no', 'MO-' || p_code || '-001', 'asset_name', 'Forklift FL-02', 'kind', 'preventive', 'due_date', current_date + 10), true),
    (('00000000-0000-0000-0044-' || p_code || '00000003')::uuid, p_tenant, 'operations.inspections', 'active', jsonb_build_object('insp_no', 'QC-' || p_code || '-001', 'item', p_company || ' Product A', 'stage', 'incoming', 'result_notes', 'Sample passed'), true),
    (('00000000-0000-0000-0044-' || p_code || '00000004')::uuid, p_tenant, 'operations.contracts', 'active', jsonb_build_object('contract_no', 'CON-' || p_code || '-001', 'title', 'AMC Plant equipment', 'party_name', p_company || ' Supplier', 'kind', 'amc', 'value', 48000), true),
    (('00000000-0000-0000-0044-' || p_code || '00000005')::uuid, p_tenant, 'operations.fleet', 'active', jsonb_build_object('reg_no', 'REG-' || p_code, 'make', 'Toyota', 'model', 'Hilux', 'driver', 'Driver ' || p_code), true),
    (('00000000-0000-0000-0045-' || p_code || '00000001')::uuid, p_tenant, 'healthcare.doctors', 'active', jsonb_build_object('name', 'Dr. Demo ' || p_code, 'specialty', 'General Medicine', 'phone', '+000 666 0001'), true),
    (('00000000-0000-0000-0045-' || p_code || '00000002')::uuid, p_tenant, 'healthcare.appointments', 'active', jsonb_build_object('appt_no', 'APT-' || p_code || '-001', 'patient_name', 'Demo Patient ' || p_code, 'doctor_name', 'Dr. Demo ' || p_code, 'appt_date', current_date + 1, 'status', 'scheduled'), true),
    (('00000000-0000-0000-0045-' || p_code || '00000003')::uuid, p_tenant, 'healthcare.opd', 'active', jsonb_build_object('visit_no', 'OPD-' || p_code || '-001', 'patient_name', 'Demo Patient ' || p_code, 'complaint', 'Routine checkup'), true),
    (('00000000-0000-0000-0045-' || p_code || '00000004')::uuid, p_tenant, 'healthcare.pharmacy', 'active', jsonb_build_object('item_code', 'RX-' || p_code, 'name', 'Paracetamol 500mg', 'stock', 500), true),
    (('00000000-0000-0000-0045-' || p_code || '00000005')::uuid, p_tenant, 'healthcare.lab_tests', 'active', jsonb_build_object('test_code', 'CBC', 'name', 'Complete Blood Count', 'price', 35), true),
    (('00000000-0000-0000-0045-' || p_code || '00000006')::uuid, p_tenant, 'healthcare.admissions', 'active', jsonb_build_object('admission_no', 'ADM-' || p_code || '-001', 'patient_name', 'Demo Patient ' || p_code, 'ward', 'General', 'status', 'admitted'), true),
    (('00000000-0000-0000-0045-' || p_code || '00000007')::uuid, p_tenant, 'healthcare.prescriptions', 'active', jsonb_build_object('rx_no', 'RX-' || p_code || '-001', 'patient_name', 'Demo Patient ' || p_code, 'medicine', 'Amoxicillin 500mg', 'qty', 21), true)
  on conflict (id) do nothing;
end;
$$;

select _seed_demo_modules_extended('00000000-0000-0000-0000-000000000101', '0101', 'Alpha Trading LLC');
select _seed_demo_modules_extended('00000000-0000-0000-0000-000000000102', '0102', 'Medix Pharmacy Supplies');
select _seed_demo_modules_extended('00000000-0000-0000-0000-000000000103', '0103', 'AutoParts Distribution');
select _seed_demo_modules_extended('00000000-0000-0000-0000-000000000104', '0104', 'Textile Manufacturing Co.');

drop function if exists _seed_demo_modules_extended(uuid, text, text);

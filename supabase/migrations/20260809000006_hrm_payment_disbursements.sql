-- Extend HRM payment txns for company → employee salary disbursements
alter table hrm_payment_txns
  add column if not exists employee_id uuid references employees(id),
  add column if not exists purpose text not null default 'salary',
  add column if not exists payroll_run_id uuid references hrm_payroll_runs(id) on delete set null,
  add column if not exists payroll_item_id uuid references hrm_payroll_items(id) on delete set null,
  add column if not exists bank_name text,
  add column if not exists bank_account text;

create index if not exists idx_hrm_payment_txns_employee on hrm_payment_txns(tenant_id, employee_id);
create index if not exists idx_hrm_payment_txns_payroll on hrm_payment_txns(tenant_id, payroll_run_id);

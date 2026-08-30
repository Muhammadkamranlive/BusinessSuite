-- HRM employee loans — policy, EMI schedule, payroll recovery

create table if not exists hrm_loan_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null default 'Standard',
  max_loan_amount numeric not null default 500000,
  max_salary_pct numeric not null default 40,
  min_tenure_months integer not null default 6,
  max_concurrent_loans integer not null default 1,
  default_interest_rate numeric not null default 0,
  max_tenure_months integer not null default 24,
  allow_on_probation boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (tenant_id)
);

alter table hrm_loans
  add column if not exists loan_type text not null default 'salary_advance',
  add column if not exists interest_rate numeric not null default 0,
  add column if not exists tenure_months integer not null default 12,
  add column if not exists outstanding_balance numeric not null default 0,
  add column if not exists disbursed_at timestamptz,
  add column if not exists approved_by text,
  add column if not exists approved_at timestamptz,
  add column if not exists policy_id uuid references hrm_loan_policies(id);

create table if not exists hrm_loan_installments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  loan_id uuid not null references hrm_loans(id) on delete cascade,
  installment_no integer not null,
  due_date date not null,
  principal_amount numeric not null default 0,
  interest_amount numeric not null default 0,
  total_amount numeric not null default 0,
  status text not null default 'pending',
  paid_at timestamptz,
  payroll_run_id uuid references hrm_payroll_runs(id) on delete set null,
  payroll_item_id uuid references hrm_payroll_items(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (loan_id, installment_no)
);

alter table hrm_payroll_items
  add column if not exists loan_deduction numeric not null default 0;

alter table hrm_payment_txns
  add column if not exists loan_id uuid references hrm_loans(id) on delete set null;

create index if not exists idx_hrm_loan_installments_loan on hrm_loan_installments(tenant_id, loan_id, status);
create index if not exists idx_hrm_loan_policies_tenant on hrm_loan_policies(tenant_id);

alter table hrm_loan_policies enable row level security;
alter table hrm_loan_installments enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'hrm_loan_policies' and policyname = 'hrm_loan_policies_tenant_isolation') then
    create policy hrm_loan_policies_tenant_isolation on hrm_loan_policies for all
      using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'hrm_loan_installments' and policyname = 'hrm_loan_installments_tenant_isolation') then
    create policy hrm_loan_installments_tenant_isolation on hrm_loan_installments for all
      using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());
  end if;
end $$;

insert into hrm_loan_policies (tenant_id, name, max_loan_amount, max_salary_pct, min_tenure_months, max_concurrent_loans, default_interest_rate, max_tenure_months, allow_on_probation)
select id, 'Standard employee loan policy', 500000, 40, 6, 1, 0, 24, false from tenants
on conflict (tenant_id) do nothing;

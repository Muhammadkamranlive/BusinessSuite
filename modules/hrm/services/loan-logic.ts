import type { Employee, Loan, LoanInstallment, LoanPolicy } from "@/modules/hrm/model";
import { allowanceTotal } from "@/modules/hrm/services/compensation";

export type LoanEligibilityResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  grossSalary: number;
  tenureMonths: number;
  maxAllowedAmount: number;
};

export function employeeGrossSalary(employee: Employee) {
  return employee.basic_salary + allowanceTotal(employee);
}

export function employeeTenureMonths(employee: Employee, asOf = new Date()) {
  const start = new Date(employee.joining_date);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, (asOf.getFullYear() - start.getFullYear()) * 12 + (asOf.getMonth() - start.getMonth()));
}

export function computeEmi(principal: number, annualRatePct: number, tenureMonths: number) {
  if (tenureMonths <= 0 || principal <= 0) return 0;
  if (annualRatePct <= 0) return Math.round((principal / tenureMonths) * 100) / 100;
  const r = annualRatePct / 12 / 100;
  const factor = Math.pow(1 + r, tenureMonths);
  const emi = (principal * r * factor) / (factor - 1);
  return Math.round(emi * 100) / 100;
}

export type ScheduleRow = Omit<LoanInstallment, "id" | "tenant_id" | "loan_id" | "created_at" | "updated_at" | "is_active" | "paid_at" | "payroll_run_id" | "payroll_item_id">;

export function buildInstallmentSchedule(
  principal: number,
  annualRatePct: number,
  tenureMonths: number,
  startDate: string
): ScheduleRow[] {
  const emi = computeEmi(principal, annualRatePct, tenureMonths);
  const rows: ScheduleRow[] = [];
  let balance = principal;
  const r = annualRatePct > 0 ? annualRatePct / 12 / 100 : 0;
  const start = new Date(startDate);

  for (let n = 1; n <= tenureMonths; n += 1) {
    const due = new Date(start.getFullYear(), start.getMonth() + n, start.getDate());
    const interest = r > 0 ? Math.round(balance * r * 100) / 100 : 0;
    let principalPart = Math.round((emi - interest) * 100) / 100;
    if (n === tenureMonths) {
      principalPart = Math.round(balance * 100) / 100;
    }
    const total = Math.round((principalPart + interest) * 100) / 100;
    balance = Math.max(0, Math.round((balance - principalPart) * 100) / 100);
    rows.push({
      installment_no: n,
      due_date: due.toISOString().slice(0, 10),
      principal_amount: principalPart,
      interest_amount: interest,
      total_amount: total,
      status: "pending"
    });
  }
  return rows;
}

export function checkLoanEligibility(
  policy: LoanPolicy,
  employee: Employee,
  amount: number,
  tenureMonths: number,
  activeLoanCount: number
): LoanEligibilityResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const grossSalary = employeeGrossSalary(employee);
  const tenureMonthsActual = employeeTenureMonths(employee);
  const salaryCap = Math.round((grossSalary * policy.max_salary_pct) / 100);
  const maxAllowedAmount = Math.min(policy.max_loan_amount, salaryCap);

  if (employee.status !== "active") errors.push("Employee is not active.");
  if (!policy.allow_on_probation && (employee.status === "onboarding" || tenureMonthsActual < policy.min_tenure_months)) {
    errors.push(`Minimum tenure is ${policy.min_tenure_months} months (current: ${tenureMonthsActual}).`);
  }
  if (amount <= 0) errors.push("Loan amount must be greater than zero.");
  if (amount > policy.max_loan_amount) errors.push(`Amount exceeds policy maximum (${policy.max_loan_amount}).`);
  if (amount > salaryCap) errors.push(`Amount exceeds ${policy.max_salary_pct}% of gross salary (${salaryCap}).`);
  if (amount > maxAllowedAmount) errors.push(`Maximum allowed for this employee is ${maxAllowedAmount}.`);
  if (tenureMonths <= 0 || tenureMonths > policy.max_tenure_months) {
    errors.push(`Tenure must be between 1 and ${policy.max_tenure_months} months.`);
  }
  if (activeLoanCount >= policy.max_concurrent_loans) {
    errors.push(`Employee already has ${activeLoanCount} active loan(s); policy allows ${policy.max_concurrent_loans}.`);
  }

  const emi = computeEmi(amount, policy.default_interest_rate, tenureMonths);
  if (emi > grossSalary * 0.5) warnings.push("EMI exceeds 50% of gross salary — review affordability.");

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    grossSalary,
    tenureMonths: tenureMonthsActual,
    maxAllowedAmount
  };
}

export function loanOutstandingFromSchedule(installments: LoanInstallment[]) {
  return installments
    .filter((i) => i.status === "pending" || i.status === "overdue")
    .reduce((sum, i) => sum + i.total_amount, 0);
}

export function defaultLoanPolicy(tenantId: string): Omit<LoanPolicy, "id" | "created_at" | "updated_at"> {
  return {
    tenant_id: tenantId,
    name: "Standard employee loan policy",
    max_loan_amount: 500_000,
    max_salary_pct: 40,
    min_tenure_months: 6,
    max_concurrent_loans: 1,
    default_interest_rate: 0,
    max_tenure_months: 24,
    allow_on_probation: false,
    is_active: true
  };
}

export function normalizeLoanFields(loan: Loan): Loan {
  return {
    ...loan,
    interest_rate: Number(loan.interest_rate) || 0,
    tenure_months: Number(loan.tenure_months) || 12,
    outstanding_balance: Number(loan.outstanding_balance ?? loan.amount) || 0,
    repayment_amount: Number(loan.repayment_amount) || 0
  };
}

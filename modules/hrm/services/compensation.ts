import type { Employee } from "@/modules/hrm/model";

export function housingAllowance(employee: Employee) {
  return employee.housing_allowance ?? Math.round(employee.basic_salary * 0.1);
}

export function transportAllowance(employee: Employee) {
  return employee.transport_allowance ?? Math.round(employee.basic_salary * 0.05);
}

export function medicalAllowance(employee: Employee) {
  return employee.medical_allowance ?? Math.round(employee.basic_salary * 0.03);
}

export function otherAllowance(employee: Employee) {
  return employee.other_allowance ?? 0;
}

export function allowanceTotal(employee: Employee) {
  return housingAllowance(employee) + transportAllowance(employee) + medicalAllowance(employee) + otherAllowance(employee);
}

export function grossPay(employee: Employee) {
  return employee.basic_salary + allowanceTotal(employee);
}

export function isPfEnrolled(employee: Employee) {
  return employee.pf_enrolled !== false && employee.status === "active";
}

export function isEobiEnrolled(employee: Employee) {
  return employee.eobi_enrolled !== false && (employee.status === "active" || employee.status === "onboarding");
}

/** Demo income-tax withholding: filers 1% of gross, non-filers 2%. */
export function estimatedIncomeTax(employee: Employee) {
  const rate = employee.tax_status === "non_filer" ? 0.02 : 0.01;
  return Math.round(grossPay(employee) * rate);
}

export function tenureLabel(joiningDate: string) {
  const start = new Date(joiningDate);
  if (Number.isNaN(start.getTime())) return "—";
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years <= 0) return `${rem} mo`;
  if (rem === 0) return `${years} yr`;
  return `${years} yr ${rem} mo`;
}

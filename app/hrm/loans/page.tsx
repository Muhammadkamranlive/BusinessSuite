"use client";

import { Fragment, useMemo, useState } from "react";
import { Ban, CheckCircle2, ChevronDown, ChevronUp, HandCoins, PlayCircle, Wallet, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { StatusBadge } from "@/components/common/status-badge";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Button, Field, Panel, SelectInput, StatTile, TextArea, TextInput } from "@/components/ui";
import { money } from "@/lib/utils";
import { getStoredTenantId, getStoredUserEmail } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import type { Loan, LoanType } from "@/modules/hrm/model";
import {
  activateLoan,
  approveLoan,
  closeLoan,
  createLoan,
  evaluateLoanEligibility,
  getEmployeeName,
  getLoanOutstandingTotal,
  getLoanPolicy,
  listEmployees,
  listLoanInstallments,
  listLoans,
  previewLoanEmi,
  rejectLoan,
  saveLoanPolicy
} from "@/modules/hrm/services/hrm.store";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const loanTypes: LoanType[] = ["salary_advance", "emergency", "housing"];

export default function LoansPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [refreshKey, setRefreshKey] = useState(0);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
  const [form, setForm] = useState({
    employee_id: "",
    amount: "",
    tenure_months: "12",
    loan_type: "salary_advance" as LoanType,
    start_date: todayIso(),
    reason: ""
  });
  const [policyForm, setPolicyForm] = useState(() => {
    const p = getLoanPolicy(tenantId);
    return {
      max_loan_amount: String(p.max_loan_amount),
      max_salary_pct: String(p.max_salary_pct),
      min_tenure_months: String(p.min_tenure_months),
      max_concurrent_loans: String(p.max_concurrent_loans),
      default_interest_rate: String(p.default_interest_rate),
      max_tenure_months: String(p.max_tenure_months),
      allow_on_probation: p.allow_on_probation
    };
  });
  const [extraJson, setExtraJson] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rejectTarget, setRejectTarget] = useState<Loan | null>(null);
  const [closeTarget, setCloseTarget] = useState<Loan | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("start_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const employees = useMemo(() => listEmployees(tenantId), [tenantId, refreshKey]);
  const loans = useMemo(() => listLoans(tenantId), [tenantId, refreshKey]);
  const policy = useMemo(() => getLoanPolicy(tenantId), [tenantId, refreshKey]);

  const amountNum = Number(form.amount) || 0;
  const tenureNum = Number(form.tenure_months) || 0;
  const emiPreview = amountNum > 0 && tenureNum > 0 ? previewLoanEmi(tenantId, amountNum, tenureNum) : 0;
  const eligibility = form.employee_id && amountNum > 0 && tenureNum > 0
    ? evaluateLoanEligibility(tenantId, form.employee_id, amountNum, tenureNum)
    : null;

  const enriched = useMemo(
    () => loans.map((l) => ({ ...l, employee_name: getEmployeeName(l.employee_id) })),
    [loans]
  );

  const sortedLoans = useMemo(
    () =>
      filterAndSort(enriched as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["employee_name", "reason", "status", "loan_type"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as Array<Loan & { employee_name: string }>,
    [enriched, search, statusFilter, sortField, sortDir]
  );

  const pendingCount = loans.filter((l) => l.status === "pending").length;
  const activeCount = loans.filter((l) => l.status === "active").length;
  const outstandingTotal = getLoanOutstandingTotal(tenantId);

  function refresh() {
    setRefreshKey((n) => n + 1);
    setPolicyForm({
      max_loan_amount: String(policy.max_loan_amount),
      max_salary_pct: String(policy.max_salary_pct),
      min_tenure_months: String(policy.min_tenure_months),
      max_concurrent_loans: String(policy.max_concurrent_loans),
      default_interest_rate: String(policy.default_interest_rate),
      max_tenure_months: String(policy.max_tenure_months),
      allow_on_probation: policy.allow_on_probation
    });
  }

  function doCreate() {
    setError("");
    setNotice("");
    try {
      const row = createLoan(tenantId, {
        employee_id: form.employee_id,
        amount: amountNum,
        tenure_months: tenureNum,
        loan_type: form.loan_type,
        start_date: form.start_date,
        reason: form.reason.trim(),
        status: "pending"
      });
      persistExtraFields(tenantId, "hrm.loan", row.id, extraJson);
      setExtraJson("");
      setForm({ employee_id: "", amount: "", tenure_months: "12", loan_type: "salary_advance", start_date: todayIso(), reason: "" });
      setNotice("Loan application submitted for HR approval.");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create loan application.");
    }
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!eligibility?.ok) {
      setError(eligibility?.errors.join(" ") ?? "Fix eligibility issues before submitting.");
      return;
    }
    askSave({ editing: false, entityLabel: "loan application", onConfirm: doCreate });
  }

  function savePolicy() {
    saveLoanPolicy(tenantId, {
      max_loan_amount: Number(policyForm.max_loan_amount),
      max_salary_pct: Number(policyForm.max_salary_pct),
      min_tenure_months: Number(policyForm.min_tenure_months),
      max_concurrent_loans: Number(policyForm.max_concurrent_loans),
      default_interest_rate: Number(policyForm.default_interest_rate),
      max_tenure_months: Number(policyForm.max_tenure_months),
      allow_on_probation: policyForm.allow_on_probation
    });
    setNotice("Loan policy updated.");
    refresh();
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader
        title="Employee loans & advances"
        description="Policy-driven applications with EMI schedule, disbursement, and payroll recovery."
      />
      <ModuleBreadcrumbs />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Pending applications" value={String(pendingCount)} detail="Awaiting HR approval" icon={HandCoins} tone="amber" />
        <StatTile label="Active recoveries" value={String(activeCount)} detail="Installments running" icon={PlayCircle} tone="mint" />
        <StatTile label="Outstanding balance" value={money(outstandingTotal)} detail="Unpaid principal + interest" icon={Wallet} tone="coral" />
        <StatTile label="Interest rate (policy)" value={`${policy.default_interest_rate}%`} detail={`Max tenure ${policy.max_tenure_months} mo`} icon={HandCoins} tone="teal" />
      </div>

      {error ? <p className="mb-4 text-sm font-semibold text-[color:var(--bs-coral)]">{error}</p> : null}
      {notice ? <p className="mb-4 text-sm font-semibold text-emerald-600">{notice}</p> : null}

      <Panel className="mb-6">
        <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setPolicyOpen((v) => !v)}>
          <div>
            <h2 className="text-lg font-bold text-ink">Loan policy parameters</h2>
            <p className="text-sm text-slate-500">HR defines eligibility: max amount, salary %, tenure, concurrent loans, interest.</p>
          </div>
          {policyOpen ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
        </button>
        {policyOpen ? (
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: true, entityLabel: "loan policy", onConfirm: savePolicy });
            }}
          >
            <Field label="Max loan amount"><TextInput type="number" value={policyForm.max_loan_amount} onChange={(e) => setPolicyForm({ ...policyForm, max_loan_amount: e.target.value })} /></Field>
            <Field label="Max % of gross salary"><TextInput type="number" value={policyForm.max_salary_pct} onChange={(e) => setPolicyForm({ ...policyForm, max_salary_pct: e.target.value })} /></Field>
            <Field label="Min tenure (months)"><TextInput type="number" value={policyForm.min_tenure_months} onChange={(e) => setPolicyForm({ ...policyForm, min_tenure_months: e.target.value })} /></Field>
            <Field label="Max concurrent loans"><TextInput type="number" value={policyForm.max_concurrent_loans} onChange={(e) => setPolicyForm({ ...policyForm, max_concurrent_loans: e.target.value })} /></Field>
            <Field label="Default interest % p.a."><TextInput type="number" step="0.1" value={policyForm.default_interest_rate} onChange={(e) => setPolicyForm({ ...policyForm, default_interest_rate: e.target.value })} /></Field>
            <Field label="Max repayment (months)"><TextInput type="number" value={policyForm.max_tenure_months} onChange={(e) => setPolicyForm({ ...policyForm, max_tenure_months: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={policyForm.allow_on_probation} onChange={(e) => setPolicyForm({ ...policyForm, allow_on_probation: e.target.checked })} />
              Allow loans during probation / onboarding
            </label>
            <div className="sm:col-span-2 lg:col-span-4"><Button type="submit">Save policy</Button></div>
          </form>
        ) : null}
      </Panel>

      <Panel className="mb-6">
        <h2 className="mb-4 text-lg font-bold text-ink">New loan application</h2>
        <form onSubmit={submitForm} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Employee" className="lg:col-span-2">
            <SelectInput required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
              <option value="">Select employee…</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.employee_no} — {emp.full_name}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Loan type">
            <SelectInput value={form.loan_type} onChange={(e) => setForm({ ...form, loan_type: e.target.value as LoanType })}>
              {loanTypes.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </SelectInput>
          </Field>
          <Field label="Principal amount">
            <TextInput required type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="Repayment tenure (months)">
            <TextInput required type="number" min="1" max={policy.max_tenure_months} value={form.tenure_months} onChange={(e) => setForm({ ...form, tenure_months: e.target.value })} />
          </Field>
          <Field label="Recovery start date">
            <TextInput required type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </Field>
          <Field label="Calculated EMI (monthly)" className="lg:col-span-2">
            <TextInput readOnly value={emiPreview ? money(emiPreview) : "—"} />
          </Field>
          <Field label="Reason" className="sm:col-span-2 lg:col-span-4">
            <TextArea rows={2} required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </Field>
          {eligibility ? (
            <div className="sm:col-span-2 lg:col-span-4 rounded-[var(--bs-radius)] border border-line bg-cloud p-3 text-sm">
              <p className="font-semibold text-ink">Eligibility check</p>
              <p className="text-slate-600">Gross salary {money(eligibility.grossSalary)} · Tenure {eligibility.tenureMonths} mo · Max allowed {money(eligibility.maxAllowedAmount)}</p>
              {eligibility.errors.map((msg) => <p key={msg} className="text-rose-600">{msg}</p>)}
              {eligibility.warnings.map((msg) => <p key={msg} className="text-amber-700">{msg}</p>)}
              {eligibility.ok ? <p className="text-emerald-700">Eligible to submit.</p> : null}
            </div>
          ) : null}
          <ExtraFieldsBlock formKey="hrm.loan" valueJson={extraJson} onChange={setExtraJson} />
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={Boolean(eligibility && !eligibility.ok)}>Submit application</Button>
          </div>
        </form>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="p-4">
          <DataListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search employee, reason…"
            filterLabel="statuses"
            filterValue={statusFilter}
            filterOptions={["pending", "approved", "active", "rejected", "closed"].map((s) => ({ value: s, label: s }))}
            onFilterChange={setStatusFilter}
            sortValue={sortField}
            sortOptions={[
              { value: "start_date", label: "Start date" },
              { value: "amount", label: "Amount" },
              { value: "employee_name", label: "Employee" },
              { value: "status", label: "Status" }
            ]}
            onSortChange={setSortField}
            sortDir={sortDir}
            onSortDirChange={setSortDir}
            onExportCsv={() =>
              exportListCsv({
                tenantId,
                module: "hrm",
                filename: "employee-loans",
                rows: sortedLoans.map((loan) => ({
                  Employee: loan.employee_name,
                  Amount: loan.amount,
                  EMI: loan.repayment_amount,
                  Outstanding: loan.outstanding_balance ?? 0,
                  Tenure: loan.tenure_months ?? "",
                  Status: loan.status
                }))
              })
            }
            onExportPdf={() =>
              exportListPdf({
                tenantId,
                module: "hrm",
                title: "Employee loans",
                filename: "employee-loans",
                columns: ["Employee", "Amount", "EMI", "Status"],
                rows: sortedLoans.map((loan) => [loan.employee_name, money(loan.amount), money(loan.repayment_amount), loan.status])
              })
            }
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                {["Employee", "Principal", "EMI", "Tenure", "Outstanding", "Start", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedLoans.map((loan) => {
                const schedule = listLoanInstallments(loan.id);
                const open = expandedLoan === loan.id;
                return (
                  <Fragment key={loan.id}>
                    <tr key={loan.id} className="border-b border-line">
                      <td className="px-4 py-3 font-medium text-ink">
                        {loan.employee_name}
                        <ExtraFieldsReadout tenantId={tenantId} formKey="hrm.loan" recordId={loan.id} />
                      </td>
                      <td className="px-4 py-3">{money(loan.amount)}</td>
                      <td className="px-4 py-3">{money(loan.repayment_amount)}</td>
                      <td className="px-4 py-3">{loan.tenure_months ?? "—"} mo @ {loan.interest_rate ?? 0}%</td>
                      <td className="px-4 py-3">{money(loan.outstanding_balance ?? 0)}</td>
                      <td className="px-4 py-3">{loan.start_date}</td>
                      <td className="px-4 py-3"><StatusBadge status={loan.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Button type="button" variant="secondary" className="!min-h-8 !px-2 !text-xs" onClick={() => setExpandedLoan(open ? null : loan.id)}>
                            {open ? "Hide" : "Schedule"}
                          </Button>
                          {loan.status === "pending" ? (
                            <>
                              <Button type="button" className="!min-h-8 !px-2 !text-xs" onClick={() => askSave({ editing: true, entityLabel: "loan approval", onConfirm: () => { approveLoan(loan.id, getStoredUserEmail() ?? "hr"); refresh(); } })}>
                                <CheckCircle2 className="size-3.5" /> Approve
                              </Button>
                              <Button type="button" variant="secondary" className="!min-h-8 !px-2 !text-xs" onClick={() => setRejectTarget(loan)}>
                                <XCircle className="size-3.5" /> Reject
                              </Button>
                            </>
                          ) : null}
                          {loan.status === "approved" ? (
                            <Button type="button" className="!min-h-8 !px-2 !text-xs" onClick={() => askSave({ editing: false, entityLabel: "loan disbursement", onConfirm: () => { try { activateLoan(loan.id); refresh(); setNotice("Loan disbursed; recovery schedule started."); } catch (e) { setError(e instanceof Error ? e.message : "Activation failed."); } } })}>
                              <PlayCircle className="size-3.5" /> Disburse
                            </Button>
                          ) : null}
                          {loan.status === "active" ? (
                            <Button type="button" variant="secondary" className="!min-h-8 !px-2 !text-xs" onClick={() => setCloseTarget(loan)}>
                              <Ban className="size-3.5" /> Close
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {open && schedule.length > 0 ? (
                      <tr key={`${loan.id}-schedule`} className="border-b border-line bg-cloud/50">
                        <td colSpan={8} className="px-4 py-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">EMI schedule</p>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-slate-500">
                                <th className="py-1 text-left">#</th>
                                <th className="text-left">Due</th>
                                <th className="text-left">Principal</th>
                                <th className="text-left">Interest</th>
                                <th className="text-left">Installment</th>
                                <th className="text-left">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {schedule.map((inst) => (
                                <tr key={inst.id} className="border-t border-line/60">
                                  <td className="py-1">{inst.installment_no}</td>
                                  <td>{inst.due_date}</td>
                                  <td>{money(inst.principal_amount)}</td>
                                  <td>{money(inst.interest_amount)}</td>
                                  <td>{money(inst.total_amount)}</td>
                                  <td><StatusBadge status={inst.status} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
              {sortedLoans.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">No loan applications yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>

      <ConfirmDialog open={Boolean(rejectTarget)} title="Reject loan application?" message={rejectTarget ? `Reject ${money(rejectTarget.amount)} application for ${getEmployeeName(rejectTarget.employee_id)}?` : ""} confirmLabel="Reject" tone="danger" onCancel={() => setRejectTarget(null)} onConfirm={() => { if (rejectTarget) rejectLoan(rejectTarget.id); setRejectTarget(null); refresh(); }} />
      <ConfirmDialog open={Boolean(closeTarget)} title="Close loan?" message={closeTarget ? `Close loan for ${getEmployeeName(closeTarget.employee_id)} only if fully recovered.` : ""} confirmLabel="Close loan" onCancel={() => setCloseTarget(null)} onConfirm={() => { if (closeTarget) { try { closeLoan(closeTarget.id); refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Cannot close."); } } setCloseTarget(null); }} />
      {dialog}
    </AppShell>
  );
}

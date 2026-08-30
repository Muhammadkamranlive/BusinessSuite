"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ListChecks, Users, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { StatusBadge } from "@/components/common/status-badge";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Button, Field, Panel, StatTile, TextInput } from "@/components/ui";
import { money } from "@/lib/utils";
import { getStoredTenantId } from "@/lib/auth/session";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  finalizePayrollRun,
  getCompanyProfile,
  getEmployee,
  getEmployeeName,
  getPayrollItemsForRun,
  listPayrollItems,
  listPayrollRuns
} from "@/modules/hrm/services/hrm.store";
import { generatePayrollWorkday } from "@/modules/hrm/services/workday.store";
import type { PayrollRun } from "@/modules/hrm/model";
import { downloadBankLetter, downloadSalarySlip } from "@/modules/hrm/services/payroll-pdf";

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

const periodPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export default function PayrollPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [refreshKey, setRefreshKey] = useState(0);
  const [period, setPeriod] = useState(currentPeriod());
  const [extraJson, setExtraJson] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [finalizeTarget, setFinalizeTarget] = useState<PayrollRun | null>(null);

  const runs = useMemo(() => listPayrollRuns(tenantId), [tenantId, refreshKey]);
  const allItems = useMemo(() => listPayrollItems(tenantId), [tenantId, refreshKey]);

  const sortedRuns = useMemo(() => [...runs].sort((a, b) => (a.period < b.period ? 1 : -1)), [runs]);
  const selectedRun = sortedRuns.find((r) => r.id === selectedRunId) ?? sortedRuns[0] ?? null;
  const selectedItems = useMemo(() => (selectedRun ? getPayrollItemsForRun(selectedRun.id) : []), [selectedRun, refreshKey]);

  const draftRuns = runs.filter((r) => r.status === "draft").length;
  const finalizedRuns = runs.filter((r) => r.status === "finalized").length;
  const totalNetPaid = runs.filter((r) => r.status === "finalized").reduce((sum, r) => sum + r.total_net, 0);

  function refresh() {
    setRefreshKey((n) => n + 1);
  }

  function doGenerate() {
    setError("");
    setNotice("");
    if (!periodPattern.test(period)) {
      setError("Enter a valid period in YYYY-MM format.");
      return;
    }
    if (runs.some((r) => r.period === period)) {
      setError(`A payroll run for ${period} already exists.`);
      return;
    }
    const { run } = generatePayrollWorkday(tenantId, period);
    persistExtraFields(tenantId, "hrm.payroll", run.id, extraJson);
    setExtraJson("");
    setSelectedRunId(run.id);
    setNotice(`Payroll generated for ${period} covering ${run.employee_count} employee(s).`);
    refresh();
  }

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    askSave({ editing: false, entityLabel: "payroll run", onConfirm: doGenerate });
  }

  function confirmFinalize() {
    if (finalizeTarget) {
      finalizePayrollRun(finalizeTarget.id);
      setNotice(`Payroll run for ${finalizeTarget.period} finalized.`);
      refresh();
    }
    setFinalizeTarget(null);
  }

  function exportBankLetter() {
    if (!selectedRun) return;
    const company = getCompanyProfile(tenantId);
    const rows = selectedItems
      .map((item) => {
        const employee = getEmployee(item.employee_id);
        return employee ? { employee, item } : null;
      })
      .filter((row): row is { employee: NonNullable<ReturnType<typeof getEmployee>>; item: (typeof selectedItems)[number] } => Boolean(row));
    downloadBankLetter({ company, run: selectedRun, items: rows });
  }

  function exportSlip(itemId: string) {
    if (!selectedRun) return;
    const item = selectedItems.find((i) => i.id === itemId);
    const employee = item ? getEmployee(item.employee_id) : undefined;
    if (!item || !employee) return;
    downloadSalarySlip({
      company: getCompanyProfile(tenantId),
      employee,
      run: selectedRun,
      item
    });
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader title="Payroll" description="Generate monthly payroll runs, review calculated items, and finalize disbursement." />
      <ModuleBreadcrumbs />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Draft runs" value={String(draftRuns)} detail="Pending finalization" icon={ListChecks} tone="amber" />
        <StatTile label="Finalized runs" value={String(finalizedRuns)} detail="Locked payroll periods" icon={CheckCircle2} tone="mint" />
        <StatTile label="Total net paid" value={money(totalNetPaid)} detail="Across finalized runs" icon={Wallet} tone="teal" />
        <StatTile label="Payroll line items" value={String(allItems.length)} detail="All-time processed" icon={Users} tone="coral" />
      </div>

      {error ? <p className="mb-4 text-sm font-semibold text-[color:var(--bs-coral)]">{error}</p> : null}
      {notice ? <p className="mb-4 text-sm font-semibold text-emerald-600">{notice}</p> : null}

      <Panel className="mb-6">
        <h2 className="mb-4 text-lg font-bold text-ink">Generate payroll run</h2>
        <form onSubmit={handleGenerate} className="grid gap-4 sm:grid-cols-[220px_auto]">
          <Field label="Period" hint="Format: YYYY-MM">
            <TextInput required pattern="\d{4}-(0[1-9]|1[0-2])" placeholder="2026-08" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </Field>
          <ExtraFieldsBlock formKey="hrm.payroll" valueJson={extraJson} onChange={setExtraJson} />
          <div className="flex items-end sm:col-span-2">
            <Button type="submit">Generate payroll</Button>
          </div>
        </form>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Panel className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-cloud">
                  {["Period", "Status", "Employees", "Gross", "Net", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold text-slate-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRuns.map((run) => (
                  <tr
                    key={run.id}
                    className={`cursor-pointer border-b border-line transition ${selectedRun?.id === run.id ? "bg-cloud" : "hover:bg-cloud/60"}`}
                    onClick={() => setSelectedRunId(run.id)}
                  >
                    <td className="px-4 py-3 font-medium text-ink">
                      {run.period}
                      <ExtraFieldsReadout tenantId={tenantId} formKey="hrm.payroll" recordId={run.id} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-4 py-3">{run.employee_count}</td>
                    <td className="px-4 py-3">{money(run.total_gross)}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{money(run.total_net)}</td>
                    <td className="px-4 py-3">
                      {run.status === "draft" ? (
                        <Button
                          className="!min-h-8 !px-2 !text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFinalizeTarget(run);
                          }}
                        >
                          Finalize
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">Locked</span>
                      )}
                    </td>
                  </tr>
                ))}
                {sortedRuns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                      No payroll runs yet. Generate one above.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-ink">
              {selectedRun ? `Items — ${selectedRun.period}` : "Payroll items"}
            </h2>
            {selectedRun && selectedItems.length ? (
              <Button type="button" variant="secondary" className="!min-h-8 !px-2 !text-xs" onClick={exportBankLetter}>
                Bank letter PDF
              </Button>
            ) : null}
          </div>
          {selectedRun ? (
            <div className="space-y-3">
              {selectedItems.map((item) => (
                <div key={item.id} className="rounded-[var(--bs-radius)] border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-ink">{getEmployeeName(item.employee_id)}</p>
                    <p className="font-bold text-ink">{money(item.net)}</p>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 sm:grid-cols-4">
                    <span>Basic: {money(item.basic)}</span>
                    <span>Housing: {money(item.housing ?? 0)}</span>
                    <span>Transport: {money(item.transport ?? 0)}</span>
                    <span>Medical: {money(item.medical ?? 0)}</span>
                    <span>Allowances: {money(item.allowances)}</span>
                    <span>Tax: {money(item.tax ?? 0)}</span>
                    <span>EOBI: {money(item.eobi ?? 0)}</span>
                    <span>PF: {money(item.pf)}</span>
                    <span>OT: {money(item.overtime_pay ?? 0)} ({item.overtime_hours ?? 0}h)</span>
                    <span>Benefits: {money(item.benefits ?? 0)}</span>
                  </div>
                  <div className="mt-3">
                    <Button type="button" variant="secondary" className="!min-h-8 !px-2 !text-xs" onClick={() => exportSlip(item.id)}>
                      Salary slip PDF
                    </Button>
                  </div>
                </div>
              ))}
              {selectedItems.length === 0 ? <p className="text-sm text-slate-500">No items for this run.</p> : null}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a payroll run to view its line items.</p>
          )}
        </Panel>
      </div>

      <ConfirmDialog
        open={Boolean(finalizeTarget)}
        title="Finalize payroll run?"
        message={
          finalizeTarget
            ? `Finalizing ${finalizeTarget.period} will lock this run for ${finalizeTarget.employee_count} employee(s) with a net total of ${money(finalizeTarget.total_net)}. This cannot be undone.`
            : ""
        }
        confirmLabel="Finalize run"
        onCancel={() => setFinalizeTarget(null)}
        onConfirm={confirmFinalize}
      />
      {dialog}
    </AppShell>
  );
}

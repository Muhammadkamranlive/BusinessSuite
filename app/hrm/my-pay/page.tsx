"use client";

import { useEffect, useMemo, useState } from "react";
import { Landmark, PiggyBank, Receipt, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { useConfirm } from "@/components/common/use-confirm";
import { Button, Panel, StatTile } from "@/components/ui";
import { getSelfServiceContext } from "@/lib/auth/current-employee";
import { getStoredTenantId } from "@/lib/auth/session";
import { money } from "@/lib/utils";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  allowanceTotal,
  estimatedIncomeTax,
  grossPay,
  housingAllowance,
  isEobiEnrolled,
  isPfEnrolled,
  medicalAllowance,
  transportAllowance
} from "@/modules/hrm/services/compensation";
import {
  getCompanyProfile,
  getCurrentEobiAmount,
  getCurrentPfPercent,
  getPayrollRun,
  listPfContributionsForEmployee,
  listPayrollItemsForEmployee
} from "@/modules/hrm/services/hrm.store";
import { downloadSalarySlip } from "@/modules/hrm/services/payroll-pdf";

export default function MyPayPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { employee, profile } = getSelfServiceContext(tenantId);
  const { askSave, dialog } = useConfirm();
  const [extraJson, setExtraJson] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (employee) setExtraJson(getExtraFieldValues(tenantId, "hrm.my_pay", employee.id));
  }, [employee, tenantId]);

  const slips = useMemo(() => {
    if (!employee) return [];
    return listPayrollItemsForEmployee(employee.id)
      .map((item) => ({ item, run: getPayrollRun(item.run_id) }))
      .filter((row) => row.run)
      .sort((a, b) => ((a.run?.period ?? "") < (b.run?.period ?? "") ? 1 : -1));
  }, [employee]);

  const pfRows = useMemo(
    () => (employee ? listPfContributionsForEmployee(employee.id).sort((a, b) => (a.period < b.period ? 1 : -1)) : []),
    [employee]
  );

  const latest = slips[0];
  const pfBalance = pfRows.reduce((sum, row) => sum + row.employee_amount + row.employer_amount, 0);

  if (!employee) {
    return (
      <AppShell activeModule="hrm">
        <PageHeader title="My Pay" description="Benefits and pay for the signed-in worker." />
        <ModuleBreadcrumbs />
        <Panel>
          <p className="text-sm text-slate-600">
            No employee record is linked to <strong>{profile.email}</strong>. Ask HR to create an employee with this email.
          </p>
        </Panel>
      </AppShell>
    );
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader
        title="My Pay"
        description="Payslips, total rewards, provident fund, tax, and EOBI — the employee Benefits & Pay hub."
      />
      <ModuleBreadcrumbs />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Gross package" value={money(grossPay(employee))} detail="Basic + allowances" icon={Wallet} tone="teal" />
        <StatTile
          label="Latest net pay"
          value={latest ? money(latest.item.net) : "—"}
          detail={latest?.run?.period ?? "No payslip yet"}
          icon={Receipt}
          tone="mint"
        />
        <StatTile label="PF balance" value={money(pfBalance)} detail={`${getCurrentPfPercent(tenantId)}% of basic when enrolled`} icon={PiggyBank} tone="amber" />
        <StatTile
          label="EOBI"
          value={isEobiEnrolled(employee) ? money(getCurrentEobiAmount(tenantId)) : "Not enrolled"}
          detail="Per pay period"
          icon={Landmark}
          tone="coral"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel>
          <h2 className="text-lg font-bold text-ink">Total rewards</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Basic</dt><dd className="font-semibold text-ink">{money(employee.basic_salary)}</dd></div>
            <div><dt className="text-slate-500">Housing</dt><dd className="font-semibold text-ink">{money(housingAllowance(employee))}</dd></div>
            <div><dt className="text-slate-500">Transport</dt><dd className="font-semibold text-ink">{money(transportAllowance(employee))}</dd></div>
            <div><dt className="text-slate-500">Medical</dt><dd className="font-semibold text-ink">{money(medicalAllowance(employee))}</dd></div>
            <div><dt className="text-slate-500">Allowances</dt><dd className="font-semibold text-ink">{money(allowanceTotal(employee))}</dd></div>
            <div><dt className="text-slate-500">Estimated tax</dt><dd className="font-semibold text-ink">{money(estimatedIncomeTax(employee))}</dd></div>
            <div><dt className="text-slate-500">Tax status</dt><dd className="font-semibold capitalize text-ink">{employee.tax_status ?? "filer"}</dd></div>
            <div><dt className="text-slate-500">NTN</dt><dd className="font-semibold text-ink">{employee.tax_ntn ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Bank</dt><dd className="font-semibold text-ink">{employee.bank_name ? `${employee.bank_name} · ${employee.bank_account ?? "—"}` : "—"}</dd></div>
            <div><dt className="text-slate-500">Provident fund</dt><dd className="font-semibold text-ink">{isPfEnrolled(employee) ? "Enrolled" : "Not enrolled"}</dd></div>
            {latest?.item.overtime_pay ? (
              <div><dt className="text-slate-500">Latest overtime</dt><dd className="font-semibold text-ink">{money(latest.item.overtime_pay)} ({latest.item.overtime_hours ?? 0}h)</dd></div>
            ) : null}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button href={`/hrm/employees/${employee.id}?tab=pay`} variant="secondary">Open worker profile</Button>
            <Button href="/hrm/organization" variant="ghost">Organization</Button>
          </div>
        </Panel>

        <Panel>
          <h2 className="text-lg font-bold text-ink">Payslips</h2>
          <div className="mt-3 space-y-2">
            {slips.slice(0, 8).map(({ item, run }) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--bs-radius)] border border-line px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-ink">{run?.period}</p>
                  <p className="text-xs text-slate-500">
                    Net {money(item.net)} · Tax {money(item.tax ?? 0)} · PF {money(item.pf)}
                    {item.overtime_pay ? ` · OT ${money(item.overtime_pay)}` : ""}
                    {item.benefits ? ` · Benefits ${money(item.benefits)}` : ""}
                  </p>
                </div>
                {run ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="!min-h-8 !px-3 !text-xs"
                    onClick={() =>
                      downloadSalarySlip({
                        company: getCompanyProfile(tenantId),
                        employee,
                        run,
                        item
                      })
                    }
                  >
                    PDF
                  </Button>
                ) : null}
              </div>
            ))}
            {slips.length === 0 ? <p className="text-sm text-slate-500">No payslips yet. HR generates payroll each period.</p> : null}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-lg font-bold text-ink">Provident fund</h2>
          <p className="mt-1 text-sm text-slate-500">Employee + employer amounts posted when payroll is generated.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-cloud">
                  {["Period", "Employee", "Employer"].map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pfRows.slice(0, 12).map((row) => (
                  <tr key={row.id} className="border-b border-line">
                    <td className="px-3 py-2">{row.period}</td>
                    <td className="px-3 py-2">{money(row.employee_amount)}</td>
                    <td className="px-3 py-2">{money(row.employer_amount)}</td>
                  </tr>
                ))}
                {pfRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-slate-500">No PF postings yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <h2 className="text-lg font-bold text-ink">Pay notes</h2>
          <p className="mt-1 mb-4 text-sm text-slate-500">Optional extra fields your company added for Benefits & Pay.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              askSave({
                editing: true,
                entityLabel: "pay notes",
                onConfirm: () => {
                  persistExtraFields(tenantId, "hrm.my_pay", employee.id, extraJson);
                  setNotice("Saved.");
                }
              });
            }}
            className="space-y-4"
          >
            <ExtraFieldsBlock formKey="hrm.my_pay" valueJson={extraJson} onChange={setExtraJson} />
            <Button type="submit">Save notes</Button>
            {notice ? <p className="text-sm font-semibold text-emerald-600">{notice}</p> : null}
          </form>
          <ExtraFieldsReadout tenantId={tenantId} formKey="hrm.my_pay" recordId={employee.id} />
        </Panel>
      </div>
      {dialog}
    </AppShell>
  );
}

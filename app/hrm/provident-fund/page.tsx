"use client";

import { useMemo, useState } from "react";
import { CalendarClock, PiggyBank, Users, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { Badge, Button, Field, Panel, StatTile, TextInput } from "@/components/ui";
import { money } from "@/lib/utils";
import { getStoredTenantId } from "@/lib/auth/session";
import { getCurrentPfPercent, getEmployeeName, listPfContributions, listPfSettings, setPfPercent } from "@/modules/hrm/services/hrm.store";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function ProvidentFundPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const [refreshKey, setRefreshKey] = useState(0);
  const [percent, setPercent] = useState("5");
  const [effectiveFrom, setEffectiveFrom] = useState(todayIso());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const settings = useMemo(() => listPfSettings(tenantId), [tenantId, refreshKey]);
  const contributions = useMemo(() => listPfContributions(tenantId), [tenantId, refreshKey]);
  const currentPercent = useMemo(() => getCurrentPfPercent(tenantId), [tenantId, refreshKey]);

  const sortedSettings = useMemo(() => [...settings].sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1)), [settings]);
  const sortedContributions = useMemo(() => [...contributions].sort((a, b) => (a.period < b.period ? 1 : -1)), [contributions]);

  const totalEmployeeContribution = contributions.reduce((sum, c) => sum + c.employee_amount, 0);
  const totalEmployerContribution = contributions.reduce((sum, c) => sum + c.employer_amount, 0);

  function refresh() {
    setRefreshKey((n) => n + 1);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    const value = Number(percent);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      setError("Enter a valid percentage between 0 and 100.");
      return;
    }
    if (!effectiveFrom) {
      setError("Select an effective date.");
      return;
    }
    setPfPercent(tenantId, value, effectiveFrom);
    setNotice(`Provident fund rate updated to ${value}% effective ${effectiveFrom}.`);
    refresh();
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader title="Provident Fund" description="Manage the provident fund contribution rate and review employee contributions." />
      <ModuleBreadcrumbs />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Current rate" value={`${currentPercent}%`} detail="Applied to active payroll" icon={PiggyBank} tone="teal" />
        <StatTile label="Employee contributions" value={money(totalEmployeeContribution)} detail="All-time total" icon={Wallet} tone="mint" />
        <StatTile label="Employer contributions" value={money(totalEmployerContribution)} detail="All-time total" icon={Wallet} tone="amber" />
        <StatTile label="Contributing employees" value={String(new Set(contributions.map((c) => c.employee_id)).size)} detail="Unique employees" icon={Users} tone="coral" />
      </div>

      {error ? <p className="mb-4 text-sm font-semibold text-[color:var(--bs-coral)]">{error}</p> : null}
      {notice ? <p className="mb-4 text-sm font-semibold text-emerald-600">{notice}</p> : null}

      <div className="mb-6 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Panel>
          <h2 className="mb-4 text-lg font-bold text-ink">Set new rate</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Percentage" hint="Applied as a % of basic salary">
              <TextInput required type="number" min="0" max="100" step="0.1" value={percent} onChange={(e) => setPercent(e.target.value)} />
            </Field>
            <Field label="Effective from">
              <TextInput required type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
            </Field>
            <Button type="submit">Update rate</Button>
          </form>
        </Panel>

        <Panel className="overflow-hidden p-0">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-lg font-bold text-ink">Rate history</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-cloud">
                  {["Effective From", "Percentage"].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold text-slate-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedSettings.map((s) => (
                  <tr key={s.id} className="border-b border-line">
                    <td className="px-4 py-3 text-ink">
                      <span className="inline-flex items-center gap-2">
                        <CalendarClock className="size-4 text-slate-400" aria-hidden="true" />
                        {s.effective_from}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={s.percent === currentPercent ? "success" : "neutral"}>{s.percent}%</Badge>
                    </td>
                  </tr>
                ))}
                {sortedSettings.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-sm text-slate-500">
                      No provident fund rates configured yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel className="overflow-hidden p-0">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-lg font-bold text-ink">Contributions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                {["Employee", "Period", "Employee Amount", "Employer Amount", "Total"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-slate-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedContributions.map((c) => (
                <tr key={c.id} className="border-b border-line">
                  <td className="px-4 py-3 font-medium text-ink">{getEmployeeName(c.employee_id)}</td>
                  <td className="px-4 py-3">{c.period}</td>
                  <td className="px-4 py-3">{money(c.employee_amount)}</td>
                  <td className="px-4 py-3">{money(c.employer_amount)}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{money(c.employee_amount + c.employer_amount)}</td>
                </tr>
              ))}
              {sortedContributions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    No contributions recorded yet. Generate payroll to create contributions.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}

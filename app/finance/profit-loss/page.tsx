"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { Panel, StatTile } from "@/components/ui";
import { money } from "@/lib/utils";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { getStoredTenantId } from "@/lib/auth/session";
import { getProfitAndLoss, listExpenses, listIncome } from "@/modules/finance/services/finance.store";

export default function ProfitLossPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const pnl = useMemo(() => getProfitAndLoss(tenantId), [tenantId]);
  const income = useMemo(() => listIncome(tenantId), [tenantId]);
  const expenses = useMemo(() => listExpenses(tenantId), [tenantId]);

  return (
    <AppShell activeModule="finance">
      <ModuleBreadcrumbs />
      <PageHeader title="Profit & Loss" description="Built from the general ledger (income and expense accounts). Falls back to cashbook if no journals exist." />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatTile label="Total Income" value={money(pnl.totalIncome)} detail="All income entries" icon={TrendingUp} tone="mint" />
        <StatTile label="Total Expenses" value={money(pnl.totalExpenses)} detail="All expense entries" icon={TrendingDown} tone="coral" />
        <StatTile label="Net Profit" value={money(pnl.profit)} detail="Income - Expenses" icon={DollarSign} tone="teal" />
      </div>
      <Panel className="mb-5">
        <h2 className="mb-3 text-lg font-bold text-ink">Income Entries</h2>
        <table className="min-w-full text-left text-sm">
          <thead><tr className="border-b border-line bg-cloud">{["Income No", "Date", "Account", "Amount", "Description"].map((h) => <th key={h} className="px-3 py-3 font-semibold text-slate-600">{h}</th>)}</tr></thead>
          <tbody>
            {income.map((i) => (
              <tr key={i.id} className="border-b border-line">
                <td className="px-3 py-3 font-medium">{i.income_no}</td>
                <td className="px-3 py-3">{i.income_date}</td>
                <td className="px-3 py-3">{i.account_name}</td>
                <td className="px-3 py-3">{money(i.amount)}</td>
                <td className="px-3 py-3">{i.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel>
        <h2 className="mb-3 text-lg font-bold text-ink">Expense Entries</h2>
        <table className="min-w-full text-left text-sm">
          <thead><tr className="border-b border-line bg-cloud">{["Expense No", "Date", "Account", "Amount", "Description"].map((h) => <th key={h} className="px-3 py-3 font-semibold text-slate-600">{h}</th>)}</tr></thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-line">
                <td className="px-3 py-3 font-medium">{e.expense_no}</td>
                <td className="px-3 py-3">{e.expense_date}</td>
                <td className="px-3 py-3">{e.account_name}</td>
                <td className="px-3 py-3">{money(e.amount)}</td>
                <td className="px-3 py-3">{e.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}

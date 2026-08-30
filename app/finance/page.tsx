"use client";

import { useMemo } from "react";
import { BookOpenCheck, Landmark, ReceiptText, Scale } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { ModuleStartGuide } from "@/components/guides/module-start-guide";
import { Badge, Button, DataTable, Panel, SectionHeader, StatTile } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { money } from "@/lib/utils";
import { getProfitAndLoss, listAccounts, listExpenses, listIncome, listJournals } from "@/modules/finance/services/finance.store";

export default function FinancePage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const pnl = useMemo(() => getProfitAndLoss(tenantId), [tenantId]);
  const accounts = useMemo(() => listAccounts(tenantId), [tenantId]);
  const journals = useMemo(() => listJournals(tenantId), [tenantId]);
  const chart = useMemo(
    () => [
      { label: "Income", income: pnl.totalIncome, expenses: 0 },
      { label: "Expenses", income: 0, expenses: pnl.totalExpenses },
      { label: "Profit", income: Math.max(0, pnl.profit), expenses: Math.max(0, -pnl.profit) }
    ],
    [pnl]
  );

  return (
    <AppShell activeModule="finance">
      <ModuleBreadcrumbs />
      <ModuleStartGuide module="finance" />
      <div className="grid gap-4 md:grid-cols-4">
        <StatTile label="Income" value={money(pnl.totalIncome)} detail={`${listIncome(tenantId).length} entries`} icon={Landmark} tone="teal" />
        <StatTile label="Expenses" value={money(pnl.totalExpenses)} detail={`${listExpenses(tenantId).length} entries`} icon={ReceiptText} tone="coral" />
        <StatTile label="Profit" value={money(pnl.profit)} detail="Income minus expenses" icon={Scale} tone="mint" />
        <StatTile label="Journals" value={String(journals.length)} detail="Ledger lines" icon={BookOpenCheck} tone="amber" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <SectionHeader
            title="Profit and loss"
            eyebrow="Live finance store"
            action={
              <Button href="/finance/expenses">Add expense</Button>
            }
          />
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9e1ec" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => `$${Number(value) / 1000}k`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Bar dataKey="income" fill="#1877f2" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" fill="#e85d75" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            title="Chart of accounts"
            eyebrow="General ledger"
            action={
              <span className="flex flex-wrap gap-2">
                <Button href="/finance/accounts" variant="secondary">Manage</Button>
                <Button href="/finance/ledgers" variant="secondary">Ledger</Button>
                <Button href="/finance/trial-balance" variant="secondary">Trial balance</Button>
                <Button href="/finance/balance-sheet" variant="secondary">Balance sheet</Button>
              </span>
            }
          />
          <DataTable
            columns={["Code", "Account", "Type", "Status"]}
            rows={accounts.map((account) => [
              account.account_code,
              account.account_name,
              account.account_type,
              <Badge key={account.id} tone={account.is_active ? "success" : "neutral"}>
                {account.is_active ? "Active" : "Inactive"}
              </Badge>
            ])}
          />
        </Panel>
      </div>
    </AppShell>
  );
}

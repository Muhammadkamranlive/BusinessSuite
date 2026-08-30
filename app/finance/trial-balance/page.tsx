"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { Panel } from "@/components/ui";
import { money } from "@/lib/utils";
import { getStoredTenantId } from "@/lib/auth/session";
import { getTrialBalance } from "@/modules/finance/services/finance.store";

export default function TrialBalancePage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const rows = useMemo(() => getTrialBalance(tenantId), [tenantId]);
  const debit = rows.reduce((s, r) => s + r.debit, 0);
  const credit = rows.reduce((s, r) => s + r.credit, 0);

  return (
    <AppShell activeModule="finance">
      <ModuleBreadcrumbs />
      <PageHeader title="Trial balance" description="Compiled debit and credit totals from the general ledger (Gluon-style TB)." />
      <Panel>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="px-3 py-2">Account</th>
              <th>Debit</th>
              <th>Credit</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.account} className="border-t border-line">
                <td className="px-3 py-3 font-semibold">{r.account}</td>
                <td>{money(r.debit)}</td>
                <td>{money(r.credit)}</td>
                <td>{money(r.balance)}</td>
              </tr>
            ))}
            <tr className="border-t border-line font-bold">
              <td className="px-3 py-3">Total</td>
              <td>{money(debit)}</td>
              <td>{money(credit)}</td>
              <td>{money(debit - credit)}</td>
            </tr>
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}

"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { Panel, SelectInput } from "@/components/ui";
import { money } from "@/lib/utils";
import { getStoredTenantId } from "@/lib/auth/session";
import { getLedger, getTrialBalance } from "@/modules/finance/services/finance.store";

export default function LedgersPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const tb = useMemo(() => getTrialBalance(tenantId), [tenantId]);
  const [account, setAccount] = useState(tb[0]?.account ?? "");
  const lines = useMemo(() => (account ? getLedger(tenantId, account) : []), [tenantId, account]);

  return (
    <AppShell activeModule="finance">
      <ModuleBreadcrumbs />
      <PageHeader title="General ledger" description="Debit and credit lines by account from posted journals." />
      <Panel>
        <SelectInput value={account} onChange={(e) => setAccount(e.target.value)}>
          <option value="">Select account…</option>
          {tb.map((r) => (
            <option key={r.account} value={r.account}>
              {r.account}
            </option>
          ))}
        </SelectInput>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="px-3 py-2">Date</th>
              <th>Voucher</th>
              <th>Memo</th>
              <th>Debit</th>
              <th>Credit</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((j) => (
              <tr key={j.id} className="border-t border-line">
                <td className="px-3 py-3">{j.journal_date}</td>
                <td>{j.journal_no}</td>
                <td>{j.memo}</td>
                <td>{money(j.debit)}</td>
                <td>{money(j.credit)}</td>
              </tr>
            ))}
            {lines.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                  No ledger lines.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}

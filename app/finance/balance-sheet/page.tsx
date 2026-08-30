"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { Panel, StatTile } from "@/components/ui";
import { Landmark, Scale, Wallet } from "lucide-react";
import { money } from "@/lib/utils";
import { getStoredTenantId } from "@/lib/auth/session";
import { getBalanceSheet } from "@/modules/finance/services/finance.store";

export default function BalanceSheetPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const bs = useMemo(() => getBalanceSheet(tenantId), [tenantId]);

  return (
    <AppShell activeModule="finance">
      <ModuleBreadcrumbs />
      <PageHeader title="Balance sheet" description="Assets, liabilities, and equity from ledger balances." />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatTile label="Assets" value={money(bs.assets)} detail="From ledger balances" icon={Wallet} tone="mint" />
        <StatTile label="Liabilities" value={money(bs.liabilities)} detail="Payables and statutory" icon={Scale} tone="coral" />
        <StatTile label="Equity" value={money(bs.equity)} detail={`Retained ${money(bs.retained)}`} icon={Landmark} tone="teal" />
      </div>
      <Panel>
        <p className="text-sm text-slate-500">Retained earnings (income − expense) {money(bs.retained)}. Equation check: assets {money(bs.assets)} vs liabilities + equity {money(bs.liabilities + bs.equity)}.</p>
      </Panel>
    </AppShell>
  );
}

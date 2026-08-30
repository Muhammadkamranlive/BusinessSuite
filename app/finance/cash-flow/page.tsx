"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { Panel, StatTile } from "@/components/ui";
import { Banknote } from "lucide-react";
import { money } from "@/lib/utils";
import { getStoredTenantId } from "@/lib/auth/session";
import { getCashFlow } from "@/modules/finance/services/finance.store";

export default function CashFlowPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const cf = useMemo(() => getCashFlow(tenantId), [tenantId]);

  return (
    <AppShell activeModule="finance">
      <ModuleBreadcrumbs />
      <PageHeader title="Cash flow" description="Cash account movement from the ledger. Investing/financing split expands as voucher types are used." />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatTile label="Operating" value={money(cf.operating)} detail="Cash account movement" icon={Banknote} tone="mint" />
        <StatTile label="Investing" value={money(cf.investing)} detail="Expand with voucher types" icon={Banknote} tone="teal" />
        <StatTile label="Financing" value={money(cf.financing)} detail="Expand with voucher types" icon={Banknote} tone="amber" />
        <StatTile label="Net cash" value={money(cf.net)} detail="Operating + investing + financing" icon={Banknote} tone="coral" />
      </div>
      <Panel>
        <p className="text-sm text-slate-500">Operating cash is net movement on accounts named Cash. Bank feed import is listed under third-party integrations.</p>
      </Panel>
    </AppShell>
  );
}

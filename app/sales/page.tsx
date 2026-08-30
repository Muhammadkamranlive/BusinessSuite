"use client";

import { useMemo } from "react";
import { FilePlus2, ReceiptText, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { ModuleStartGuide } from "@/components/guides/module-start-guide";
import { Badge, Button, DataTable, Panel, SectionHeader, StatTile } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { money } from "@/lib/utils";
import { listInvoices, listPayments, listQuotations } from "@/modules/sales/services/sales.store";

export default function SalesPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const invoices = useMemo(() => listInvoices(tenantId), [tenantId]);
  const payments = useMemo(() => listPayments(tenantId), [tenantId]);
  const quotations = useMemo(() => listQuotations(tenantId), [tenantId]);

  const openValue = invoices.filter((i) => i.balance_due > 0).reduce((s, i) => s + i.balance_due, 0);
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const billed = invoices.reduce((s, i) => s + i.total_amount, 0);
  const collectionPct = billed > 0 ? Math.round((paid / billed) * 100) : 0;

  return (
    <AppShell activeModule="sales">
      <ModuleBreadcrumbs />
      <ModuleStartGuide module="sales" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatTile label="Quotations" value={String(quotations.length)} detail="Open & closed quotes" icon={ReceiptText} tone="teal" />
        <StatTile label="AR outstanding" value={money(openValue)} detail={`${invoices.length} invoices`} icon={FilePlus2} tone="coral" />
        <StatTile label="Collection" value={`${collectionPct}%`} detail={`${money(paid)} received`} icon={WalletCards} tone="mint" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel>
          <SectionHeader
            title="Quick actions"
            eyebrow="Add sales data"
            action={
              <Button href="/sales/invoices/new">
                <FilePlus2 className="size-4" /> New invoice
              </Button>
            }
          />
          <div className="flex flex-wrap gap-2">
            <Button href="/sales/quotations" variant="secondary">New quotation</Button>
            <Button href="/sales/payments" variant="secondary">Record payment</Button>
            <Button href="/crm/customers" variant="secondary">Add customer</Button>
          </div>
          <p className="mt-3 text-sm text-slate-500">Use these forms to enter live data — hub stats update from your tenant store.</p>
        </Panel>

        <Panel>
          <SectionHeader
            title="Recent invoices"
            eyebrow="Receivables"
            action={
              <Button href="/sales/invoices" variant="secondary">View all</Button>
            }
          />
          <DataTable
            columns={["Invoice", "Customer", "Status", "Amount", "Due"]}
            rows={invoices.slice(0, 8).map((invoice) => [
              invoice.invoice_no,
              invoice.customer_name,
              <Badge
                key={invoice.id}
                tone={invoice.status === "paid" ? "success" : invoice.status === "draft" ? "neutral" : invoice.balance_due > 0 ? "warning" : "info"}
              >
                {invoice.status}
              </Badge>,
              money(invoice.total_amount),
              money(invoice.balance_due)
            ])}
          />
        </Panel>
      </div>
    </AppShell>
  );
}

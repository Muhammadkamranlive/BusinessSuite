"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { FileDown, LineChart } from "lucide-react";
import { Button, DataTable, Panel, SectionHeader, StatTile } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { money } from "@/lib/utils";
import type { ReportDomain } from "@/modules/reporting/model";
import { buildTenantWarehouse } from "@/modules/reporting/services/data-warehouse";
import { downloadDomainReportPdf } from "@/modules/reporting/services/report-pdfs";
import { agingBuckets } from "@/modules/sales/services/sales.store";

type Props = {
  module: "crm" | "sales" | "purchases" | "inventory" | "finance";
  title: string;
  domain: ReportDomain;
  dwAnchor: string;
};

export function ModuleReportsView({ module, title, domain, dwAnchor }: Props) {
  const tenantId = getStoredTenantId() ?? "alpha";
  const wh = useMemo(() => buildTenantWarehouse(tenantId), [tenantId]);
  const aging = useMemo(() => (domain === "sales" ? agingBuckets(tenantId) : null), [domain, tenantId]);

  const tiles =
    domain === "crm"
      ? [
          { label: "Customers", value: String(wh.kpis.customers) },
          { label: "Leads", value: String(wh.kpis.leads) },
          { label: "Open deals", value: String(wh.kpis.openDeals) }
        ]
      : domain === "sales"
        ? [
            { label: "Invoice total", value: money(wh.kpis.invoiceTotal) },
            { label: "Payments", value: money(wh.kpis.paymentsReceived) },
            { label: "AR due", value: money(wh.kpis.arOutstanding) }
          ]
        : domain === "purchases"
          ? [
              { label: "Open POs", value: String(wh.kpis.openPurchaseOrders) },
              { label: "Pipeline", value: money(wh.kpis.purchasePipeline) },
              { label: "Suppliers", value: String(wh.purchases.suppliers) }
            ]
          : domain === "inventory"
            ? [
                { label: "Products", value: String(wh.kpis.productCount) },
                { label: "Stock value", value: money(wh.kpis.inventoryValueAtCost) },
                { label: "Low stock", value: String(wh.kpis.lowStockCount) }
              ]
            : [
                { label: "Income", value: money(wh.kpis.financeIncome) },
                { label: "Expenses", value: money(wh.kpis.financeExpenses) },
                { label: "Profit", value: money(wh.kpis.financeProfit) }
              ];

  return (
    <AppShell activeModule={module}>
      <ModuleBreadcrumbs />
      <PageHeader
        title={title}
        description={`${wh.branding.legalName} — module report (unique route, not shared /reports# hash).`}
        actionLabel="Download PDF"
        onAction={() => downloadDomainReportPdf(wh, domain)}
      />

      {aging ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatTile label="AR current" value={money(aging.current)} detail="Not yet due" icon={LineChart} tone="mint" />
          <StatTile label="1–30 days" value={money(aging.d30)} detail="Overdue" icon={LineChart} tone="amber" />
          <StatTile label="31–60 days" value={money(aging.d60)} detail="Overdue" icon={LineChart} tone="amber" />
          <StatTile label="61–90 days" value={money(aging.d90)} detail="Overdue" icon={LineChart} tone="coral" />
          <StatTile label="90+ days" value={money(aging.older)} detail="Overdue" icon={LineChart} tone="coral" />
        </div>
      ) : null}

      <Panel className="mt-5">
        <SectionHeader
          title="Full Data Warehouse"
          eyebrow="Cross-module BI"
          action={
            <Button href={`/reports${dwAnchor}`} variant="secondary">
                <FileDown className="size-4" /> Open in BI
              </Button>
          }
        />
        <p className="text-sm text-slate-500">
          This page is the menu entry for {title}. The shared Report Center lives under Data Warehouse / BI only — so the sidebar highlights one module at a time.
        </p>
        {domain === "sales" || domain === "crm" ? (
          <div className="mt-4">
            <DataTable
              columns={["Invoice", "Customer", "Status", "Total"]}
              rows={wh.sales.recentInvoices.slice(0, 6).map((i) => [i.invoice_no, i.customer_name, i.status, money(i.total_amount)])}
            />
          </div>
        ) : null}
        {domain === "inventory" || domain === "purchases" ? (
          <div className="mt-4">
            <DataTable
              columns={["SKU", "Product", "Stock", "Reorder"]}
              rows={wh.inventory.products.slice(0, 6).map((p) => [p.sku, p.name, String(p.stock), String(p.reorder_level)])}
            />
          </div>
        ) : null}
        {domain === "finance" ? (
          <div className="mt-4">
            <DataTable
              columns={["Expense", "Date", "Account", "Amount"]}
              rows={wh.finance.expenses.slice(0, 6).map((e) => [e.expense_no, e.expense_date, e.account_name, money(e.amount)])}
            />
          </div>
        ) : null}
      </Panel>
    </AppShell>
  );
}

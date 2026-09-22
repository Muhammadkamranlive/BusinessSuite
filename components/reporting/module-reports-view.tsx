"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  Boxes,
  Download,
  FileDown,
  LineChart,
  PieChart,
  Users,
  Wallet
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { Button, DataTable, Panel, SectionHeader, StatTile } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportRowsAsCsv, money } from "@/lib/utils";
import type { ReportDomain } from "@/modules/reporting/model";
import { buildTenantWarehouse } from "@/modules/reporting/services/data-warehouse";
import { downloadDomainReportPdf } from "@/modules/reporting/services/report-pdfs";
import { agingBuckets } from "@/modules/sales/services/sales.store";

const CHART_COLORS = ["#1877f2", "#e85d75", "#b7791f", "#3b5998", "#4267b2", "#6366f1"];

type ModuleKey = "crm" | "sales" | "purchases" | "inventory" | "finance" | "operations" | "healthcare";

type Props = {
  module: ModuleKey;
  title: string;
  domain: ReportDomain | "operations" | "healthcare";
};

export function ModuleReportsView({ module, title, domain }: Props) {
  const tenantId = getStoredTenantId() ?? "alpha";
  const wh = useMemo(() => buildTenantWarehouse(tenantId), [tenantId]);
  const aging = useMemo(() => (domain === "sales" ? agingBuckets(tenantId) : null), [domain, tenantId]);

  const pdfDomain: ReportDomain =
    domain === "operations" || domain === "healthcare" ? "executive" : domain;

  const stockMix = wh.inventory.products
    .filter((p) => p.stock > 0)
    .slice(0, 8)
    .map((p) => ({
      sku: p.sku,
      name: p.name.length > 22 ? `${p.name.slice(0, 19)}…` : p.name,
      value: p.stock
    }));

  const revenueBars = [
    { name: "Invoices", amount: wh.kpis.invoiceTotal },
    { name: "Payments", amount: wh.kpis.paymentsReceived },
    { name: "AR due", amount: wh.kpis.arOutstanding },
    { name: "PO pipeline", amount: wh.kpis.purchasePipeline },
    { name: "Expenses", amount: wh.kpis.financeExpenses },
    { name: "Profit", amount: wh.kpis.financeProfit }
  ];

  return (
    <AppShell activeModule={module}>
      <ModuleBreadcrumbs />
      <PageHeader
        title={title}
        description={`${wh.branding.legalName} — detailed ${title.toLowerCase()} for this module (not the cross-company BI hub).`}
        actionLabel="Download PDF"
        onAction={() => downloadDomainReportPdf(wh, pdfDomain)}
      />

      {domain === "crm" ? (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Customers" value={String(wh.kpis.customers)} detail="Active accounts" icon={Users} tone="teal" />
            <StatTile label="Leads" value={String(wh.kpis.leads)} detail="In pipeline" icon={LineChart} tone="mint" />
            <StatTile label="Open deals" value={String(wh.kpis.openDeals)} detail="Opportunities" icon={BarChart3} tone="amber" />
            <StatTile label="Invoice total" value={money(wh.kpis.invoiceTotal)} detail="Linked sales" icon={Wallet} tone="coral" />
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <Panel>
              <SectionHeader title="Lead stages" eyebrow="CRM funnel" />
              <DataTable
                columns={["Stage", "Count"]}
                rows={wh.crm.leadStages.map((s) => [s.name, String(s.count)])}
              />
            </Panel>
            <Panel>
              <SectionHeader title="Deal stages" eyebrow="Pipeline" />
              <DataTable
                columns={["Stage", "Count"]}
                rows={wh.crm.dealStages.map((s) => [s.name, String(s.count)])}
              />
            </Panel>
          </div>
          <Panel className="mt-5">
            <SectionHeader
              title="Recent invoices (CRM → cash)"
              eyebrow="Linked AR"
              action={
                <Button
                  variant="secondary"
                  onClick={() =>
                    exportRowsAsCsv(
                      `${tenantId}-crm-invoices.csv`,
                      wh.sales.recentInvoices.map((i) => ({
                        invoice_no: i.invoice_no,
                        customer: i.customer_name,
                        status: i.status,
                        total: i.total_amount
                      }))
                    )
                  }
                >
                  <Download className="size-4" /> CSV
                </Button>
              }
            />
            <DataTable
              columns={["Invoice", "Customer", "Status", "Total", "Due"]}
              rows={wh.sales.recentInvoices.slice(0, 12).map((i) => [
                i.invoice_no,
                i.customer_name,
                i.status,
                money(i.total_amount),
                money(i.balance_due)
              ])}
            />
          </Panel>
        </>
      ) : null}

      {domain === "sales" ? (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Invoice total" value={money(wh.kpis.invoiceTotal)} detail="Billed" icon={LineChart} tone="teal" />
            <StatTile label="Payments" value={money(wh.kpis.paymentsReceived)} detail="Collected" icon={Wallet} tone="mint" />
            <StatTile label="AR due" value={money(wh.kpis.arOutstanding)} detail="Outstanding" icon={PieChart} tone="coral" />
            <StatTile label="Open quotations" value={String(wh.kpis.openQuotations)} detail="Pipeline" icon={BarChart3} tone="amber" />
          </div>
          {aging ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatTile label="AR current" value={money(aging.current)} detail="Not yet due" icon={LineChart} tone="mint" />
              <StatTile label="1–30 days" value={money(aging.d30)} detail="Overdue" icon={LineChart} tone="amber" />
              <StatTile label="31–60 days" value={money(aging.d60)} detail="Overdue" icon={LineChart} tone="amber" />
              <StatTile label="61–90 days" value={money(aging.d90)} detail="Overdue" icon={LineChart} tone="coral" />
              <StatTile label="90+ days" value={money(aging.older)} detail="Overdue" icon={LineChart} tone="coral" />
            </div>
          ) : null}
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <Panel>
              <SectionHeader title="Sales & cash mix" eyebrow="Live warehouse" />
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueBars.slice(0, 4)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d9e1ec" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => `$${Number(v) / 1000}k`} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => money(Number(value))} />
                    <Bar dataKey="amount" fill={wh.branding.brandColor || "#1877f2"} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel>
              <SectionHeader title="Invoices by status" eyebrow="Volume" />
              <DataTable
                columns={["Status", "Count"]}
                rows={wh.sales.invoicesByStatus.map((s) => [s.name, String(s.count)])}
              />
              <div className="mt-4">
                <SectionHeader title="Top customers" eyebrow="By revenue" />
                <DataTable
                  columns={["Customer", "Revenue"]}
                  rows={wh.sales.topCustomersByRevenue.slice(0, 8).map((c) => [c.name, money(c.amount)])}
                />
              </div>
            </Panel>
          </div>
          <Panel className="mt-5">
            <SectionHeader
              title="Recent invoices"
              eyebrow="Detail register"
              action={
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      exportRowsAsCsv(
                        `${tenantId}-sales-invoices.csv`,
                        wh.sales.recentInvoices.map((i) => ({
                          invoice_no: i.invoice_no,
                          customer: i.customer_name,
                          date: i.invoice_date,
                          status: i.status,
                          total: i.total_amount,
                          balance_due: i.balance_due
                        }))
                      )
                    }
                  >
                    <Download className="size-4" /> CSV
                  </Button>
                  <Button onClick={() => downloadDomainReportPdf(wh, "sales")}>
                    <FileDown className="size-4" /> PDF
                  </Button>
                </div>
              }
            />
            <DataTable
              columns={["Invoice", "Customer", "Date", "Status", "Total", "Due"]}
              rows={wh.sales.recentInvoices.slice(0, 15).map((i) => [
                i.invoice_no,
                i.customer_name,
                i.invoice_date,
                i.status,
                money(i.total_amount),
                money(i.balance_due)
              ])}
            />
          </Panel>
          <Panel className="mt-5">
            <SectionHeader title="Recent payments" eyebrow="Cash collected" />
            <DataTable
              columns={["Payment", "Customer", "Date", "Method", "Amount"]}
              rows={wh.sales.payments.slice(0, 12).map((p) => [
                p.payment_no,
                p.customer_name,
                p.payment_date,
                p.payment_method,
                money(p.amount)
              ])}
            />
          </Panel>
        </>
      ) : null}

      {domain === "purchases" ? (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Open POs" value={String(wh.kpis.openPurchaseOrders)} detail="In flight" icon={Boxes} tone="teal" />
            <StatTile label="Pipeline" value={money(wh.kpis.purchasePipeline)} detail="PO value" icon={Wallet} tone="amber" />
            <StatTile label="Suppliers" value={String(wh.purchases.suppliers)} detail="Vendors" icon={Users} tone="mint" />
            <StatTile label="Expenses" value={money(wh.kpis.financeExpenses)} detail="Linked spend" icon={LineChart} tone="coral" />
          </div>
          <Panel className="mt-5">
            <SectionHeader
              title="Purchase orders"
              eyebrow="Procurement register"
              action={
                <Button onClick={() => downloadDomainReportPdf(wh, "purchases")}>
                  <FileDown className="size-4" /> PDF
                </Button>
              }
            />
            <DataTable
              columns={["PO", "Supplier", "Date", "Status", "Total"]}
              rows={wh.purchases.orders.slice(0, 15).map((o) => [
                o.purchase_order_no,
                o.supplier_name,
                o.order_date,
                o.status,
                money(o.total_amount)
              ])}
            />
          </Panel>
          <Panel className="mt-5">
            <SectionHeader title="Low stock (triggers buy)" eyebrow="Inventory signal" />
            <DataTable
              columns={["SKU", "Product", "Stock", "Reorder"]}
              rows={wh.inventory.lowStock.slice(0, 12).map((p) => [p.sku, p.name, String(p.stock), String(p.reorder_level)])}
            />
          </Panel>
        </>
      ) : null}

      {domain === "inventory" ? (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Products" value={String(wh.kpis.productCount)} detail="SKUs" icon={Boxes} tone="teal" />
            <StatTile label="Stock value" value={money(wh.kpis.inventoryValueAtCost)} detail="At cost" icon={Wallet} tone="mint" />
            <StatTile label="Low stock" value={String(wh.kpis.lowStockCount)} detail="Below reorder" icon={LineChart} tone="coral" />
            <StatTile label="Units on hand" value={String(wh.kpis.stockUnits)} detail="Qty" icon={BarChart3} tone="amber" />
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <Panel>
              <SectionHeader title="Stock mix" eyebrow="Top SKUs by qty" />
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Tooltip />
                    <Pie
                      data={stockMix.length ? stockMix : [{ sku: "none", name: "No stock", value: 1 }]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={64}
                      outerRadius={108}
                      paddingAngle={2}
                    >
                      {(stockMix.length ? stockMix : [{ sku: "none", name: "No stock", value: 1 }]).map((entry, index) => (
                        <Cell key={entry.sku} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel>
              <SectionHeader
                title="Low stock alerts"
                eyebrow="Reorder now"
                action={
                  <Button onClick={() => downloadDomainReportPdf(wh, "inventory")}>
                    <FileDown className="size-4" /> PDF
                  </Button>
                }
              />
              <DataTable
                columns={["SKU", "Product", "Stock", "Reorder"]}
                rows={wh.inventory.lowStock.slice(0, 12).map((p) => [p.sku, p.name, String(p.stock), String(p.reorder_level)])}
              />
            </Panel>
          </div>
          <Panel className="mt-5">
            <SectionHeader title="Recent movements" eyebrow="Stock ledger" />
            <DataTable
              columns={["Date", "Type", "Product", "Qty", "Notes"]}
              rows={wh.inventory.movements.slice(0, 15).map((m) => [
                m.movement_date,
                m.movement_type,
                m.product,
                String(m.quantity),
                m.notes || "—"
              ])}
            />
          </Panel>
          <Panel className="mt-5">
            <SectionHeader title="Product valuation" eyebrow="Cost × qty" />
            <DataTable
              columns={["SKU", "Product", "Stock", "Cost", "Value"]}
              rows={wh.inventory.products.slice(0, 15).map((p) => [
                p.sku,
                p.name,
                String(p.stock),
                money(p.purchase_price),
                money(p.stock_value_cost)
              ])}
            />
          </Panel>
        </>
      ) : null}

      {domain === "finance" ? (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Income" value={money(wh.kpis.financeIncome)} detail="Period" icon={LineChart} tone="teal" />
            <StatTile label="Expenses" value={money(wh.kpis.financeExpenses)} detail="Period" icon={Wallet} tone="coral" />
            <StatTile label="Profit" value={money(wh.kpis.financeProfit)} detail="Income − expenses" icon={BarChart3} tone="mint" />
            <StatTile label="AR outstanding" value={money(wh.kpis.arOutstanding)} detail="Receivables" icon={PieChart} tone="amber" />
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <Panel>
              <SectionHeader title="Cash vs spend" eyebrow="Warehouse bars" />
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueBars}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d9e1ec" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => `$${Number(v) / 1000}k`} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => money(Number(value))} />
                    <Bar dataKey="amount" fill={wh.branding.brandColor || "#1877f2"} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel>
              <SectionHeader
                title="Expense register"
                eyebrow="Detail"
                action={
                  <Button onClick={() => downloadDomainReportPdf(wh, "finance")}>
                    <FileDown className="size-4" /> PDF
                  </Button>
                }
              />
              <DataTable
                columns={["Expense", "Date", "Account", "Amount"]}
                rows={wh.finance.expenses.slice(0, 12).map((e) => [e.expense_no, e.expense_date, e.account_name, money(e.amount)])}
              />
            </Panel>
          </div>
        </>
      ) : null}

      {domain === "operations" ? (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Open POs" value={String(wh.kpis.openPurchaseOrders)} detail="Supply input" icon={Boxes} tone="teal" />
            <StatTile label="Stock value" value={money(wh.kpis.inventoryValueAtCost)} detail="Materials" icon={Wallet} tone="mint" />
            <StatTile label="Low stock" value={String(wh.kpis.lowStockCount)} detail="Risk" icon={LineChart} tone="coral" />
            <StatTile label="PO pipeline" value={money(wh.kpis.purchasePipeline)} detail="Inbound" icon={BarChart3} tone="amber" />
          </div>
          <Panel className="mt-5">
            <SectionHeader title="Plant / ops signals" eyebrow="From live warehouse" />
            <p className="mb-3 text-sm text-slate-500">
              Operations analytics use inventory and procurement warehouse facts. Open BOM, work orders, and maintenance from Menus for transactional detail.
            </p>
            <DataTable
              columns={["SKU", "Product", "Stock", "Reorder"]}
              rows={wh.inventory.lowStock.slice(0, 12).map((p) => [p.sku, p.name, String(p.stock), String(p.reorder_level)])}
            />
          </Panel>
        </>
      ) : null}

      {domain === "healthcare" ? (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Customers / patients*" value={String(wh.kpis.customers)} detail="CRM accounts proxy" icon={Users} tone="teal" />
            <StatTile label="Employees" value={String(wh.kpis.employees)} detail="Staffing" icon={Users} tone="mint" />
            <StatTile label="Inventory value" value={money(wh.kpis.inventoryValueAtCost)} detail="Pharmacy / stores" icon={Boxes} tone="amber" />
            <StatTile label="AR due" value={money(wh.kpis.arOutstanding)} detail="Collections" icon={Wallet} tone="coral" />
          </div>
          <Panel className="mt-5">
            <SectionHeader title="Healthcare ops snapshot" eyebrow="Cross-module signals" />
            <p className="mb-3 text-sm text-slate-500">
              Detailed HMS registers (OPD, IPD, lab, pharmacy) live under Menus. This analytics page surfaces company KPIs that hospitals track with the rest of the suite.
            </p>
            <DataTable
              columns={["Department", "Employees", "Pending leaves"]}
              rows={wh.hrm.departments.map((d) => [d.name, String(d.employees), String(d.pendingLeaves)])}
            />
          </Panel>
        </>
      ) : null}

      <p className="mt-6 text-center text-xs text-slate-500">
        Cross-company executive view:{" "}
        <Link href="/reports" className="font-semibold text-teal hover:underline">
          Data Warehouse / BI
        </Link>
      </p>
    </AppShell>
  );
}

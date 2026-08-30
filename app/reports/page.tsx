"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Button, DataTable, Panel, SectionHeader, StatTile } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportRowsAsCsv, money } from "@/lib/utils";
import type { ReportDomain } from "@/modules/reporting/model";
import { buildTenantWarehouse } from "@/modules/reporting/services/data-warehouse";
import { downloadDomainReportPdf } from "@/modules/reporting/services/report-pdfs";
import { listBiSnapshots, saveBiSnapshot } from "@/modules/reporting/services/snapshots.store";

const CHART_COLORS = ["#1877f2", "#e85d75", "#b7791f", "#3b5998", "#4267b2", "#6366f1"];

export default function ReportsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const [tick, setTick] = useState(0);
  const [savedAt, setSavedAt] = useState("");
  const wh = useMemo(() => buildTenantWarehouse(tenantId), [tenantId, tick]);
  const snapshots = useMemo(() => listBiSnapshots(tenantId), [tenantId, tick]);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  function refresh() {
    setTick((t) => t + 1);
  }

  function persistSnapshot(domain: ReportDomain = "executive") {
    saveBiSnapshot(wh, domain, `${domain} snapshot`);
    setSavedAt(new Date().toLocaleString());
    refresh();
  }

  function exportPdf(domain: ReportDomain) {
    downloadDomainReportPdf(wh, domain);
  }

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
    <AppShell activeModule="reports">
      <ModuleBreadcrumbs />
      <SectionHeader
        title="Report Center"
        eyebrow={wh.branding.legalName}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={refresh}>
              Refresh live data
            </Button>
            <Button variant="secondary" onClick={() => persistSnapshot("executive")}>
              Save snapshot
            </Button>
            <Link href="/reports/custom">
              <Button variant="secondary">Custom report</Button>
            </Link>
            <Button onClick={() => exportPdf("executive")}>
              <FileDown className="size-4" /> Executive PDF
            </Button>
          </div>
        }
      />
      <p className="mb-4 text-sm text-slate-500">
        Multi-tenant Data Warehouse — live operational data with branded PDF exports.
      </p>

      <div id="kpis" className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Invoice total" value={money(wh.kpis.invoiceTotal)} detail="Sales" icon={LineChart} tone="teal" />
        <StatTile label="AR outstanding" value={money(wh.kpis.arOutstanding)} detail="Receivables" icon={Wallet} tone="coral" />
        <StatTile
          label="Inventory value"
          value={money(wh.kpis.inventoryValueAtCost)}
          detail={`${wh.kpis.lowStockCount} low stock`}
          icon={Boxes}
          tone="amber"
        />
        <StatTile
          label="Employees"
          value={String(wh.kpis.employees)}
          detail={`${wh.kpis.pendingLeaves} pending leaves`}
          icon={Users}
          tone="mint"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div id="sales">
        <Panel>
          <SectionHeader
            title="Sales & cash"
            eyebrow="Data warehouse"
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
                <Button onClick={() => exportPdf("sales")}>
                  <FileDown className="size-4" /> PDF
                </Button>
              </div>
            }
          />
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
          <div className="mt-4">
            <DataTable
              columns={["Invoice", "Customer", "Status", "Total", "Due"]}
              rows={wh.sales.recentInvoices.slice(0, 8).map((i) => [
                i.invoice_no,
                i.customer_name,
                i.status,
                money(i.total_amount),
                money(i.balance_due)
              ])}
            />
          </div>
        </Panel>
        </div>

        <div id="inventory">
        <Panel>
          <SectionHeader
            title="Inventory mix"
            eyebrow="Stock analytics"
            action={
              <Button onClick={() => exportPdf("inventory")}>
                <FileDown className="size-4" /> PDF
              </Button>
            }
          />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Tooltip />
                <Pie data={stockMix.length ? stockMix : [{ sku: "none", name: "No stock", value: 1 }]} dataKey="value" nameKey="name" innerRadius={64} outerRadius={108} paddingAngle={2}>
                  {(stockMix.length ? stockMix : [{ sku: "none", name: "No stock", value: 1 }]).map((entry, index) => (
                    <Cell key={entry.sku} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4">
            <DataTable
              columns={["SKU", "Product", "Stock", "Reorder"]}
              rows={wh.inventory.lowStock.slice(0, 8).map((p) => [p.sku, p.name, String(p.stock), String(p.reorder_level)])}
            />
          </div>
        </Panel>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div id="finance">
        <Panel>
          <SectionHeader
            title="Finance"
            eyebrow={`Profit ${money(wh.kpis.financeProfit)}`}
            action={
              <div className="flex gap-2">
                <Button onClick={() => exportPdf("finance")}>
                  <FileDown className="size-4" /> PDF
                </Button>
                <Button variant="secondary" onClick={() => exportPdf("purchases")}>
                  Purchases PDF
                </Button>
              </div>
            }
          />
          <div className="mb-3 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-[var(--bs-radius)] bg-cloud px-3 py-2">
              <p className="text-slate-500">Income</p>
              <p className="font-bold text-ink">{money(wh.kpis.financeIncome)}</p>
            </div>
            <div className="rounded-[var(--bs-radius)] bg-cloud px-3 py-2">
              <p className="text-slate-500">Expenses</p>
              <p className="font-bold text-ink">{money(wh.kpis.financeExpenses)}</p>
            </div>
            <div className="rounded-[var(--bs-radius)] bg-cloud px-3 py-2">
              <p className="text-slate-500">Open POs</p>
              <p className="font-bold text-ink">{wh.kpis.openPurchaseOrders}</p>
            </div>
          </div>
          <DataTable
            columns={["Expense", "Date", "Account", "Amount"]}
            rows={wh.finance.expenses.slice(0, 8).map((e) => [e.expense_no, e.expense_date, e.account_name, money(e.amount)])}
          />
        </Panel>
        </div>

        <div id="hr">
        <Panel>
          <SectionHeader
            title="HR analytics"
            eyebrow="By department"
            action={
              <div className="flex gap-2">
                <Button onClick={() => exportPdf("hrm")}>
                  <FileDown className="size-4" /> PDF
                </Button>
                <Button variant="secondary" onClick={() => exportPdf("crm")}>
                  CRM PDF
                </Button>
              </div>
            }
          />
          <DataTable
            columns={["Department", "Employees", "Pending leaves"]}
            rows={wh.hrm.departments.map((d) => [d.name, String(d.employees), String(d.pendingLeaves)])}
          />
          <div className="mt-4">
            <SectionHeader title="CRM stages" eyebrow={`${wh.kpis.leads} leads · ${wh.kpis.openDeals} open deals`} />
            <DataTable
              columns={["Pipeline", "Count"]}
              rows={[
                ...wh.crm.leadStages.map((s) => [`Lead: ${s.name}`, String(s.count)]),
                ...wh.crm.dealStages.map((s) => [`Deal: ${s.name}`, String(s.count)])
              ]}
            />
          </div>
        </Panel>
        </div>
      </div>

      <div id="snapshots" className="mt-5">
        <Panel>
          <SectionHeader
            title="Saved snapshots"
            eyebrow="Tenant-scoped warehouse history"
            action={
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => persistSnapshot("executive")}>
                  Save executive snapshot
                </Button>
                <Button variant="secondary" onClick={() => exportPdf("executive")}>
                  <BarChart3 className="size-4" /> Full pack PDF
                </Button>
              </div>
            }
          />
          <p className="mb-3 text-sm text-slate-500">
            Live snapshot generated {new Date(wh.generatedAt).toLocaleString()} for {wh.branding.legalName}. Saved rows stay
            in this browser (and can sync to Supabase `bi_report_snapshots` after migration). Letterhead: HRM → Company.
            {savedAt ? ` Last save: ${savedAt}.` : ""}
          </p>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            {[
              { label: "Customers", value: wh.kpis.customers, icon: PieChart },
              { label: "Products", value: wh.kpis.productCount, icon: Boxes },
              { label: "Open quotations", value: wh.kpis.openQuotations, icon: LineChart },
              { label: "Payroll net", value: money(wh.kpis.payrollNet), icon: Wallet }
            ].map((item) => (
              <div key={item.label} className="rounded-[var(--bs-radius)] border border-line px-3 py-3">
                <item.icon className="mb-1 size-4 text-teal" />
                <p className="text-slate-500">{item.label}</p>
                <p className="text-lg font-bold text-ink">{item.value}</p>
              </div>
            ))}
          </div>
          <DataTable
            columns={["Saved at", "Domain", "Title", "Invoice total", "AR", "Profit"]}
            rows={
              snapshots.length
                ? snapshots.map((s) => [
                    new Date(s.generatedAt).toLocaleString(),
                    s.domain,
                    s.title,
                    money(s.kpiJson.invoiceTotal),
                    money(s.kpiJson.arOutstanding),
                    money(s.kpiJson.financeProfit)
                  ])
                : [["—", "—", "No snapshots yet — click Save snapshot", "—", "—", "—"]]
            }
          />
        </Panel>
      </div>
    </AppShell>
  );
}

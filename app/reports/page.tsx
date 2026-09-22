"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Boxes,
  FileDown,
  LineChart,
  PieChart,
  Users,
  Wallet
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { Button, DataTable, Panel, SectionHeader, StatTile } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { money } from "@/lib/utils";
import type { ReportDomain } from "@/modules/reporting/model";
import { buildTenantWarehouse } from "@/modules/reporting/services/data-warehouse";
import { downloadDomainReportPdf } from "@/modules/reporting/services/report-pdfs";
import { listBiSnapshots, saveBiSnapshot } from "@/modules/reporting/services/snapshots.store";

const MODULE_ANALYTICS = [
  { href: "/crm/reports", label: "CRM analytics", detail: "Leads, deals, customer funnel" },
  { href: "/sales/reports", label: "Sales analytics", detail: "Invoices, AR aging, receipts" },
  { href: "/purchases/reports", label: "Procurement analytics", detail: "POs, suppliers, pipeline" },
  { href: "/inventory/reports", label: "Inventory analytics", detail: "Stock mix, movements, valuation" },
  { href: "/finance/reports", label: "Finance analytics", detail: "Income, expenses, profit" },
  { href: "/hrm/reports", label: "HR analytics", detail: "Headcount, attendance, payroll" },
  { href: "/operations/reports", label: "Operations analytics", detail: "Plant / materials signals" },
  { href: "/healthcare/reports", label: "Healthcare analytics", detail: "Staffing & stores signals" },
  { href: "/projects/reports", label: "Project analytics", detail: "Burn, progress, timesheets" }
];

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
            <Button onClick={() => downloadDomainReportPdf(wh, "executive")}>
              <FileDown className="size-4" /> Executive PDF
            </Button>
          </div>
        }
      />
      <p className="mb-4 text-sm text-slate-500">
        Cross-company executive KPIs and snapshots. Detailed analytics live inside each module under{" "}
        <strong>Menus</strong> (last process stage) — open CRM, Sales, HRM, etc. for domain reports.
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

      <div id="modules" className="mt-5">
        <Panel>
          <SectionHeader title="Module analytics" eyebrow="Open detailed reports in each product" />
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODULE_ANALYTICS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[var(--bs-radius)] border border-line bg-cloud px-4 py-3 transition hover:border-teal"
              >
                <p className="text-sm font-bold text-ink">{item.label}</p>
                <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
              </Link>
            ))}
          </div>
        </Panel>
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
                <Button variant="secondary" onClick={() => downloadDomainReportPdf(wh, "executive")}>
                  <BarChart3 className="size-4" /> Full pack PDF
                </Button>
              </div>
            }
          />
          <p className="mb-3 text-sm text-slate-500">
            Live snapshot generated {new Date(wh.generatedAt).toLocaleString()} for {wh.branding.legalName}.
            {savedAt ? ` Last save: ${savedAt}.` : ""}
          </p>
          <div className="mb-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
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

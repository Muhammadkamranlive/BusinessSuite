"use client";

import { useMemo } from "react";
import { Activity, Banknote, Boxes, BriefcaseBusiness, CircleDollarSign } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { Badge, DataTable, Panel, SectionHeader, StatTile } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { EmployeeHome } from "@/components/employee/employee-home";
import { isSelfServiceRole } from "@/lib/employee-menus";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { money } from "@/lib/utils";
import { buildTenantWarehouse } from "@/modules/reporting/services/data-warehouse";
import { listActivities } from "@/modules/crm/services/crm.store";

export default function DashboardPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const profile = getSessionProfile();
  if (isSelfServiceRole(profile.role)) {
    return (
      <AppShell activeModule="dashboard">
        <ModuleBreadcrumbs />
        <EmployeeHome tenantId={tenantId} />
      </AppShell>
    );
  }
  return <ExecutiveDashboard tenantId={tenantId} />;
}

function ExecutiveDashboard({ tenantId }: { tenantId: string }) {
  const wh = useMemo(() => buildTenantWarehouse(tenantId), [tenantId]);
  const activities = useMemo(() => listActivities(tenantId).slice(0, 8), [tenantId]);

  const tiles = [
    { label: "Invoice total", value: money(wh.kpis.invoiceTotal), detail: `${wh.kpis.openQuotations} open quotes`, icon: Banknote, tone: "teal" as const },
    { label: "Pipeline / AR", value: money(wh.kpis.arOutstanding), detail: `${wh.kpis.openDeals} open deals`, icon: BriefcaseBusiness, tone: "coral" as const },
    { label: "Inventory value", value: money(wh.kpis.inventoryValueAtCost), detail: `${wh.kpis.lowStockCount} low stock`, icon: Boxes, tone: "amber" as const },
    { label: "Profit", value: money(wh.kpis.financeProfit), detail: `${wh.kpis.employees} employees`, icon: CircleDollarSign, tone: "mint" as const }
  ];

  const mix = [
    { month: "Invoices", revenue: wh.kpis.invoiceTotal, expenses: 0 },
    { month: "Payments", revenue: wh.kpis.paymentsReceived, expenses: 0 },
    { month: "POs", revenue: wh.kpis.purchasePipeline, expenses: 0 },
    { month: "P&L", revenue: wh.kpis.financeIncome, expenses: wh.kpis.financeExpenses }
  ];

  return (
    <AppShell activeModule="dashboard">
      <ModuleBreadcrumbs />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {tiles.map((kpi) => (
          <StatTile key={kpi.label} label={kpi.label} value={kpi.value} detail={kpi.detail} icon={kpi.icon} tone={kpi.tone} />
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel>
          <SectionHeader title="Live operational mix" eyebrow={wh.branding.legalName} />
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mix}>
                <defs>
                  <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1877f2" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#1877f2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9e1ec" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => `$${Number(value) / 1000}k`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Area type="monotone" dataKey="revenue" stroke="#1877f2" fill="url(#revenue)" strokeWidth={3} />
                <Area type="monotone" dataKey="expenses" stroke="#e85d75" fill="transparent" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="CRM funnel" eyebrow="Leads by status" />
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wh.crm.leadStages} layout="vertical" margin={{ left: 28 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9e1ec" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={88} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b5998" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel>
          <SectionHeader title="CRM activity" eyebrow="Latest follow-ups" />
          <DataTable
            columns={["Type", "Subject", "Related"]}
            rows={activities.map((item) => [
              item.activity_type,
              item.subject,
              <Badge key={item.id} tone="info">{item.related_type}</Badge>
            ])}
          />
        </Panel>
        <Panel>
          <SectionHeader title="Tenant controls" eyebrow="SaaS layer" />
          <div className="grid gap-3 sm:grid-cols-2">
            {["Multi-company switcher", "Role-based dashboards", "Audit log trail", "CSV/PDF exports"].map((item) => (
              <div key={item} className="flex min-h-20 items-center gap-3 rounded-md border border-line bg-cloud p-3">
                <Activity className="size-5 text-teal" aria-hidden="true" />
                <p className="text-sm font-semibold text-ink">{item}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

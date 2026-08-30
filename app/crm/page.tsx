"use client";

import { useMemo } from "react";
import { CalendarClock, Plus, UserRoundCheck } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { ModuleStartGuide } from "@/components/guides/module-start-guide";
import { Badge, Button, DataTable, Panel, SectionHeader, StatTile } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { money } from "@/lib/utils";
import { listActivities, listCustomers, listDeals, listLeads } from "@/modules/crm/services/crm.store";

export default function CrmPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const leads = useMemo(() => listLeads(tenantId), [tenantId]);
  const deals = useMemo(() => listDeals(tenantId), [tenantId]);
  const customers = useMemo(() => listCustomers(tenantId), [tenantId]);
  const activities = useMemo(() => listActivities(tenantId), [tenantId]);

  const openDeals = deals.filter((d) => d.status === "open");
  const pipeline = openDeals.reduce((s, d) => s + d.amount, 0);
  const funnel = ["new", "contacted", "qualified", "converted", "lost"].map((stage) => ({
    stage,
    count: leads.filter((l) => l.status === stage).length,
    value: leads.filter((l) => l.status === stage).reduce((s, l) => s + l.estimated_value, 0)
  }));

  return (
    <AppShell activeModule="crm">
      <ModuleBreadcrumbs />
      <ModuleStartGuide module="crm" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatTile label="Open leads" value={String(leads.filter((l) => l.status !== "converted" && l.status !== "lost").length)} detail={`${customers.length} customers`} icon={UserRoundCheck} tone="teal" />
        <StatTile label="Pipeline value" value={money(pipeline)} detail={`${openDeals.length} open deals`} icon={Plus} tone="coral" />
        <StatTile label="Activities" value={String(activities.length)} detail="Logged follow-ups" icon={CalendarClock} tone="amber" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel>
          <SectionHeader
            title="Deals pipeline"
            eyebrow="CRM"
            action={
              <Button href="/crm/deals">
                <Plus className="size-4" /> New deal
              </Button>
            }
          />
          <div className="mb-3 flex flex-wrap gap-2">
            <Button href="/crm/leads/new" variant="secondary">New lead</Button>
            <Button href="/crm/customers" variant="secondary">Add customer</Button>
            <Button href="/crm/activities" variant="secondary">Log activity</Button>
          </div>
          <div className="grid gap-3">
            {deals.slice(0, 6).map((deal) => (
              <div key={deal.id} className="rounded-md border border-line bg-cloud p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-bold text-ink">{deal.title}</p>
                    <p className="text-sm text-slate-500">{deal.deal_no}</p>
                  </div>
                  <Badge tone={deal.stage === "won" ? "success" : deal.stage === "lost" ? "danger" : "info"}>{deal.stage}</Badge>
                </div>
                <div className="mt-4 h-2 rounded-full bg-white">
                  <div className="h-2 rounded-full bg-teal" style={{ width: `${Math.min(100, deal.probability)}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-sm text-slate-600">
                  <span>{money(deal.amount)}</span>
                  <span>{deal.probability}% probability</span>
                </div>
              </div>
            ))}
            {deals.length === 0 ? <p className="text-sm text-slate-500">No deals yet — create one from Deals.</p> : null}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Lead funnel" eyebrow="By status" />
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9e1ec" />
                <XAxis dataKey="stage" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(value, name) => (name === "value" ? money(Number(value)) : value)} />
                <Bar dataKey="count" fill="#1877f2" radius={[6, 6, 0, 0]} name="Leads" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel className="mt-5">
        <SectionHeader title="Recent leads" eyebrow="CRM" />
        <DataTable
          columns={["Lead", "Company", "Status", "Value"]}
          rows={leads.slice(0, 8).map((l) => [l.lead_no, l.company_name, l.status, money(l.estimated_value)])}
        />
      </Panel>
    </AppShell>
  );
}

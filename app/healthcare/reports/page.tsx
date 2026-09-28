"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, BedDouble, FlaskConical, Pill, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { useConfirm } from "@/components/common/use-confirm";
import { Button, Field, Panel, SectionHeader, SelectInput, StatTile, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { money } from "@/lib/utils";
import {
  createQualityIndicator,
  generateRegulatoryReport,
  getClinicalAnalytics,
  listQualityIndicators,
  listRegulatoryReports,
  pullHmsClinicalFromSupabase,
  subscribeHmsClinical,
  updateQualityIndicator
} from "@/modules/healthcare/services/hms-clinical.store";
import { pullHmsFromSupabase, subscribeHms } from "@/modules/healthcare/services/hms.store";

export default function HealthcareReportsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [tick, setTick] = useState(0);
  const [qualityForm, setQualityForm] = useState({
    code: "",
    name: "",
    period: new Date().toISOString().slice(0, 7),
    value_text: "",
    target_text: "",
    status: "on_track" as const
  });
  const [reportForm, setReportForm] = useState({
    template_key: "public_health_summary",
    region: "default",
    title: "Public health summary",
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    period_end: new Date().toISOString().slice(0, 10)
  });

  useEffect(() => {
    void pullHmsClinicalFromSupabase(tenantId).finally(() => setTick((t) => t + 1));
    void pullHmsFromSupabase(tenantId).finally(() => setTick((t) => t + 1));
    const u1 = subscribeHmsClinical(() => setTick((t) => t + 1));
    const u2 = subscribeHms(() => setTick((t) => t + 1));
    return () => {
      u1();
      u2();
    };
  }, [tenantId]);

  const analytics = useMemo(() => getClinicalAnalytics(tenantId), [tenantId, tick]);
  const qualityRows = useMemo(() => listQualityIndicators(tenantId), [tenantId, tick]);
  const regulatoryRows = useMemo(() => listRegulatoryReports(tenantId), [tenantId, tick]);

  function doSaveQuality() {
    if (!qualityForm.code.trim() || !qualityForm.name.trim()) return;
    createQualityIndicator(tenantId, {
      code: qualityForm.code.trim(),
      name: qualityForm.name.trim(),
      period: qualityForm.period,
      value_text: qualityForm.value_text,
      target_text: qualityForm.target_text || null,
      status: qualityForm.status,
      notes: null
    });
    setQualityForm({ code: "", name: "", period: qualityForm.period, value_text: "", target_text: "", status: "on_track" });
    setTick((t) => t + 1);
  }

  function doGenerateReport() {
    const titles: Record<string, string> = {
      public_health_summary: "Public health summary",
      occupancy_regulatory: "Occupancy regulatory report"
    };
    generateRegulatoryReport(tenantId, {
      ...reportForm,
      title: reportForm.title || (titles[reportForm.template_key] ?? "Regulatory report")
    });
    setTick((t) => t + 1);
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Healthcare analytics"
        description="HMS clinical KPIs, quality indicators, and aggregate regulatory reports."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Bed occupancy"
          value={`${analytics.occupancy_rate}%`}
          detail={`${analytics.occupied_beds} / ${analytics.total_beds} beds`}
          icon={BedDouble}
          tone="teal"
        />
        <StatTile label="Pending labs" value={String(analytics.pending_labs)} detail="Ordered / processing" icon={FlaskConical} tone="amber" />
        <StatTile label="Low stock SKUs" value={String(analytics.low_stock_count)} detail={`${analytics.near_expiry_count} near expiry`} icon={Pill} tone="coral" />
        <StatTile label="Clinical revenue" value={money(analytics.revenue_total)} detail="Paid invoices" icon={Wallet} tone="mint" />
      </div>
      <Panel className="mb-6">
        <SectionHeader title="Clinical ops snapshot" eyebrow="Live from HMS stores" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded border border-line px-3 py-2">
            <div className="text-xs text-slate-500">Occupied beds</div>
            <div className="font-semibold">{analytics.occupied_beds}</div>
          </div>
          <div className="rounded border border-line px-3 py-2">
            <div className="text-xs text-slate-500">Total active beds</div>
            <div className="font-semibold">{analytics.total_beds}</div>
          </div>
          <div className="rounded border border-line px-3 py-2">
            <div className="text-xs text-slate-500">Pending lab orders</div>
            <div className="font-semibold">{analytics.pending_labs}</div>
          </div>
          <div className="rounded border border-line px-3 py-2">
            <div className="text-xs text-slate-500">Pharmacy alerts</div>
            <div className="flex items-center gap-1 font-semibold">
              <Activity className="h-3 w-3" />
              {analytics.low_stock_count} low · {analytics.near_expiry_count} expiry
            </div>
          </div>
        </div>
      </Panel>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Panel>
          <SectionHeader title="Quality indicators" eyebrow="Clinical / CQI" />
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: false, entityLabel: "quality indicator", onConfirm: doSaveQuality });
            }}
          >
            <Field label="Code">
              <TextInput required value={qualityForm.code} onChange={(e) => setQualityForm({ ...qualityForm, code: e.target.value })} />
            </Field>
            <Field label="Name">
              <TextInput required value={qualityForm.name} onChange={(e) => setQualityForm({ ...qualityForm, name: e.target.value })} />
            </Field>
            <Field label="Period">
              <TextInput value={qualityForm.period} onChange={(e) => setQualityForm({ ...qualityForm, period: e.target.value })} placeholder="2026-Q3" />
            </Field>
            <Field label="Value">
              <TextInput value={qualityForm.value_text} onChange={(e) => setQualityForm({ ...qualityForm, value_text: e.target.value })} />
            </Field>
            <Field label="Target">
              <TextInput value={qualityForm.target_text} onChange={(e) => setQualityForm({ ...qualityForm, target_text: e.target.value })} />
            </Field>
            <Field label="Status">
              <SelectInput value={qualityForm.status} onChange={(e) => setQualityForm({ ...qualityForm, status: e.target.value as typeof qualityForm.status })}>
                <option value="on_track">On track</option>
                <option value="at_risk">At risk</option>
                <option value="breached">Breached</option>
              </SelectInput>
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit">Add indicator</Button>
            </div>
          </form>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-2 py-2">Indicator</th>
                  <th>Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {qualityRows.slice(0, 8).map((q) => (
                  <tr key={q.id} className="border-t border-line">
                    <td className="px-2 py-2">
                      <div className="font-medium">{q.name}</div>
                      <div className="text-xs text-slate-500">
                        {q.code} · {q.period}
                      </div>
                    </td>
                    <td>
                      {q.value_text}
                      {q.target_text ? <span className="text-xs text-slate-500"> / {q.target_text}</span> : null}
                    </td>
                    <td>
                      <StatusBadge status={q.status} />
                      <Button
                        type="button"
                        variant="ghost"
                        className="ml-1 !px-1 !py-0 text-xs"
                        onClick={() => {
                          const next = q.status === "on_track" ? "at_risk" : q.status === "at_risk" ? "breached" : "on_track";
                          updateQualityIndicator(q.id, { status: next });
                          setTick((t) => t + 1);
                        }}
                      >
                        Cycle
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Regulatory reports" eyebrow="Aggregate payloads only" />
          <p className="mt-2 text-xs text-slate-500">Templates emit counts and occupancy — no patient names or PHI in JSON payloads.</p>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: false, entityLabel: "regulatory report", onConfirm: doGenerateReport });
            }}
          >
            <Field label="Template">
              <SelectInput value={reportForm.template_key} onChange={(e) => setReportForm({ ...reportForm, template_key: e.target.value })}>
                <option value="public_health_summary">Public health summary</option>
                <option value="occupancy_regulatory">Occupancy regulatory</option>
              </SelectInput>
            </Field>
            <Field label="Region">
              <TextInput value={reportForm.region} onChange={(e) => setReportForm({ ...reportForm, region: e.target.value })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Period start">
                <TextInput type="date" value={reportForm.period_start} onChange={(e) => setReportForm({ ...reportForm, period_start: e.target.value })} />
              </Field>
              <Field label="Period end">
                <TextInput type="date" value={reportForm.period_end} onChange={(e) => setReportForm({ ...reportForm, period_end: e.target.value })} />
              </Field>
            </div>
            <Button type="submit">Generate report</Button>
          </form>
          <div className="mt-4 space-y-2">
            {regulatoryRows.slice(0, 5).map((r) => (
              <div key={r.id} className="rounded border border-line px-3 py-2 text-sm">
                <div className="font-medium">{r.title}</div>
                <div className="text-xs text-slate-500">
                  {r.template_key} · {r.period_start} → {r.period_end} · {r.status}
                </div>
                <pre className="mt-1 max-h-24 overflow-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(r.payload, null, 2)}</pre>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <p className="text-center text-xs text-slate-500">
        Cross-company executive view:{" "}
        <Link href="/reports" className="font-semibold text-teal hover:underline">
          Data Warehouse / BI
        </Link>
      </p>
    </AppShell>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, BedDouble, FlaskConical, Pill, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { Panel, SectionHeader, StatTile } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { money } from "@/lib/utils";
import {
  getClinicalAnalytics,
  pullHmsClinicalFromSupabase,
  subscribeHmsClinical
} from "@/modules/healthcare/services/hms-clinical.store";
import { pullHmsFromSupabase, subscribeHms } from "@/modules/healthcare/services/hms.store";

export default function HealthcareReportsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const [tick, setTick] = useState(0);

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

  return (
    <AppShell activeModule="healthcare">
      <ModuleBreadcrumbs />
      <PageHeader
        title="Healthcare analytics"
        description="HMS clinical KPIs — occupancy, labs, pharmacy, and revenue."
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
      <p className="text-center text-xs text-slate-500">
        Cross-company executive view:{" "}
        <Link href="/reports" className="font-semibold text-teal hover:underline">
          Data Warehouse / BI
        </Link>
      </p>
    </AppShell>
  );
}

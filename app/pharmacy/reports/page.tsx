"use client";

import { useEffect, useState } from "react";
import { PharmacyShell } from "@/components/pharmacy/pharmacy-shell";
import { Panel } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import {
  listLowStockProducts,
  listNearExpiryBatches,
  listPharmacySales,
  pharmacyDashboardStats,
  subscribePharmacy
} from "@/modules/pharmacy/services/pharmacy.store";

function pkr(n: number) {
  return `Rs ${n.toLocaleString("en-PK")}`;
}

export default function PharmacyReportsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const [stats, setStats] = useState(() => pharmacyDashboardStats(tenantId));
  const [low, setLow] = useState(() => listLowStockProducts(tenantId));
  const [near, setNear] = useState(() => listNearExpiryBatches(tenantId));
  const [salesCount, setSalesCount] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setStats(pharmacyDashboardStats(tenantId));
      setLow(listLowStockProducts(tenantId));
      setNear(listNearExpiryBatches(tenantId));
      setSalesCount(listPharmacySales(tenantId).length);
    };
    refresh();
    return subscribePharmacy(refresh);
  }, [tenantId]);

  return (
    <PharmacyShell title="Reports" description="Shop snapshot — sales, low stock, near expiry.">
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Panel className="p-3">
          <p className="text-xs text-slate-500">Today sales</p>
          <p className="text-lg font-bold">{pkr(stats.todaySalesTotal)}</p>
        </Panel>
        <Panel className="p-3">
          <p className="text-xs text-slate-500">Tickets today</p>
          <p className="text-lg font-bold">{stats.todayTicketCount}</p>
        </Panel>
        <Panel className="p-3">
          <p className="text-xs text-slate-500">All-time sales</p>
          <p className="text-lg font-bold">{salesCount}</p>
        </Panel>
        <Panel className="p-3">
          <p className="text-xs text-slate-500">Low / expiry</p>
          <p className="text-lg font-bold">
            {low.length} / {near.length}
          </p>
        </Panel>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Panel>
          <p className="mb-2 text-sm font-bold text-ink">Low stock</p>
          <ul className="space-y-1 text-sm text-slate-600">
            {low.map((p) => (
              <li key={p.id}>
                {p.name} <span className="text-slate-400">(reorder ≤ {p.reorder_level})</span>
              </li>
            ))}
            {!low.length ? <li>None</li> : null}
          </ul>
        </Panel>
        <Panel>
          <p className="mb-2 text-sm font-bold text-ink">Near expiry (90 days)</p>
          <ul className="space-y-1 text-sm text-slate-600">
            {near.map((b) => (
              <li key={b.id}>
                {b.batch_no} · exp {b.expiry_date} · qty {b.quantity}
              </li>
            ))}
            {!near.length ? <li>None</li> : null}
          </ul>
        </Panel>
      </div>
    </PharmacyShell>
  );
}

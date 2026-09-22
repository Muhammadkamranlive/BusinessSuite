"use client";

import { useMemo } from "react";
import { BarChart3, Package, Repeat, ShoppingBag } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { Button, Panel, SectionHeader, StatTile } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { money } from "@/lib/utils";
import { marketplaceAnalytics } from "@/modules/healthcare/services/pharmacy-marketplace.store";

export default function MarketplaceAnalyticsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const a = useMemo(() => marketplaceAnalytics(tenantId), [tenantId]);

  return (
    <AppShell activeModule="healthcare">
      <ModuleBreadcrumbs />
      <PageHeader
        title="Marketplace analytics"
        description="Orders, revenue by pharmacy, top products, repeat clinics, and fulfillment backlog."
        actionLabel="Export CSV"
        onAction={() =>
          exportListCsv({
            tenantId,
            module: "healthcare",
            filename: "marketplace-analytics",
            rows: [
              { Metric: "Total orders", Value: a.totalOrders },
              { Metric: "Revenue", Value: a.revenue },
              { Metric: "Average order", Value: Math.round(a.avgOrder * 100) / 100 },
              { Metric: "Pending orders", Value: a.pending },
              { Metric: "Repeat clinics", Value: a.repeatClinics },
              ...a.byPharmacy.map((p) => ({ Metric: `Pharmacy · ${p.name}`, Value: p.revenue })),
              ...a.topProducts.map((p) => ({ Metric: `Product · ${p.name}`, Value: p.qty }))
            ]
          })
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Orders" value={String(a.totalOrders)} detail={`${a.pending} pending`} icon={ShoppingBag} tone="teal" />
        <StatTile label="Revenue" value={money(a.revenue)} detail={`AOV ${money(a.avgOrder)}`} icon={BarChart3} tone="mint" />
        <StatTile label="Catalog" value={String(a.catalogSize)} detail={`${a.activePharmacies} pharmacies`} icon={Package} tone="amber" />
        <StatTile label="Repeat clinics" value={String(a.repeatClinics)} detail={`${a.approvedProviders} approved providers`} icon={Repeat} tone="coral" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <SectionHeader title="Revenue by pharmacy" eyebrow="Fulfillment performance" />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">Pharmacy</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {a.byPharmacy.map((p) => (
                  <tr key={p.name} className="border-t border-line">
                    <td className="px-3 py-3 font-medium">{p.name}</td>
                    <td>{p.orders}</td>
                    <td>{money(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <SectionHeader title="Top products" eyebrow="Most frequently ordered" />
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                exportListPdf({
                  tenantId,
                  module: "healthcare",
                  title: "Top marketplace products",
                  filename: "marketplace-top-products",
                  columns: ["Product", "Qty", "Revenue"],
                  rows: a.topProducts.map((p) => [p.name, p.qty, p.revenue])
                })
              }
            >
              Export PDF
            </Button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">Product</th>
                  <th>Qty</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {a.topProducts.length ? (
                  a.topProducts.map((p) => (
                    <tr key={p.name} className="border-t border-line">
                      <td className="px-3 py-3 font-medium">{p.name}</td>
                      <td>{p.qty}</td>
                      <td>{money(p.revenue)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-3 text-slate-500" colSpan={3}>
                      No orders yet — place a clinic order or checkout to populate analytics.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {a.paymentFailed ? (
            <p className="mt-3 text-sm text-rose-600">{a.paymentFailed} failed payment(s) need follow-up.</p>
          ) : null}
        </Panel>
      </div>
    </AppShell>
  );
}

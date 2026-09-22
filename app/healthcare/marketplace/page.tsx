"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Package, ShoppingBag, ShieldCheck, Truck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { ActionCard, Panel, SectionHeader, SelectInput, StatTile, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { money } from "@/lib/utils";
import {
  MARKETPLACE_CATEGORIES,
  listMarketplaceProducts,
  listPharmacies,
  listProviders,
  marketplaceAnalytics
} from "@/modules/healthcare/services/pharmacy-marketplace.store";

export default function MarketplaceHubPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [pharmacyId, setPharmacyId] = useState("all");

  const pharmacies = useMemo(() => listPharmacies(tenantId), [tenantId]);
  const providers = useMemo(() => listProviders(tenantId), [tenantId]);
  const analytics = useMemo(() => marketplaceAnalytics(tenantId), [tenantId]);
  const products = useMemo(() => {
    const rows = listMarketplaceProducts(tenantId, {
      category,
      pharmacyId: pharmacyId === "all" ? undefined : pharmacyId
    });
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.pharmacy_name.toLowerCase().includes(q)
    );
  }, [tenantId, search, category, pharmacyId]);

  const featured = products.filter((p) => p.featured);

  return (
    <AppShell activeModule="healthcare">
      <ModuleBreadcrumbs />
      <PageHeader
        title="Rx marketplace"
        description="Verified clinicians order peptides, hormones, and wellness therapies from integrated pharmacy partners."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Catalog SKUs" value={String(analytics.catalogSize)} detail="Active products" icon={Package} tone="teal" />
        <StatTile label="Pharmacy partners" value={String(analytics.activePharmacies)} detail="API + manual" icon={Truck} tone="mint" />
        <StatTile label="Approved providers" value={String(analytics.approvedProviders)} detail={`${analytics.pendingProviders} pending review`} icon={ShieldCheck} tone="amber" />
        <StatTile label="Orders" value={String(analytics.totalOrders)} detail={`${analytics.pending} in flight`} icon={ShoppingBag} tone="coral" />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ActionCard href="/healthcare/providers" title="Provider verification" detail="NPI, license, approve / suspend" icon={ShieldCheck} />
        <ActionCard href="/healthcare/clinic-orders" title="Clinic orders" detail="Patient-specific Rx workflows" icon={ShoppingBag} />
        <ActionCard href="/healthcare/fulfillment" title="Pharmacy fulfillment" detail="Accept, ship, track" icon={Truck} />
        <ActionCard href="/healthcare/checkout" title="Checkout" detail="Fees, payment, invoices" icon={Package} />
      </div>

      <Panel className="mb-4">
        <SectionHeader title="Browse catalog" eyebrow="Amazon-style discovery for licensed professionals" />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <TextInput placeholder="Search products, SKU, pharmacy…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <SelectInput value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {MARKETPLACE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectInput>
          <SelectInput value={pharmacyId} onChange={(e) => setPharmacyId(e.target.value)}>
            <option value="all">All pharmacies</option>
            {pharmacies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectInput>
        </div>
      </Panel>

      {featured.length ? (
        <Panel className="mb-4">
          <SectionHeader title="Featured" eyebrow="Frequently ordered" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {featured.map((p) => (
              <Link
                key={p.id}
                href={`/healthcare/checkout?product=${p.id}`}
                className="rounded-[var(--bs-radius-lg)] border border-[var(--bs-border)] bg-[var(--bs-surface)] p-4 transition hover:border-[var(--bs-accent)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[var(--bs-ink)]">{p.name}</p>
                    <p className="text-xs text-[var(--bs-muted)]">
                      {p.strength} · {p.form} · {p.pharmacy_name}
                    </p>
                  </div>
                  <p className="font-semibold text-[var(--bs-accent)]">{money(p.unit_price)}</p>
                </div>
                {p.controlled ? (
                  <p className="mt-2 text-xs text-amber-700">Controlled — DEA / state rules apply</p>
                ) : null}
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel>
        <SectionHeader title={`${products.length} products`} eyebrow={category === "all" ? "Full catalog" : category} />
        <div className="mt-4 overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Pharmacy</th>
                <th>Strength</th>
                <th>Price</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/healthcare/checkout?product=${p.id}`} className="font-medium text-[var(--bs-accent)]">
                      {p.name}
                    </Link>
                    <div className="text-xs text-[var(--bs-muted)]">{p.sku}</div>
                    {p.warning ? <div className="text-xs text-amber-700">{p.warning}</div> : null}
                  </td>
                  <td>{p.category}</td>
                  <td>{p.pharmacy_name}</td>
                  <td>
                    {p.strength} / {p.form}
                  </td>
                  <td>{money(p.unit_price)}</td>
                  <td>{p.stock_qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!providers.some((p) => p.can_order) ? (
          <p className="mt-3 text-sm text-amber-700">No approved providers can order yet — complete verification first.</p>
        ) : null}
      </Panel>
    </AppShell>
  );
}

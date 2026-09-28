"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClipboardList, Package, Pill, ShoppingCart, Truck } from "lucide-react";
import { PharmacyShell } from "@/components/pharmacy/pharmacy-shell";
import { Panel } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import {
  pharmacyDashboardStats,
  subscribePharmacy
} from "@/modules/pharmacy/services/pharmacy.store";

const QUICK = [
  { href: "/pharmacy/pos", label: "Point of sale", detail: "Sell medicines at the counter", icon: ShoppingCart },
  { href: "/pharmacy/products", label: "Products / SKU", detail: "Add and price shop items", icon: Pill },
  { href: "/pharmacy/inventory", label: "Inventory & batches", detail: "Batch, expiry, stock on hand", icon: Package },
  { href: "/pharmacy/sales", label: "Sales history", detail: "Today’s and past invoices", icon: ClipboardList },
  { href: "/pharmacy/purchases", label: "Purchases", detail: "Supplier receive (next)", icon: Truck }
] as const;

function pkr(n: number) {
  return `Rs ${n.toLocaleString("en-PK")}`;
}

export default function PharmacyOverviewPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const [stats, setStats] = useState(() => pharmacyDashboardStats(tenantId));

  useEffect(() => {
    const refresh = () => setStats(pharmacyDashboardStats(tenantId));
    refresh();
    return subscribePharmacy(refresh);
  }, [tenantId]);

  return (
    <PharmacyShell
      title="Alif Pharmacy"
      description="Medical shop POS for Pakistan — counter sales, batch stock, phone at checkout, thermal bills."
      actionLabel="Open POS"
      actionHref="/pharmacy/pos"
    >
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Today's sales", value: pkr(stats.todaySalesTotal) },
          { label: "Tickets today", value: String(stats.todayTicketCount) },
          { label: "Low stock SKUs", value: String(stats.lowStock) },
          { label: "Near expiry", value: String(stats.nearExpiry) }
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-line bg-white px-3 py-3 shadow-[0_1px_2px_rgba(15,36,82,0.04)] sm:px-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-ink sm:text-2xl">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex min-h-[5.5rem] items-start gap-3 rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,36,82,0.04)] transition hover:border-teal/40 hover:shadow-[0_8px_24px_rgba(15,36,82,0.08)]"
            >
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-teal">
                <Icon className="size-5" strokeWidth={1.85} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink group-hover:text-teal">{item.label}</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">{item.detail}</span>
              </span>
            </Link>
          );
        })}
      </div>

      <Panel className="mt-5 border border-line bg-white p-4 sm:p-5">
        <p className="text-sm font-semibold text-ink">How to use</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-600">
          <li>Open <strong>Point of sale</strong> and scan/search a medicine.</li>
          <li>System picks the earliest-expiry batch (FEFO) automatically.</li>
          <li>Ask for phone (and optional name / CNIC), take cash or card — completing the sale prints an Epson thermal bill and reduces stock.</li>
        </ol>
      </Panel>
    </PharmacyShell>
  );
}

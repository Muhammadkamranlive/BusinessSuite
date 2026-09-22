"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Lock, Package, Search, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { getStoredTenantId } from "@/lib/auth/session";
import { BILLABLE_MODULES } from "@/lib/billing/module-catalog";
import { navGroups, type ModuleKey } from "@/lib/permissions";
import { canViewModule } from "@/modules/admin/services/acl.store";
import {
  formatMoney,
  getActiveSubscription,
  getPackageByCode
} from "@/modules/billing/services/subscriptions.store";
import { tenantHasModule } from "@/modules/billing/services/tenant-apps.store";
import { cn } from "@/lib/utils";

const APP_BLURBS: Partial<Record<ModuleKey, string>> = {
  dashboard: "Executive KPIs",
  crm: "Pipeline & customers",
  sales: "Quote to cash",
  purchases: "Procure to pay",
  inventory: "Stock & warehouses",
  operations: "Plant & maintenance",
  hrm: "People & payroll",
  healthcare: "HMS & pharmacy",
  documents: "Files & compliance",
  finance: "GL & banking",
  projects: "Tasks & time",
  reports: "BI & snapshots",
  settings: "Users & access"
};

const APP_TONES: Partial<Record<ModuleKey, string>> = {
  dashboard: "from-[#714B67] to-[#9b6b8f]",
  crm: "from-[#017e84] to-[#0eacb3]",
  sales: "from-[#c0334d] to-[#e85d75]",
  purchases: "from-[#b7791f] to-[#d4a017]",
  inventory: "from-[#1f6f4a] to-[#2ea06a]",
  operations: "from-[#5b4b8a] to-[#7c6bb0]",
  hrm: "from-[#875a7b] to-[#a8789a]",
  healthcare: "from-[#0b6e4f] to-[#14966c]",
  documents: "from-[#3d5a80] to-[#5c7caa]",
  finance: "from-[#1b4965] to-[#2f6f95]",
  projects: "from-[#9a3412] to-[#c2410c]",
  reports: "from-[#1e3a5f] to-[#2563eb]",
  settings: "from-[#374151] to-[#4b5563]"
};

type Category = "all" | "open" | "locked";

export default function AppsPortalPage() {
  const profile = getSessionProfile();
  const tenantId = getStoredTenantId() ?? "alpha";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");

  const sub = useMemo(() => getActiveSubscription(tenantId), [tenantId]);
  const pkg = useMemo(() => (sub ? getPackageByCode(sub.package_code) : null), [sub]);

  const catalog = useMemo(() => {
    const byKey = new Map(navGroups.map((g) => [g.key, g]));
    return BILLABLE_MODULES.map((billable) => {
      const nav = byKey.get(billable.key);
      if (!nav) return null;
      const inPlan = tenantHasModule(tenantId, billable.key);
      const roleOk = canViewModule(profile.role, profile.email, billable.key, tenantId);
      const open = inPlan && roleOk;
      return {
        key: billable.key as ModuleKey,
        label: nav.label,
        href: nav.href,
        icon: nav.icon,
        blurb: APP_BLURBS[billable.key] ?? billable.tagline,
        tone: APP_TONES[billable.key] ?? "from-[#1877f2] to-[#4267b2]",
        open,
        lockedReason: !inPlan ? "Not in your plan" : !roleOk ? "No role access" : null
      };
    }).filter(Boolean) as Array<{
      key: ModuleKey;
      label: string;
      href: string;
      icon: (typeof navGroups)[number]["icon"];
      blurb: string;
      tone: string;
      open: boolean;
      lockedReason: string | null;
    }>;
  }, [tenantId, profile.role, profile.email]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((app) => {
      if (category === "open" && !app.open) return false;
      if (category === "locked" && app.open) return false;
      if (!q) return true;
      return [app.label, app.blurb, app.key].join(" ").toLowerCase().includes(q);
    });
  }, [catalog, query, category]);

  const openCount = catalog.filter((a) => a.open).length;

  return (
    <AppShell activeModule="dashboard" shellMode="portal">
      <div className="mx-auto w-full max-w-[72rem]">
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_12px_40px_rgba(15,36,82,0.08)]">
          {/* Header band */}
          <div className="relative border-b border-line bg-gradient-to-br from-[color:var(--bs-ink)] via-[#152a5c] to-[#1a3a6e] px-5 py-6 text-white sm:px-8 sm:py-8">
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 12% 20%, rgba(24,119,242,0.45), transparent 42%), radial-gradient(circle at 88% 10%, rgba(232,93,117,0.25), transparent 36%)"
              }}
              aria-hidden
            />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-teal-200">
                  <Sparkles className="size-3.5" aria-hidden />
                  App portal
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Your applications</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
                  Search and open one app at a time. Available apps follow your subscription and role permissions.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                  <Package className="size-3.5 text-teal-200" aria-hidden />
                  {pkg ? `${pkg.name} · ${pkg.badge}` : "No active plan"}
                </span>
                <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                  {openCount} open · {catalog.length - openCount} locked
                </span>
                {sub ? (
                  <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                    {formatMoney(sub.amount_cents, sub.currency)}/{sub.interval === "year" ? "yr" : "mo"}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Search */}
            <div className="relative mt-6">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search apps — CRM, HRM, Healthcare, Finance…"
                className="h-12 w-full rounded-xl border border-white/10 bg-white pl-11 pr-4 text-sm font-medium text-ink shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-[color:var(--bs-teal)] focus:ring-2 focus:ring-[color:var(--bs-teal)]/25"
                aria-label="Search applications"
              />
            </div>
          </div>

          {/* Filters + grid */}
          <div className="bg-[color:var(--bs-cloud)]/60 px-4 py-5 sm:px-6 sm:py-6">
            <div className="mb-5 flex flex-wrap gap-2">
              {(
                [
                  { id: "all", label: "All apps" },
                  { id: "open", label: "Available" },
                  { id: "locked", label: "Not in plan" }
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setCategory(chip.id)}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full border px-3.5 text-xs font-bold transition",
                    category === chip.id
                      ? "border-[color:var(--bs-ink)] bg-[color:var(--bs-ink)] text-white"
                      : "border-line bg-white text-slate-600 hover:border-teal hover:text-ink"
                  )}
                >
                  {chip.label}
                </button>
              ))}
              {!pkg ? (
                <Link
                  href="/settings/billing"
                  className="ml-auto inline-flex h-9 items-center rounded-full border border-teal/40 bg-teal/10 px-3.5 text-xs font-bold text-teal hover:bg-teal/15"
                >
                  Choose a plan
                </Link>
              ) : (
                <Link
                  href="/settings/billing"
                  className="ml-auto inline-flex h-9 items-center rounded-full border border-line bg-white px-3.5 text-xs font-bold text-slate-600 hover:border-teal hover:text-ink"
                >
                  Manage subscription
                </Link>
              )}
            </div>

            {/* Odoo-style box grid — fixed tile size, not fluid stretch */}
            <div className="grid grid-cols-2 justify-items-center gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filtered.map((app) => {
                const Icon = app.icon;
                const tile = (
                  <div
                    className={cn(
                      "flex h-[8.75rem] w-full max-w-[9.5rem] flex-col items-center justify-center rounded-2xl border bg-white px-3 py-4 text-center transition",
                      app.open
                        ? "border-line shadow-sm hover:-translate-y-1 hover:border-teal hover:shadow-[0_14px_28px_rgba(15,36,82,0.12)]"
                        : "border-dashed border-slate-200 opacity-70"
                    )}
                  >
                    <span
                      className={cn(
                        "relative inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm",
                        app.tone,
                        !app.open && "grayscale"
                      )}
                    >
                      <Icon className="size-6" aria-hidden />
                      {!app.open ? (
                        <span className="absolute -right-1 -top-1 inline-flex size-5 items-center justify-center rounded-full bg-slate-700 text-white shadow">
                          <Lock className="size-3" aria-hidden />
                        </span>
                      ) : null}
                    </span>
                    <p className="mt-3 line-clamp-1 text-[13px] font-bold text-ink">{app.label}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-500">
                      {app.open ? app.blurb : app.lockedReason}
                    </p>
                  </div>
                );

                if (app.open) {
                  return (
                    <Link key={app.key} href={app.href} className="w-full max-w-[9.5rem] outline-none">
                      {tile}
                    </Link>
                  );
                }

                return (
                  <Link
                    key={app.key}
                    href="/settings/billing"
                    className="w-full max-w-[9.5rem] outline-none"
                    title="Upgrade your plan to unlock this app"
                  >
                    {tile}
                  </Link>
                );
              })}
            </div>

            {!filtered.length ? (
              <div className="mt-8 rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center">
                <Search className="mx-auto size-8 text-slate-300" aria-hidden />
                <p className="mt-3 text-sm font-semibold text-ink">No apps match “{query}”</p>
                <p className="mt-1 text-sm text-slate-500">Try another keyword or clear filters.</p>
                <button
                  type="button"
                  className="mt-4 text-sm font-bold text-teal hover:underline"
                  onClick={() => {
                    setQuery("");
                    setCategory("all");
                  }}
                >
                  Clear search
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

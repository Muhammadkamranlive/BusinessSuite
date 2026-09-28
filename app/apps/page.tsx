"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, Lock, Mail, Search, ShieldCheck, UserPlus, Workflow, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { getStoredTenantId } from "@/lib/auth/session";
import {
  BILLABLE_MODULES,
  PLATFORM_APPS,
  type PlatformAppId
} from "@/lib/billing/module-catalog";
import { navGroups, type ModuleKey } from "@/lib/permissions";
import { canViewModule } from "@/modules/admin/services/acl.store";
import {
  formatMoney,
  getActiveSubscription,
  getPackageByCode
} from "@/modules/billing/services/subscriptions.store";
import {
  tenantHasModule,
  tenantHasPlatformApp
} from "@/modules/billing/services/tenant-apps.store";
import { cn } from "@/lib/utils";
import { getModuleTone, type ModuleTone } from "@/lib/module-tones";
import type { LucideIcon } from "lucide-react";

type AppTile = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  blurb: string;
  open: boolean;
  lockedReason: string | null;
  suite: string;
  tone: ModuleTone;
};

const SUITES: Array<{
  id: string;
  label: string;
  keys: string[];
  /** Heading / accent colors tied to that suite’s apps */
  heading: string;
  accent: string;
  chip: string;
}> = [
  {
    id: "command",
    label: "Command",
    keys: ["dashboard", "reports"],
    heading: "text-[#0f2452]",
    accent: "bg-[#0f2452]",
    chip: "bg-[#0f2452]/10 text-[#0f2452]"
  },
  {
    id: "commerce",
    label: "Commerce",
    keys: ["crm", "sales"],
    heading: "text-[#0e7490]",
    accent: "bg-[#0e7490]",
    chip: "bg-[#0e7490]/10 text-[#0e7490]"
  },
  {
    id: "supply",
    label: "Supply chain",
    keys: ["purchases", "inventory", "operations"],
    heading: "text-[#047857]",
    accent: "bg-[#047857]",
    chip: "bg-[#047857]/10 text-[#047857]"
  },
  {
    id: "people",
    label: "People & care",
    keys: ["hrm", "healthcare", "pharmacy"],
    heading: "text-[#0f766e]",
    accent: "bg-[#0f766e]",
    chip: "bg-[#0f766e]/10 text-[#0f766e]"
  },
  {
    id: "finance",
    label: "Finance & delivery",
    keys: ["finance", "projects", "documents"],
    heading: "text-[#1e3a8a]",
    accent: "bg-[#1e3a8a]",
    chip: "bg-[#1e3a8a]/10 text-[#1e3a8a]"
  },
  {
    id: "control",
    label: "Administration",
    keys: ["settings"],
    heading: "text-[#334155]",
    accent: "bg-[#334155]",
    chip: "bg-[#334155]/10 text-[#334155]"
  },
  {
    id: "platform",
    label: "Platform engines",
    keys: ["email_engine", "rule_engine"],
    heading: "text-[#7c3aed]",
    accent: "bg-[#7c3aed]",
    chip: "bg-[#7c3aed]/10 text-[#7c3aed]"
  }
];

const PLATFORM_HREF: Record<PlatformAppId, string> = {
  email_engine: "/settings/email-templates",
  rule_engine: "/settings/automations"
};

const PLATFORM_ICON: Record<PlatformAppId, LucideIcon> = {
  email_engine: Mail,
  rule_engine: Workflow
};

type Category = "available" | "all" | "locked";

function greetingForHour(h: number) {
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const ONBOARDING_KEY = "businesssuite:apps:onboarding-dismissed:v1";

/** Three-step start-here card for admins; dismiss persists per browser. */
function GettingStartedCard({ firstAppHref, firstAppLabel }: { firstAppHref: string | null; firstAppLabel: string | null }) {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem(ONBOARDING_KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);
  if (hidden) return null;

  const steps = [
    {
      icon: UserPlus,
      title: "Invite your team",
      text: "Add users and assign a role — accountant, HR manager, storekeeper.",
      href: "/settings/users",
      cta: "Add users"
    },
    {
      icon: ShieldCheck,
      title: "Set access rights",
      text: "Decide which menus each role can view, create, update, or delete.",
      href: "/settings/access",
      cta: "Open Access Control"
    },
    {
      icon: BookOpen,
      title: firstAppLabel ? `Open ${firstAppLabel}` : "Read the guides",
      text: "Every app starts with a numbered process guide — follow it stage by stage.",
      href: firstAppHref ?? "/guides",
      cta: firstAppLabel ? `Go to ${firstAppLabel}` : "Open guides"
    }
  ];

  return (
    <section
      className="mb-6 rounded-[var(--bs-radius)] border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,36,82,0.04)] sm:mb-7 sm:p-5"
      aria-labelledby="apps-getting-started"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal">Start here</p>
          <h2 id="apps-getting-started" className="mt-1 text-base font-semibold text-ink">
            Three steps to a working company
          </h2>
        </div>
        <button
          type="button"
          onClick={() => {
            try {
              window.localStorage.setItem(ONBOARDING_KEY, "1");
            } catch {
              /* ignore */
            }
            setHidden(true);
          }}
          className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-cloud hover:text-ink"
          aria-label="Dismiss getting started"
        >
          <X className="size-4" />
        </button>
      </div>
      <ol className="mt-4 grid gap-3 md:grid-cols-3">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="flex gap-3 rounded-lg border border-line bg-cloud/60 p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-teal shadow-sm">
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  <span className="text-slate-400">{i + 1}.</span> {step.title}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">{step.text}</p>
                <Link href={step.href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal hover:underline">
                  {step.cta} <ArrowUpRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default function AppsPortalPage() {
  const profile = getSessionProfile();
  const tenantId = getStoredTenantId() ?? "alpha";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("available");

  const sub = useMemo(() => getActiveSubscription(tenantId), [tenantId]);
  const pkg = useMemo(() => (sub ? getPackageByCode(sub.package_code) : null), [sub]);

  const catalog = useMemo(() => {
    const byKey = new Map(navGroups.map((g) => [g.key, g]));
    const modules: AppTile[] = BILLABLE_MODULES.map((billable) => {
      const nav = byKey.get(billable.key);
      if (!nav) return null;
      const inPlan = tenantHasModule(tenantId, billable.key);
      const roleOk = canViewModule(profile.role, profile.email, billable.key, tenantId);
      const open = inPlan && roleOk;
      const suite = SUITES.find((s) => s.keys.includes(billable.key))?.id ?? "command";
      return {
        id: billable.key,
        label: nav.label,
        href: nav.href,
        icon: nav.icon,
        blurb: billable.tagline,
        open,
        lockedReason: !inPlan ? "Not in your plan" : !roleOk ? "No role access" : null,
        suite,
        tone: getModuleTone(billable.key)
      };
    }).filter(Boolean) as AppTile[];

    const platforms: AppTile[] = PLATFORM_APPS.map((app) => {
      const licensed = tenantHasPlatformApp(tenantId, app.id);
      const roleOk =
        canViewModule(profile.role, profile.email, "settings", tenantId) ||
        profile.role === "super_admin" ||
        profile.role === "company_admin";
      const open = licensed && roleOk;
      return {
        id: app.id,
        label: app.label,
        href: PLATFORM_HREF[app.id],
        icon: PLATFORM_ICON[app.id],
        blurb: app.tagline,
        open,
        lockedReason: !licensed ? "Not in your plan" : !roleOk ? "No role access" : null,
        suite: "platform",
        tone: getModuleTone(app.id)
      };
    });

    return [...modules, ...platforms];
  }, [tenantId, profile.role, profile.email]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((app) => {
      if (category === "available" && !app.open) return false;
      if (category === "locked" && app.open) return false;
      if (!q) return true;
      return [app.label, app.blurb, app.id].join(" ").toLowerCase().includes(q);
    });
  }, [catalog, query, category]);

  const openCount = catalog.filter((a) => a.open).length;
  const lockedCount = catalog.length - openCount;
  const firstName = profile.name.split(" ")[0] || "there";
  const greeting = greetingForHour(new Date().getHours());

  const suitesWithApps = SUITES.map((suite) => ({
    ...suite,
    apps: filtered.filter((a) => a.suite === suite.id)
  })).filter((s) => s.apps.length > 0);

  return (
    <AppShell activeModule="dashboard" shellMode="portal">
      <div className="mx-auto w-full max-w-[68rem]">
        {/* Workspace header */}
        <header className="mb-6 sm:mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Workspace
          </p>
          <div className="mt-1.5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-[1.65rem] font-semibold tracking-tight text-ink sm:text-[1.85rem]">
                {greeting}, {firstName}
              </h1>
              <p className="mt-1.5 max-w-lg text-sm leading-6 text-slate-500">
                Open one application to enter its workspace. Licenses and role rights control what you see.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[12px]">
              <span className="inline-flex h-8 items-center rounded-md border border-line bg-white px-2.5 font-medium text-slate-600">
                {pkg ? pkg.name : "No plan"}
              </span>
              <span className="inline-flex h-8 items-center rounded-md border border-line bg-white px-2.5 font-medium text-slate-600">
                {openCount} available
                {lockedCount > 0 ? ` · ${lockedCount} locked` : ""}
              </span>
              {sub ? (
                <span className="inline-flex h-8 items-center rounded-md border border-line bg-white px-2.5 font-medium text-slate-600">
                  {formatMoney(sub.amount_cents, sub.currency)}/{sub.interval === "year" ? "yr" : "mo"}
                </span>
              ) : null}
              <Link
                href="/settings/billing"
                className="inline-flex h-8 items-center rounded-md border border-ink/15 bg-ink px-2.5 font-semibold text-white transition hover:bg-ink/90"
              >
                {pkg ? "Manage plan" : "Choose a plan"}
              </Link>
            </div>
          </div>
        </header>

        {profile.role === "super_admin" || profile.role === "company_admin" ? (
          <GettingStartedCard
            firstAppHref={catalog.find((a) => a.open && a.id !== "dashboard" && a.id !== "settings")?.href ?? null}
            firstAppLabel={catalog.find((a) => a.open && a.id !== "dashboard" && a.id !== "settings")?.label ?? null}
          />
        ) : null}

        {/* Search + filters */}
        <div className="mb-6 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search applications</span>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find an app…"
              className="h-11 w-full rounded-lg border border-line bg-white pl-10 pr-4 text-sm text-ink shadow-[0_1px_2px_rgba(15,36,82,0.04)] outline-none placeholder:text-slate-400 focus:border-teal focus:ring-2 focus:ring-teal/20"
            />
          </label>
          <div
            className="inline-flex h-11 shrink-0 items-center rounded-lg border border-line bg-white p-1 shadow-[0_1px_2px_rgba(15,36,82,0.04)]"
            role="tablist"
            aria-label="Filter apps"
          >
            {(
              [
                { id: "available", label: "Available" },
                { id: "all", label: "All" },
                { id: "locked", label: "Locked" }
              ] as const
            ).map((chip) => (
              <button
                key={chip.id}
                type="button"
                role="tab"
                aria-selected={category === chip.id}
                onClick={() => setCategory(chip.id)}
                className={cn(
                  "h-9 rounded-md px-3.5 text-[12px] font-semibold transition",
                  category === chip.id
                    ? "bg-ink text-white shadow-sm"
                    : "text-slate-500 hover:text-ink"
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Suite grids */}
        <div className="space-y-8">
          {suitesWithApps.map((suite) => (
            <section key={suite.id} aria-labelledby={`suite-${suite.id}`}>
              <div className="mb-3.5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn("h-4 w-1 shrink-0 rounded-full", suite.accent)}
                    aria-hidden
                  />
                  <h2
                    id={`suite-${suite.id}`}
                    className={cn(
                      "text-[13px] font-bold tracking-tight sm:text-[14px]",
                      suite.heading
                    )}
                  >
                    {suite.label}
                  </h2>
                </div>
                <span
                  className={cn(
                    "inline-flex h-6 min-w-6 items-center justify-center rounded-md px-2 text-[11px] font-bold tabular-nums",
                    suite.chip
                  )}
                >
                  {suite.apps.length}
                </span>
              </div>
              <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {suite.apps.map((app) => {
                  const Icon = app.icon;
                  const tone = app.tone;
                  const content = (
                    <>
                      <span
                        className={cn(
                          "relative inline-flex size-11 shrink-0 items-center justify-center rounded-[0.7rem] shadow-sm ring-1 ring-black/5",
                          app.open ? tone.well : "bg-slate-200 grayscale",
                          app.open ? tone.icon : "text-slate-500"
                        )}
                      >
                        <Icon className="size-[1.15rem]" strokeWidth={1.9} aria-hidden />
                        {!app.open ? (
                          <span className="absolute -right-1.5 -top-1.5 inline-flex size-4 items-center justify-center rounded-full border border-white bg-slate-700 text-white shadow">
                            <Lock className="size-2.5" aria-hidden />
                          </span>
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[14px] font-semibold tracking-tight text-ink">
                            {app.label}
                          </span>
                          {app.open ? (
                            <ArrowUpRight
                              className="size-3.5 shrink-0 text-slate-300 transition group-hover:text-ink"
                              aria-hidden
                            />
                          ) : null}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] leading-5 text-slate-500">
                          {app.open ? app.blurb : app.lockedReason}
                        </span>
                      </span>
                    </>
                  );

                  return (
                    <li key={app.id}>
                      {app.open ? (
                        <Link
                          href={app.href}
                          className={cn(
                            "group flex items-center gap-3.5 rounded-xl border border-line bg-white px-3.5 py-3.5 shadow-[0_1px_2px_rgba(15,36,82,0.04)] transition hover:shadow-[0_8px_24px_rgba(15,36,82,0.08)] focus-visible:outline-none focus-visible:ring-2",
                            tone.hoverBorder,
                            tone.ring
                          )}
                        >
                          {content}
                        </Link>
                      ) : (
                        <Link
                          href="/settings/billing"
                          title="Upgrade your plan to unlock this app"
                          className="group flex items-center gap-3.5 rounded-xl border border-dashed border-slate-200 bg-white/70 px-3.5 py-3.5 opacity-80 transition hover:border-slate-300 hover:opacity-100"
                        >
                          {content}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        {!filtered.length ? (
          <div className="mt-4 rounded-xl border border-dashed border-line bg-white px-6 py-14 text-center">
            <Search className="mx-auto size-7 text-slate-300" aria-hidden />
            <p className="mt-3 text-sm font-semibold text-ink">
              No apps match{query ? ` “${query}”` : ""}
            </p>
            <p className="mt-1 text-sm text-slate-500">Try another keyword or clear filters.</p>
            <button
              type="button"
              className="mt-4 text-sm font-semibold text-teal hover:underline"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

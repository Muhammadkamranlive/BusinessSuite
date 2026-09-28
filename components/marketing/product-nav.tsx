"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Boxes,
  Building2,
  ChevronDown,
  ClipboardList,
  Factory,
  FileText,
  FolderKanban,
  HeartPulse,
  LayoutDashboard,
  LineChart,
  Mail,
  Package,
  Pill,
  Settings2,
  ShoppingCart,
  Users,
  Wallet,
  Workflow,
  Zap
} from "lucide-react";
import {
  BILLABLE_MODULES,
  PLATFORM_APPS,
  TOTAL_PAYABLE_APP_COUNT,
  type BillableModule,
  type PlatformApp
} from "@/lib/billing/module-catalog";
import { cn } from "@/lib/utils";

const MODULE_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  crm: Users,
  sales: ShoppingCart,
  purchases: ClipboardList,
  inventory: Package,
  operations: Factory,
  hrm: Building2,
  healthcare: HeartPulse,
  pharmacy: Pill,
  documents: FileText,
  finance: Wallet,
  projects: FolderKanban,
  reports: LineChart,
  settings: Settings2
};

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  email_engine: Mail,
  rule_engine: Workflow
};

function moduleHref(m: BillableModule) {
  return m.productSlug ? `/product/${m.productSlug}` : "/#modules";
}

function platformHref(a: PlatformApp) {
  return `/product/${a.productSlug}`;
}

export function ProductNav({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const businessApps = BILLABLE_MODULES.filter((m) => m.key !== "settings");
  const adminApp = BILLABLE_MODULES.find((m) => m.key === "settings");

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function close() {
    setOpen(false);
    onNavigate?.();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium tracking-tight transition",
          open
            ? "bg-[color:var(--bs-ink)] text-white"
            : "text-slate-600 hover:bg-[color:var(--bs-cloud)] hover:text-[color:var(--bs-ink)]"
        )}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="menu"
        aria-label="Product menu — browse all apps"
        onClick={() => setOpen((v) => !v)}
      >
        Product
        <ChevronDown className={cn("size-3.5 opacity-70 transition", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <div
          id={panelId}
          role="menu"
          className="mkt-nav-panel absolute left-0 top-[calc(100%+0.65rem)] z-50 w-[min(52rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-[#e8edf3] bg-white shadow-[0_28px_64px_rgba(15,23,42,0.14)]"
        >
          <div className="grid lg:grid-cols-[1fr_15.5rem]">
            <div className="p-5 md:p-6">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Business apps</p>
                  <p className="mt-1 text-sm text-slate-500">License only what your team runs day to day.</p>
                </div>
                <span className="shrink-0 rounded-full bg-[color:var(--bs-cloud)] px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  {TOTAL_PAYABLE_APP_COUNT} total
                </span>
              </div>

              <div className="mt-4 grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
                {businessApps.map((item) => {
                  const Icon = MODULE_ICONS[item.key] ?? Boxes;
                  return (
                    <Link
                      key={item.key}
                      href={moduleHref(item)}
                      role="menuitem"
                      className="group flex items-start gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-[color:var(--bs-cloud)]"
                      onClick={close}
                    >
                      <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#e8edf3] bg-white text-[color:var(--bs-ink)] shadow-[0_1px_0_rgba(15,23,42,0.04)] transition group-hover:border-[color:var(--bs-teal)]/30 group-hover:text-[color:var(--bs-teal)]">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-[color:var(--bs-ink)]">{item.label}</span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{item.tagline}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <aside className="border-t border-[#eef2f6] bg-[#f8fafc] p-5 md:p-6 lg:border-l lg:border-t-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Platform</p>
              <div className="mt-3 space-y-1">
                {PLATFORM_APPS.map((app) => {
                  const Icon = PLATFORM_ICONS[app.id] ?? Zap;
                  return (
                    <Link
                      key={app.id}
                      href={platformHref(app)}
                      role="menuitem"
                      className="group flex items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white"
                      onClick={close}
                    >
                      <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--bs-ink)] text-white">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-[color:var(--bs-ink)]">{app.label}</span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{app.tagline}</span>
                      </span>
                    </Link>
                  );
                })}
                {adminApp ? (
                  <Link
                    href={moduleHref(adminApp)}
                    role="menuitem"
                    className="group flex items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white"
                    onClick={close}
                  >
                    <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#e8edf3] bg-white text-[color:var(--bs-ink)]">
                      <Settings2 className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-[color:var(--bs-ink)]">{adminApp.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{adminApp.tagline}</span>
                    </span>
                  </Link>
                ) : null}
              </div>

              <div className="mt-6 space-y-2 border-t border-[#e8edf3] pt-4">
                <Link
                  href="/#build-your-plan"
                  className="flex items-center justify-between rounded-xl bg-[color:var(--bs-ink)] px-3.5 py-3 text-[13px] font-semibold text-white transition hover:opacity-95"
                  onClick={close}
                >
                  Build your plan
                  <ArrowRight className="size-4 opacity-80" aria-hidden />
                </Link>
                <Link
                  href="/#modules"
                  className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-slate-600 transition hover:bg-white hover:text-[color:var(--bs-ink)]"
                  onClick={close}
                >
                  Browse all apps
                  <ArrowRight className="size-3.5 opacity-50" aria-hidden />
                </Link>
              </div>
            </aside>
          </div>
        </div>
      ) : null}
    </div>
  );
}

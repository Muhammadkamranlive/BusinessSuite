"use client";

import { useCallback } from "react";
import {
  FileSpreadsheet,
  History,
  LayoutDashboard,
  Layers3,
  ListChecks,
  Search,
  ShieldCheck,
  Smartphone,
  SlidersHorizontal,
  Workflow
} from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";

const cells = [
  {
    icon: Layers3,
    title: "Pay per app licensing",
    body:
      "Start with Silver, Gold, Platinum, or Professional — then license only CRM, HRM, Healthcare, Email Engine, Rule Engine, or any mix. No paying for modules you never open.",
    span: "lg:col-span-2"
  },
  {
    icon: Workflow,
    title: "Rule Engine on every module",
    body:
      "When→then automations: email, in-app alerts, tasks, and approvals. Pick events, templates, and recipients — {{user_email}} or custom addresses.",
    span: "lg:col-span-2"
  },
  {
    icon: ShieldCheck,
    title: "Role-based access on every menu",
    body:
      "Every one of the ~180 screens is registered with view / create / update / delete rights. Assign a role, override per user — an accountant never sees payroll, a storekeeper never sees pricing.",
    span: "lg:col-span-2"
  },
  {
    icon: Search,
    title: "⌘K global search",
    body: "Jump to any menu you're allowed to see from the top bar. New pages appear in search automatically."
  },
  {
    icon: SlidersHorizontal,
    title: "Extra fields per company",
    body: "Each tenant extends fixed forms with its own custom fields — no developer, no schema change."
  },
  {
    icon: History,
    title: "Audit trail & recycle bin",
    body: "Every create, update, trash, restore, and export is logged. Deleted records land in a recycle bin, not the void."
  },
  {
    icon: FileSpreadsheet,
    title: "CSV & PDF everywhere",
    body: "Every list exports the exact filtered, sorted view — and writes an audit event when it does."
  },
  {
    icon: ListChecks,
    title: "Enforced business rules",
    body:
      "Three-way match blocks variant vendor bills. Credit hold stops over-limit orders. Receipts can't over-allocate. Payroll posts straight to GL.",
    span: "lg:col-span-2"
  },
  {
    icon: Smartphone,
    title: "Phone-ready, Capacitor-ready",
    body: "Every screen works at 375px — same codebase ships to the web, tablets, and native mobile shells."
  },
  {
    icon: LayoutDashboard,
    title: "Live dashboards & BI",
    body: "Operational mix, funnel, AR/AP, attendance, and stock health — snapshots your leadership actually reads."
  }
];

export function FeatureBento() {
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }, []);

  return (
    <section id="platform" className="bg-[color:var(--bs-cloud)]">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="mkt-eyebrow">The platform layer</p>
          <h2 className="mkt-display mt-3 text-3xl text-[color:var(--bs-ink)] sm:text-4xl">
            Details that make it feel like software built for you
          </h2>
          <p className="mkt-muted mt-4 text-[15px] leading-7">
            Not a demo shell — a governed system. Access control, auditing, exports, and custom fields are
            wired into every module, not bolted onto a few.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cells.map((cell, i) => {
            const Icon = cell.icon;
            return (
              <Reveal key={cell.title} delay={i * 60} className={cell.span ?? ""}>
                <div className="mkt-bento h-full" onMouseMove={onMove}>
                  <span className="mkt-bento-icon">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-[color:var(--bs-ink)]">{cell.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{cell.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

"use client";

import {
  Bell,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  FileText,
  FolderOpen,
  KeyRound,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  UserPlus,
  Users,
  Wallet,
  BarChart3,
  ArrowDown,
  ArrowRight
} from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import type { FlowIcon, ModuleFlow } from "@/lib/product-module-flows";
import { cn } from "@/lib/utils";

const icons: Record<FlowIcon, typeof Users> = {
  shield: ShieldCheck,
  userPlus: UserPlus,
  users: Users,
  briefcase: BriefcaseBusiness,
  check: CheckCircle2,
  file: FileText,
  wallet: Wallet,
  boxes: Boxes,
  cart: ShoppingCart,
  truck: Truck,
  chart: BarChart3,
  building: Building2,
  key: KeyRound,
  bell: Bell,
  folder: FolderOpen,
  spark: Sparkles
};

export function ModuleFlowDiagram({ flow }: { flow: ModuleFlow }) {
  return (
    <div>
      <Reveal>
        <p className="mkt-eyebrow">How people actually use it</p>
        <h2 className="mkt-display mt-3 text-3xl text-[color:var(--bs-ink)] sm:text-4xl">From role to daily work</h2>
        <p className="mkt-muted mt-4 max-w-2xl text-[15px] leading-7">{flow.promise}</p>
      </Reveal>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {flow.roles.map((item, i) => (
          <Reveal key={item.role} delay={i * 80} className="mkt-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--bs-teal)]">{item.role}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.does}</p>
          </Reveal>
        ))}
      </div>

      <ol className="mkt-flow mt-10">
        {flow.steps.map((step, i) => {
          const Icon = icons[step.icon];
          return (
            <li key={step.title} className="mkt-flow-item">
              <Reveal delay={Math.min(i * 70, 420)} className="h-full">
                <article className="mkt-flow-card">
                  <span className="mkt-flow-index">{i + 1}</span>
                  <span className="mkt-flow-icon">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--bs-teal)]">{step.role}</p>
                  <h3 className="mt-1 text-base font-semibold tracking-tight text-[color:var(--bs-ink)]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.detail}</p>
                </article>
              </Reveal>
              {i < flow.steps.length - 1 ? (
                <span className="mkt-flow-arrow" aria-hidden>
                  <ArrowRight className="mkt-flow-arrow-x size-4" />
                  <ArrowDown className="mkt-flow-arrow-y size-4" />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function RoleChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border border-[color:var(--bs-line)] bg-white px-3 py-1 text-xs font-semibold text-[color:var(--bs-ink)]", className)}>
      {children}
    </span>
  );
}

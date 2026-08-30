"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  Check,
  Layers3,
  Link2,
  Mail,
  Sparkles,
  Workflow
} from "lucide-react";
import { MktButton, MktCta } from "@/components/marketing/mkt-button";
import { Reveal } from "@/components/marketing/reveal";
import {
  BILLABLE_MODULES,
  PLATFORM_APPS,
  TOTAL_PAYABLE_APP_COUNT,
  estimateTotalAddonMonthlyCents,
  platformAppLabel,
  resolvePlatformApps,
  type BillableModule,
  type PlatformAppId
} from "@/lib/billing/module-catalog";
import { buildSignupSelection, persistSignupAppSelection, signupUrlForSelection } from "@/lib/billing/signup-apps";
import { formatMoney, getPackageByCode, listSeedPackages, type PlanTier } from "@/modules/billing/services/subscriptions.store";
import type { ModuleKey } from "@/lib/permissions";

const BASE_TIERS: { code: PlanTier; label: string }[] = [
  { code: "silver", label: "Silver" },
  { code: "gold", label: "Gold" },
  { code: "platinum", label: "Platinum" },
  { code: "professional", label: "Professional" }
];

function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
  description
}: {
  icon: typeof BriefcaseBusiness;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex gap-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--bs-cloud)] text-[color:var(--bs-teal)]">
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--bs-teal)]">{eyebrow}</p>
        <h3 className="mt-1 text-xl font-semibold tracking-tight text-[color:var(--bs-ink)]">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}

export function ModulePricingPicker() {
  const [tier, setTier] = useState<PlanTier>("gold");
  const [selected, setSelected] = useState<ModuleKey[]>(() => getPackageByCode("gold")?.modules ?? []);
  const [platformApps, setPlatformApps] = useState<PlatformAppId[]>(["email_engine", "rule_engine"]);

  const basePkg = useMemo(() => getPackageByCode(tier) ?? listSeedPackages()[0], [tier]);
  const included = basePkg?.modules ?? [];
  const resolvedPlatform = useMemo(() => resolvePlatformApps(platformApps), [platformApps]);

  const addonCents = useMemo(
    () => estimateTotalAddonMonthlyCents(selected, included, resolvedPlatform),
    [selected, included, resolvedPlatform]
  );

  const baseCents = basePkg?.monthly_price_cents ?? 0;
  const totalCents = baseCents + addonCents;
  const ruleEngineApp = PLATFORM_APPS.find((a) => a.id === "rule_engine")!;
  const emailEngineApp = PLATFORM_APPS.find((a) => a.id === "email_engine")!;

  function toggleModule(mod: BillableModule) {
    if (included.includes(mod.key)) return;
    setSelected((prev) =>
      prev.includes(mod.key) ? prev.filter((k) => k !== mod.key) : [...prev, mod.key]
    );
  }

  function togglePlatformApp(id: PlatformAppId) {
    setPlatformApps((prev) => {
      const on = prev.includes(id);
      if (on) return prev.filter((p) => p !== id);
      return resolvePlatformApps([...prev, id]);
    });
  }

  function pickTier(code: PlanTier) {
    setTier(code);
    const pkg = getPackageByCode(code);
    if (pkg) setSelected(pkg.modules);
  }

  function goSignup() {
    const selection = buildSignupSelection({ tier, extraModules: selected, platformApps: resolvedPlatform });
    persistSignupAppSelection(selection);
    window.location.href = signupUrlForSelection(selection);
  }

  const autoIncludedEmail =
    resolvedPlatform.includes("email_engine") &&
    !platformApps.includes("email_engine") &&
    platformApps.includes("rule_engine");

  const extraModuleCount = selected.filter((m) => !included.includes(m)).length;

  return (
    <section id="build-your-plan" className="border-t border-[color:var(--bs-line)] bg-[color:var(--bs-cloud)]">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="mkt-eyebrow">Pay per app</p>
          <h2 className="mkt-display mt-3 text-3xl text-[color:var(--bs-ink)] sm:text-4xl">
            License only the apps your team actually uses
          </h2>
          <p className="mkt-muted mt-4 text-[15px] leading-7">
            {TOTAL_PAYABLE_APP_COUNT} apps — business modules plus Email Engine and Rule Engine. Choose a base package,
            then tick extra apps. Each licensed app unlocks in your sidebar; role rights apply inside that app.
          </p>
        </Reveal>

        <Reveal className="mt-10">
          <div className="mkt-card mx-auto max-w-3xl p-2">
            <p className="px-3 pt-3 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Step 1 — pick your base package
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 p-2">
              {BASE_TIERS.map((t) => (
                <button
                  key={t.code}
                  type="button"
                  onClick={() => pickTier(t.code)}
                  className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                    tier === t.code
                      ? "border-[color:var(--bs-ink)] bg-[color:var(--bs-ink)] text-white shadow-sm"
                      : "border-[color:var(--bs-line)] bg-white text-slate-600 hover:border-[color:var(--bs-teal)]"
                  }`}
                >
                  {t.label}
                  <span className="ml-1.5 text-xs font-medium opacity-80">
                    from {formatMoney(getPackageByCode(t.code)?.monthly_price_cents ?? 0, "usd")}/mo
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_minmax(300px,24rem)]">
          <Reveal>
            <p className="mb-6 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 lg:text-left">
              Step 2 — add or confirm apps
            </p>

            <SectionHeader
              icon={BriefcaseBusiness}
              eyebrow="Business apps"
              title="CRM, HRM, Finance, Healthcare & more"
              description="Included apps come with your package. Toggle any extra module to add it à la carte."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {BILLABLE_MODULES.map((mod) => {
                const inBase = included.includes(mod.key);
                const on = inBase || selected.includes(mod.key);
                return (
                  <button
                    key={mod.key}
                    type="button"
                    disabled={inBase}
                    onClick={() => toggleModule(mod)}
                    className={`group mkt-card flex items-start gap-3 p-4 text-left transition hover:shadow-md ${
                      inBase
                        ? "cursor-default ring-2 ring-[color:var(--bs-teal)]/25"
                        : on
                          ? "ring-2 ring-[color:var(--bs-teal)]"
                          : "hover:ring-1 hover:ring-[color:var(--bs-line)]"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition ${
                        on ? "border-[color:var(--bs-teal)] bg-[color:var(--bs-teal)] text-white" : "border-slate-300 bg-white"
                      }`}
                    >
                      {on ? <Check className="size-3" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[color:var(--bs-ink)]">{mod.label}</span>
                        {inBase ? (
                          <span className="rounded-full bg-[color:var(--bs-teal)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--bs-teal)]">
                            In {basePkg.name}
                          </span>
                        ) : mod.addon_monthly_cents > 0 ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            +{formatMoney(mod.addon_monthly_cents, "usd")}/mo
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{mod.tagline}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-10">
              <SectionHeader
                icon={Sparkles}
                eyebrow="Platform apps"
                title="Email Engine & Rule Engine"
                description="Cross-module engines sold separately. Rule Engine requires Email Engine for send-email actions."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {PLATFORM_APPS.map((app) => {
                  const on = resolvedPlatform.includes(app.id);
                  const requiredByRule = app.id === "email_engine" && autoIncludedEmail;
                  const Icon = app.id === "email_engine" ? Mail : Workflow;
                  return (
                    <label
                      key={app.id}
                      className={`mkt-card block cursor-pointer overflow-hidden transition hover:shadow-md ${
                        on ? "ring-2 ring-[color:var(--bs-teal)]" : "hover:ring-1 hover:ring-[color:var(--bs-line)]"
                      }`}
                    >
                      <div className={`flex items-center gap-3 px-4 py-3 ${app.id === "email_engine" ? "bg-violet-50" : "bg-amber-50"}`}>
                        <span
                          className={`flex size-9 items-center justify-center rounded-xl ${
                            app.id === "email_engine" ? "bg-violet-600 text-white" : "bg-amber-600 text-white"
                          }`}
                        >
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="block font-semibold text-[color:var(--bs-ink)]">{app.label}</span>
                          <span className="block text-xs text-slate-600">{app.tagline}</span>
                        </div>
                        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[color:var(--bs-ink)] shadow-sm">
                          +{formatMoney(app.monthly_cents, "usd")}/mo
                        </span>
                      </div>
                      <div className="flex items-start gap-3 p-4">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={on && !requiredByRule}
                          disabled={requiredByRule}
                          onChange={() => togglePlatformApp(app.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <ul className="space-y-1 text-[12px] leading-5 text-slate-600">
                            {app.features.map((f) => (
                              <li key={f}>· {f}</li>
                            ))}
                          </ul>
                          {app.dependsOn.length ? (
                            <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-[color:var(--bs-teal)]">
                              <Link2 className="size-3 shrink-0" />
                              Requires {app.dependsOn.map(platformAppLabel).join(", ")}
                            </p>
                          ) : null}
                          {requiredByRule ? (
                            <p className="mt-2 text-[11px] font-semibold text-amber-800">Auto-included with Rule Engine</p>
                          ) : null}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="mkt-card sticky top-24 overflow-hidden">
              <div className="bg-[color:var(--bs-ink)] px-6 py-5 text-white">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-200">Your monthly estimate</p>
                <p className="mt-2 text-lg font-semibold">{basePkg.name} package</p>
                <p className="mt-1 text-4xl font-bold tracking-tight">
                  {formatMoney(totalCents, "usd")}
                  <span className="text-base font-semibold text-white/70">/mo</span>
                </p>
              </div>
              <div className="space-y-3 px-6 py-5 text-sm text-slate-600">
                <div className="flex justify-between gap-3 border-b border-[color:var(--bs-line)] pb-3">
                  <span>Base package</span>
                  <span className="font-semibold text-[color:var(--bs-ink)]">{formatMoney(baseCents, "usd")}/mo</span>
                </div>
                <div className="flex justify-between gap-3 border-b border-[color:var(--bs-line)] pb-3">
                  <span>Extra apps</span>
                  <span className="font-semibold text-[color:var(--bs-ink)]">{formatMoney(addonCents, "usd")}/mo</span>
                </div>
                <div className="flex items-start gap-2 text-xs leading-5">
                  <Layers3 className="mt-0.5 size-4 shrink-0 text-[color:var(--bs-teal)]" />
                  <span>
                    {included.length} apps in {basePkg.name}
                    {extraModuleCount ? ` · +${extraModuleCount} business add-on${extraModuleCount === 1 ? "" : "s"}` : ""}
                    {resolvedPlatform.length
                      ? ` · ${resolvedPlatform.map(platformAppLabel).join(" + ")}`
                      : ""}
                  </span>
                </div>
              </div>
              <div className="border-t border-[color:var(--bs-line)] px-6 py-5">
                <MktButton type="button" onClick={goSignup} className="w-full">
                  Continue with {basePkg.name}
                </MktButton>
                <MktCta href="/contact?topic=custom-plan" variant="secondary" className="mt-3 w-full">
                  Custom quote (self / intranet)
                </MktCta>
                <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                  <Link href={`/product/${emailEngineApp.productSlug}`} className="font-semibold text-[color:var(--bs-teal)]">
                    Email Engine
                  </Link>
                  {" · "}
                  <Link href={`/product/${ruleEngineApp.productSlug}`} className="font-semibold text-[color:var(--bs-teal)]">
                    Rule Engine
                  </Link>
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

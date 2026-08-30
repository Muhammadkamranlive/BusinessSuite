"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PublicSiteShell } from "@/components/layout/public-site-shell";
import { PricingCards } from "@/components/billing/subscription-checkout";
import { MktCta } from "@/components/marketing/mkt-button";
import { DeploymentOptions } from "@/components/marketing/deployment-options";
import { ModulePricingPicker } from "@/components/marketing/module-pricing-picker";
import { InfraCompare } from "@/components/marketing/infra-compare";
import { RuleEngineShowcase } from "@/components/marketing/rule-engine-showcase";
import type { BillingInterval } from "@/modules/billing/services/subscriptions.store";

function PricingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [interval, setInterval] = useState<BillingInterval>((params.get("interval") as BillingInterval) || "year");

  return (
    <PublicSiteShell>
      <section className="relative overflow-hidden">
        <div className="mkt-aurora" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center md:px-6 md:py-20">
          <p className="mkt-eyebrow">Transparent USD pricing</p>
          <h1 className="mkt-display mx-auto mt-4 max-w-3xl text-4xl sm:text-5xl">
            Base packages — plus pay per app for exactly what you need
          </h1>
          <p className="mkt-muted mx-auto mt-5 max-w-2xl text-base leading-7">
            Silver, Gold, and Platinum run on our shared SaaS cloud. Professional is dedicated — managed cloud, your
            VPS, self-hosted under license, or a fully offline intranet. Every tier supports{" "}
            <strong className="font-semibold text-[color:var(--bs-ink)]">pay per app</strong> — start with a bundle, then
            add CRM-only, HRM-only, Healthcare, Email Engine, or Rule Engine below.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <MktCta href="#pricing-packages">Compare packages</MktCta>
            <MktCta href="#build-your-plan" variant="secondary">
              Build your app list
            </MktCta>
          </div>
        </div>
      </section>
      <section id="pricing-packages" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <div className="flex justify-center">
            <div className="inline-flex rounded-full border border-[#e6ebf1] bg-[#f6f9fc] p-1">
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold ${interval === "month" ? "bg-[#0a2540] text-white" : "text-[#425466]"}`}
                onClick={() => setInterval("month")}
              >
                Monthly
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold ${interval === "year" ? "bg-[#0a2540] text-white" : "text-[#425466]"}`}
                onClick={() => setInterval("year")}
              >
                Annual
              </button>
            </div>
          </div>
          <div className="mkt-pricing mt-10">
            <PricingCards
              appearance="marketing"
              interval={interval}
              onSelect={(pkg) => router.push(`/signup?plan=${pkg.code}&interval=${interval}`)}
            />
          </div>
          <p className="mt-12 text-center text-sm text-[#425466]">
            Already subscribed?{" "}
            <Link href="/settings/billing" className="font-semibold text-[color:var(--bs-teal)] hover:underline">
              Open company billing
            </Link>
            {" · "}
            <Link href="/contact" className="font-semibold text-[color:var(--bs-teal)] hover:underline">
              Talk to sales
            </Link>
          </p>
          <div className="mt-6 flex justify-center">
            <MktCta href="/signup">Start company signup</MktCta>
          </div>
        </div>
      </section>
      <RuleEngineShowcase />
      <ModulePricingPicker />
      <InfraCompare />
      <DeploymentOptions />
    </PublicSiteShell>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading pricing…</div>}>
      <PricingInner />
    </Suspense>
  );
}

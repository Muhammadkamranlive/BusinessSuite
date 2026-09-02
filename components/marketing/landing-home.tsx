"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { PublicSiteShell } from "@/components/layout/public-site-shell";
import { PricingCards } from "@/components/billing/subscription-checkout";
import { Reveal } from "@/components/marketing/reveal";
import { MktCta } from "@/components/marketing/mkt-button";
import { LaptopFrame } from "@/components/marketing/screenshot-frame";
import { ModuleLaptopStage } from "@/components/marketing/module-laptop-stage";
import { LandingHero } from "@/components/marketing/landing-hero";
import { TrustStrip } from "@/components/marketing/trust-strip";
import { FeatureBento } from "@/components/marketing/feature-bento";
import { DeploymentOptions } from "@/components/marketing/deployment-options";
import { RuleEngineShowcase } from "@/components/marketing/rule-engine-showcase";
import { ModulePricingPicker } from "@/components/marketing/module-pricing-picker";
import { InfraCompare } from "@/components/marketing/infra-compare";
import { StatsBand } from "@/components/marketing/stats-band";
import { Testimonials } from "@/components/marketing/testimonials";
import { LandingFaq } from "@/components/marketing/landing-faq";
import { ensureProductionSiteContent, listBlogs, type BlogPost } from "@/modules/cms/services/cms.store";
import type { BillingInterval } from "@/modules/billing/services/subscriptions.store";
import { productModules } from "@/lib/product-modules";

export function LandingHome() {
  const router = useRouter();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [interval, setInterval] = useState<BillingInterval>("year");
  const shelf = [
    productModules.find((m) => m.slug === "crm"),
    productModules.find((m) => m.slug === "sales"),
    productModules.find((m) => m.slug === "finance")
  ].filter((m): m is NonNullable<typeof m> => Boolean(m));

  useEffect(() => {
    ensureProductionSiteContent();
    setBlogs(listBlogs().slice(0, 3));
  }, []);

  return (
    <PublicSiteShell>
      <LandingHero />

      <TrustStrip />

      <section id="product" className="relative px-4 pb-4 pt-10 md:px-6">
        <Reveal className="mx-auto max-w-5xl">
          <div className="mkt-device-shelf">
            {shelf.map((item) => (
              <LaptopFrame
                key={item.slug}
                src={item.image}
                alt={item.heroCaption}
                href={`/product/${item.slug}`}
                label={item.title}
              />
            ))}
          </div>
        </Reveal>
      </section>

      <section id="modules" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="mkt-eyebrow">Inside the product</p>
            <h2 className="mkt-display mt-3 text-3xl text-[color:var(--bs-ink)] sm:text-4xl">
              15 apps. Click one — the laptop shows that screen.
            </h2>
            <p className="mkt-muted mt-4 text-[15px] leading-7">
              13 business modules plus Email Engine and Rule Engine, one login. Screenshots are from the live product —
              click a module and the laptop updates to that app.
            </p>
          </Reveal>
          <div className="mt-10">
            <ModuleLaptopStage />
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {productModules.map((item, i) => (
              <Reveal key={item.slug} delay={(i % 3) * 60}>
                <Link href={`/product/${item.slug}`} className="mkt-card block h-full p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--bs-teal)]">{item.eyebrow}</p>
                  <h3 className="mt-2 text-lg font-semibold text-[color:var(--bs-ink)]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
                  <p className="mt-3 text-sm font-semibold text-[color:var(--bs-teal)]">
                    Open {item.title} <ArrowRight className="ml-1 inline size-3.5" />
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <FeatureBento />

      <RuleEngineShowcase />

      <StatsBand />

      <DeploymentOptions />

      <InfraCompare />

      <section id="pricing" className="border-t border-[color:var(--bs-line)] bg-[color:var(--bs-cloud)]">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="mkt-eyebrow">Pricing</p>
              <h2 className="mkt-display mt-4 text-3xl text-[color:var(--bs-ink)] sm:text-4xl">
                Base packages — pay per app for the rest
              </h2>
              <p className="mkt-muted mt-4 text-sm leading-6">
                Silver through Platinum run on shared SaaS. Professional is dedicated — cloud, VPS, self-hosted, or
                intranet. Every tier supports{" "}
                <Link href="#build-your-plan" className="font-semibold text-[color:var(--bs-teal)] hover:underline">
                  pay per app
                </Link>
                : pick your bundle, then add only the modules and platform engines you need.
              </p>
            </div>
            <div className="inline-flex self-start rounded-full border border-[color:var(--bs-line)] bg-white p-1">
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${interval === "month" ? "bg-[color:var(--bs-ink)] text-white shadow-sm" : "text-slate-600"}`}
                onClick={() => setInterval("month")}
              >
                Monthly
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${interval === "year" ? "bg-[color:var(--bs-ink)] text-white shadow-sm" : "text-slate-600"}`}
                onClick={() => setInterval("year")}
              >
                Annual
              </button>
            </div>
          </div>
          <div className="mkt-pricing mt-12">
            <PricingCards
              appearance="marketing"
              interval={interval}
              onSelect={(pkg) => router.push(`/signup?plan=${pkg.code}&interval=${interval}`)}
            />
          </div>
          <p className="mt-8 text-center text-sm text-slate-500">
            Need extra apps only?{" "}
            <Link href="#build-your-plan" className="font-semibold text-[color:var(--bs-teal)] hover:underline">
              Build your pay-per-app plan
            </Link>
            {" · "}
            Need self-hosted or intranet?{" "}
            <Link href="/contact" className="font-semibold text-[color:var(--bs-teal)] hover:underline">
              Talk to sales
            </Link>
          </p>
        </div>
      </section>

      <ModulePricingPicker />

      <Testimonials />

      <LandingFaq />

      {blogs.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
          <div className="mb-8 flex items-end justify-between gap-3">
            <div>
              <p className="mkt-eyebrow">Insights</p>
              <h2 className="mkt-display mt-3 text-3xl text-[color:var(--bs-ink)]">From the BusinessSuite desk</h2>
            </div>
            <Link href="/blog" className="text-sm font-semibold text-[color:var(--bs-teal)] hover:underline">
              All articles
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {blogs.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group mkt-card block p-5">
                <h3 className="text-lg font-semibold text-[color:var(--bs-ink)] transition group-hover:text-[color:var(--bs-teal)]">{post.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{post.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="px-4 pb-20 md:px-6 md:pb-28">
        <div className="mkt-band mkt-dark-band mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] px-6 py-14 sm:px-12">
          <div className="mkt-beam" aria-hidden />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="mkt-display max-w-xl text-3xl sm:text-4xl">
                Ready to run the company from one desktop?
              </h2>
              <p className="mkt-muted mt-4 max-w-lg text-sm leading-6">
                Create your company, pick a package, invite the team — live on shared SaaS in minutes. Need
                dedicated, self-hosted, or intranet? Sales will map it in one call.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <MktCta href="/signup" variant="light" className="w-full sm:w-auto">
                Get started <ArrowRight className="size-4" />
              </MktCta>
              <MktCta href="/contact" variant="ghost" className="w-full border border-white/25 text-white hover:bg-white/10 sm:w-auto">
                Talk to sales
              </MktCta>
            </div>
          </div>
        </div>
      </section>
    </PublicSiteShell>
  );
}

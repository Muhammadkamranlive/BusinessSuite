"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicSiteShell } from "@/components/layout/public-site-shell";
import { MktCta } from "@/components/marketing/mkt-button";
import { Reveal } from "@/components/marketing/reveal";
import { LaptopFrame } from "@/components/marketing/screenshot-frame";
import type { ProductModule } from "@/lib/product-modules";
import { productModules } from "@/lib/product-modules";
import { getModuleFlow } from "@/lib/product-module-flows";
import { ModuleFlowDiagram } from "@/components/marketing/module-flow-diagram";

export function ProductModulePage({ module }: { module: ProductModule }) {
          const others = productModules.filter((m) => m.slug !== module.slug);
  const flow = getModuleFlow(module.slug);

  return (
    <PublicSiteShell>
      <section className="relative">
        <div className="mkt-mesh absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <p className="text-sm text-slate-500">
            <Link href="/" className="hover:text-[color:var(--bs-teal)]">
              Home
            </Link>
            <span className="px-2">/</span>
            <Link href="/#modules" className="hover:text-[color:var(--bs-teal)]">
              Product
            </Link>
            <span className="px-2">/</span>
            <span className="text-[color:var(--bs-ink)]">{module.title}</span>
          </p>
          <Reveal className="mt-8 max-w-3xl">
            <p className="mkt-eyebrow">{module.eyebrow}</p>
            <h1 className="mkt-display mt-3 text-4xl text-[color:var(--bs-ink)] sm:text-5xl">{module.title}</h1>
            <p className="mkt-muted mt-5 text-lg leading-8">{module.summary}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <MktCta href="/signup">
                Start your company <ArrowRight className="size-4" />
              </MktCta>
              <MktCta href="/pricing" variant="secondary">
                Compare packages
              </MktCta>
            </div>
          </Reveal>
          <Reveal delay={120} className="mx-auto mt-12 max-w-4xl">
            <LaptopFrame src={module.image} alt={module.heroCaption} hero />
            <p className="mt-4 text-center text-sm text-slate-500">{module.heroCaption}</p>
          </Reveal>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:px-6 md:py-20">
          <div>
            <p className="mkt-eyebrow">What you see on this screen</p>
            <h2 className="mkt-display mt-3 text-3xl text-[color:var(--bs-ink)]">Built for the work this team already does</h2>
            <ul className="mt-8 space-y-4">
              {module.highlights.map((item) => (
                <li key={item} className="flex gap-3 text-[15px] leading-7 text-[color:color-mix(in_srgb,var(--bs-ink)_70%,#64748b)]">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[color:var(--bs-teal)]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mkt-eyebrow">Menus included</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {module.includes.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[color:var(--bs-line)] bg-[color:var(--bs-cloud)] px-3 py-1.5 text-sm font-medium text-[color:var(--bs-ink)]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {flow ? (
        <section className="border-t border-[color:var(--bs-line)] bg-[color:var(--bs-cloud)]">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
            <ModuleFlowDiagram flow={flow} />
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 md:px-6">
        <p className="mkt-eyebrow">More of the product</p>
        <h2 className="mkt-display mt-3 text-2xl text-[color:var(--bs-ink)]">Other modules from the same login</h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {others.map((item) => (
            <LaptopFrame
              key={item.slug}
              src={item.image}
              alt={item.heroCaption}
              href={`/product/${item.slug}`}
              label={item.title}
            />
          ))}
        </div>
      </section>
    </PublicSiteShell>
  );
}

"use client";

import { ArrowRight, Building2, Check, Cloud, Network, ServerCog } from "lucide-react";
import { MktCta } from "@/components/marketing/mkt-button";
import { Reveal } from "@/components/marketing/reveal";

const options = [
  {
    icon: Cloud,
    name: "Shared cloud (SaaS)",
    tag: "Included with every package",
    blurb:
      "Your company runs as an isolated tenant on our managed cloud. Sign up, pick a package, invite the team — live in minutes.",
    points: [
      "Tenant-isolated Postgres — your data never mixes",
      "Automatic updates, backups, and monitoring",
      "Company Admin controls users, roles, and billing",
      "Included with Silver, Gold, and Platinum"
    ],
    cta: { href: "/signup", label: "Start free trial" },
    featured: false
  },
  {
    icon: ServerCog,
    name: "Dedicated cloud / VPS",
    tag: "Your own stack, managed by us",
    blurb:
      "A dedicated deployment on managed cloud or a VPS of your choice — separate database, your domain, white-label branding.",
    points: [
      "Separate database and application instance",
      "Your domain + white-label product name",
      "Own backup schedule, environment, and deploy path",
      "Region of your choice for data residency"
    ],
    cta: { href: "/contact?topic=dedicated", label: "Talk to sales" },
    featured: true
  },
  {
    icon: Building2,
    name: "Self-hosted, licensed",
    tag: "Runs with your hosting company",
    blurb:
      "We deploy BusinessSuite with your own hosting provider under a proper commercial license. Your infrastructure, our software and support.",
    points: [
      "Deployed on the hosting company you already trust",
      "Commercial license with defined terms and renewals",
      "Guided installation, upgrades, and health checks",
      "Full data ownership on your infrastructure"
    ],
    cta: { href: "/contact?topic=self-hosted", label: "Talk to sales" },
    featured: false
  },
  {
    icon: Network,
    name: "Intranet / on-premise",
    tag: "Available for any package",
    blurb:
      "Fully offline deployment inside your building or private network — for plants, hospitals, and organizations that cannot depend on the internet.",
    points: [
      "Runs on your LAN with no outside connectivity required",
      "Same 15 apps — pay per app with role-based access inside each licensed app",
      "Ideal for factories, hospitals, and secure sites",
      "Offered alongside every package tier"
    ],
    cta: { href: "/contact?topic=intranet", label: "Talk to sales" },
    featured: false
  }
];

export function DeploymentOptions() {
  return (
    <section id="deployment" className="border-t border-[color:var(--bs-line)] bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="mkt-eyebrow">Deployment, your way</p>
          <h2 className="mkt-display mt-3 text-3xl text-[color:var(--bs-ink)] sm:text-4xl">
            Our cloud, your VPS, your hosting company, or no internet at all
          </h2>
          <p className="mkt-muted mt-4 text-[15px] leading-7">
            The same ERP ships four ways. Start on shared SaaS today and move to dedicated, self-hosted, or
            intranet later — your data and configuration move with you.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {options.map((opt, i) => {
            const Icon = opt.icon;
            return (
              <Reveal key={opt.name} delay={i * 80}>
                <div className={`mkt-deploy-card h-full ${opt.featured ? "is-featured" : ""}`}>
                  <span className="mkt-bento-icon">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--bs-teal)]">{opt.tag}</p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight text-[color:var(--bs-ink)]">{opt.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{opt.blurb}</p>
                  <ul className="mt-4 flex-1 space-y-2.5">
                    {opt.points.map((point) => (
                      <li key={point} className="flex gap-2 text-[13px] leading-5 text-slate-600">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-[color:var(--bs-teal)]" aria-hidden />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    <MktCta
                      href={opt.cta.href}
                      variant={opt.featured ? "primary" : "secondary"}
                      className="w-full"
                    >
                      {opt.cta.label} <ArrowRight className="size-4" />
                    </MktCta>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={150}>
          <p className="mt-8 text-center text-sm text-slate-500">
            Not sure which fits? <a href="/contact" className="font-semibold text-[color:var(--bs-teal)] hover:underline">Talk to sales</a> — we'll map your package and deployment in one call.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

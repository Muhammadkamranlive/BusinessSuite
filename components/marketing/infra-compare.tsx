"use client";

import { Building2, Database, Globe, Lock, Server, Shield } from "lucide-react";
import { MktCta } from "@/components/marketing/mkt-button";
import { Reveal } from "@/components/marketing/reveal";

const shared = [
  "One shared application and database (tenant_id isolation)",
  "Your company workspace next to other customers on the same stack",
  "Company Admin for your users, roles, extra fields, and billing",
  "Platform Super Admin stays with us — blog, CMS, other companies, package catalog",
  "Your domain is the BusinessSuite URL you sign in on"
];

const dedicated = [
  "Separate database — not a shared multi-tenant store",
  "Your domain and white-label product name",
  "Isolated code and infrastructure (own deploy path, backups, environment)",
  "Instance Super Admin for that stack — still not sold on Silver–Platinum",
  "No neighbour tenants. Data, jobs, and files do not sit beside another customer"
];

export function InfraCompare() {
  return (
    <section id="infrastructure" className="border-t border-[color:var(--bs-line)] bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="mkt-eyebrow">Packages & infrastructure</p>
          <h2 className="mkt-display mt-3 text-3xl text-[color:var(--bs-ink)] sm:text-4xl">Shared cloud, or Professional on its own rails</h2>
          <p className="mkt-muted mt-4 text-[15px] leading-7">
            Silver, Gold, and Platinum run on the multi-tenant SaaS. Professional is a dedicated facility: database, domain, and code path that are yours.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Reveal className="mkt-card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-[color:var(--bs-cloud)] text-[color:var(--bs-ink)]">
                <Building2 className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Silver · Gold · Platinum</p>
                <h3 className="text-xl font-semibold tracking-tight text-[color:var(--bs-ink)]">Shared SaaS</h3>
              </div>
            </div>
            <ul className="mt-6 space-y-3">
              {shared.map((line) => (
                <li key={line} className="flex gap-3 text-sm leading-6 text-slate-600">
                  <Lock className="mt-0.5 size-4 shrink-0 text-[color:var(--bs-teal)]" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={100} className="mkt-card mkt-card-pro p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-[color:var(--bs-ink)] text-white">
                <Server className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--bs-teal)]">Professional</p>
                <h3 className="text-xl font-semibold tracking-tight text-[color:var(--bs-ink)]">Dedicated infrastructure</h3>
              </div>
            </div>
            <ul className="mt-6 space-y-3">
              {dedicated.map((line) => (
                <li key={line} className="flex gap-3 text-sm leading-6 text-slate-600">
                  <Shield className="mt-0.5 size-4 shrink-0 text-[color:var(--bs-teal)]" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              {(
                [
                  { Icon: Database, label: "Own database" },
                  { Icon: Globe, label: "Own domain" },
                  { Icon: Server, label: "Own stack" }
                ] as const
              ).map(({ Icon, label }) => (
                <div key={label} className="rounded-xl border border-[color:var(--bs-line)] bg-white px-2 py-3">
                  <Icon className="mx-auto size-4 text-[color:var(--bs-ink)]" />
                  <p className="mt-1 text-[11px] font-semibold text-[color:var(--bs-ink)]">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <MktCta href="/signup?plan=professional&interval=year" className="w-full sm:w-auto">
                Talk Professional
              </MktCta>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

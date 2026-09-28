"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import { PublicSiteShell } from "@/components/layout/public-site-shell";
import { MktCta } from "@/components/marketing/mkt-button";
import { Reveal } from "@/components/marketing/reveal";
import { LaptopFrame } from "@/components/marketing/screenshot-frame";
import { CinematicSvg, moduleAccentSvg } from "@/components/marketing/cinematic/client-illustrations";
import { ScrollLite, ScrollLiteList } from "@/components/marketing/cinematic/scroll-lite";
import type { ProductModule } from "@/lib/product-modules";
import { getModuleFlow } from "@/lib/product-module-flows";
import { ModuleFlowDiagram } from "@/components/marketing/module-flow-diagram";
import { useLandingMedia } from "@/components/marketing/use-landing-media";
import { screenshotForModule } from "@/lib/marketing-media";

/** Real-people photography for module landings (public/marketing). */
const MODULE_PEOPLE: Record<string, { src: string; alt: string; role: string }> = {
  crm: { src: "/marketing/hero-portrait-1.png", alt: "Sales leader reviewing pipeline", role: "Sales & revenue teams" },
  sales: { src: "/marketing/office-meeting.png", alt: "Sales team closing the month", role: "Quote-to-cash desks" },
  purchases: { src: "/marketing/hero-portrait-4.png", alt: "Procurement manager at desk", role: "Buyers & warehouse" },
  inventory: { src: "/marketing/hero-portrait-4.png", alt: "Warehouse supervisor on the floor", role: "Stock & logistics" },
  operations: { src: "/marketing/hero-portrait-4.png", alt: "Plant supervisor on site", role: "Plant & quality" },
  hrm: { src: "/marketing/hero-portrait-3.png", alt: "HR director with team", role: "People & payroll" },
  healthcare: {
    src: "/marketing/hero-portrait-5.png",
    alt: "Healthcare administrator in clinical setting",
    role: "Hospitals & clinics"
  },
  pharmacy: {
    src: "/marketing/hero-portrait-5.png",
    alt: "Pharmacist at the dispensing counter",
    role: "Pharmacies & medical stores"
  },
  finance: { src: "/marketing/hero-portrait-2.png", alt: "Finance manager reviewing ledgers", role: "Controllers & CFOs" },
  documents: { src: "/marketing/hero-portrait-3.png", alt: "Compliance lead with records", role: "Records & compliance" },
  projects: { src: "/marketing/hero-team-diverse.png", alt: "Delivery team collaborating", role: "PMs & delivery" },
  reports: { src: "/marketing/hero-portrait-2.png", alt: "Executive reviewing KPIs", role: "Leadership & BI" },
  administration: {
    src: "/marketing/hero-portrait-1.png",
    alt: "Company admin configuring access",
    role: "IT & company admins"
  },
  "email-engine": {
    src: "/marketing/hero-portrait-6.png",
    alt: "Operations lead sending branded email",
    role: "Every licensed module"
  },
  "rule-engine": {
    src: "/marketing/hero-team-diverse.png",
    alt: "Ops team designing automations",
    role: "Automation owners"
  }
};

const FACE_STACK = [
  "/marketing/hero-portrait-1.png",
  "/marketing/hero-portrait-2.png",
  "/marketing/hero-portrait-3.png",
  "/marketing/hero-portrait-5.png"
];

function complianceFor(slug: string): { title: string; items: string[] } | null {
  if (slug === "healthcare") {
    return {
      title: "HIPAA-ready healthcare controls",
      items: [
        "HIPAA-aligned access controls for PHI — roles, MFA session guard, and least-privilege menus",
        "Append-only PHI audit trail with break-glass logging for emergency access",
        "Tenant-isolated Postgres; clinical data never shared across companies",
        "Encryption in transit, soft-delete recycle paths, and exportable compliance audit packs"
      ]
    };
  }
  if (slug === "hrm") {
    return {
      title: "People data handled with care",
      items: [
        "Role-based HR menus — payroll and compensation stay off the floor",
        "Tenant-isolated employee records and document assignments",
        "Audit history on sensitive payroll and loan actions"
      ]
    };
  }
  if (slug === "finance" || slug === "administration") {
    return {
      title: "Enterprise-grade tenancy",
      items: [
        "Company-isolated Postgres schemas and role rights",
        "Audit logs on admin, billing, and ledger posts",
        "Package licensing so teams only see licensed apps"
      ]
    };
  }
  return null;
}

export function ProductModulePage({ module }: { module: ProductModule }) {
  const media = useLandingMedia();
  const flow = getModuleFlow(module.slug);
  const image = screenshotForModule(module.slug, media);
  const people = MODULE_PEOPLE[module.slug] ?? {
    src: "/marketing/hero-team-diverse.png",
    alt: "Business teams using BusinessSuite",
    role: "Operating companies"
  };
  const compliance = complianceFor(module.slug);
  const isHealthcare = module.slug === "healthcare";
  const accent = moduleAccentSvg(module.slug);

  return (
    <PublicSiteShell>
      {/* ── Film trailer hero ── */}
      <section className="mkt-product-cine relative overflow-hidden">
        <div className="mkt-aurora" aria-hidden />
        <div className="mkt-grid-fade pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="mkt-product-cine-orb" aria-hidden />

        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-10 md:px-6 md:pb-14 md:pt-14">
          <p className="mkt-product-cine-enter text-sm text-slate-500" style={{ ["--cine-delay" as string]: "0ms" }}>
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

          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
            <div>
              <div
                className="mkt-product-cine-enter flex flex-wrap items-center gap-2"
                style={{ ["--cine-delay" as string]: "60ms" }}
              >
                <span className="mkt-badge-pill">
                  <span className="mkt-badge-dot">App</span>
                  {module.eyebrow}
                </span>
                {isHealthcare ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-teal">
                    <ShieldCheck className="size-3.5" aria-hidden />
                    HIPAA-ready · PHI audit
                  </span>
                ) : null}
              </div>

              <h1
                className="mkt-display mkt-product-cine-enter mt-5 text-4xl text-[color:var(--bs-ink)] sm:text-5xl lg:text-[3.15rem]"
                style={{ ["--cine-delay" as string]: "120ms" }}
              >
                {module.title}
                <span className="mt-2 block text-[1.05rem] font-medium tracking-normal text-slate-500 sm:text-lg">
                  BusinessSuite ERP · one login with the rest of your company
                </span>
              </h1>

              <p
                className="mkt-muted mkt-product-cine-enter mt-5 max-w-xl text-base leading-8 sm:text-lg"
                style={{ ["--cine-delay" as string]: "180ms" }}
              >
                {module.summary}
              </p>

              <div
                className="mkt-product-cine-enter mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
                style={{ ["--cine-delay" as string]: "240ms" }}
              >
                <MktCta href="/signup" className="w-full min-w-[11rem] sm:w-auto">
                  Create your company <ArrowRight className="size-4" />
                </MktCta>
                <MktCta href="/pricing" variant="secondary" className="w-full min-w-[11rem] sm:w-auto">
                  Compare packages
                </MktCta>
              </div>

              <div
                className="mkt-product-cine-enter mt-7 flex items-center gap-3"
                style={{ ["--cine-delay" as string]: "300ms" }}
              >
                <span className="mkt-hero-faces" aria-hidden>
                  {FACE_STACK.map((src) => (
                    <img key={src} src={src} alt="" width={40} height={40} />
                  ))}
                </span>
                <p className="text-[13px] leading-snug text-slate-500">
                  Built for {people.role.toLowerCase()} — same suite as finance, HR, and ops
                </p>
              </div>
            </div>

            <div
              className="mkt-product-hero-visual mkt-product-cine-enter"
              style={{ ["--cine-delay" as string]: "160ms" }}
            >
              <div className="mkt-product-people mkt-product-cine-ken">
                <img src={people.src} alt={people.alt} width={900} height={1100} />
                <div className="mkt-product-people-caption">
                  <Users className="size-4 text-teal" aria-hidden />
                  <span>{people.role}</span>
                </div>
              </div>
              <div className="mkt-product-shot mkt-product-cine-float">
                <LaptopFrame src={image} alt={module.heroCaption} hero />
              </div>
              <div className="mkt-product-cine-accent" aria-hidden>
                <CinematicSvg name={accent} className="h-full w-full object-contain" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Animated accent strip ── */}
      <ScrollLite className="border-y border-[color:var(--bs-line)] bg-[color:var(--bs-cloud)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 md:flex-row md:px-6">
          <div className="mkt-cine-pop h-20 w-28 shrink-0 sm:h-24 sm:w-36" style={{ ["--cine-delay" as string]: "0ms" }}>
            <CinematicSvg name={accent} className="h-full w-full object-contain" />
          </div>
          <p className="mkt-cine-pop max-w-2xl text-center text-sm leading-6 text-slate-600 md:text-left" style={{ ["--cine-delay" as string]: "80ms" }}>
            {isHealthcare
              ? "Scroll the trailer — HIPAA-ready clinical workflows play like a product film, not a static feature list."
              : "Scroll the trailer — live product moments, vector motion, and outcomes for this app in sequence."}
          </p>
        </div>
      </ScrollLite>

      {/* ── Outcomes ── */}
      <section className="border-b border-[color:var(--bs-line)] bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3 md:px-6">
          {[
            { icon: Sparkles, label: "Live screens", detail: "Real menus your team uses on day one — not a brochure mock." },
            { icon: Lock, label: "Tenant isolated", detail: "Company data stays in your Postgres tenant with role rights." },
            {
              icon: ShieldCheck,
              label: isHealthcare ? "HIPAA-ready" : "Audit ready",
              detail: isHealthcare
                ? "PHI controls, break-glass, and compliance packs for healthcare operators."
                : "Soft-delete, recycle bin, and named audit events on sensitive writes."
            }
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <ScrollLite key={item.label}>
                <div
                  className="mkt-cine-pop flex gap-3"
                  style={{ ["--cine-delay" as string]: `${i * 70}ms` }}
                >
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-teal">
                    <Icon className="size-5" strokeWidth={1.85} aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[color:var(--bs-ink)]">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{item.detail}</p>
                  </div>
                </div>
              </ScrollLite>
            );
          })}
        </div>
      </section>

      {/* ── Capabilities with scroll-lit highlights ── */}
      <section className="bg-[color:var(--bs-cloud)]">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:grid-cols-[1.1fr_0.9fr] md:px-6 md:py-20">
          <div>
            <p className="mkt-eyebrow">What operators get</p>
            <h2 className="mkt-display mt-3 text-3xl text-[color:var(--bs-ink)]">
              Built for the work this team already does
            </h2>
            <ScrollLiteList
              className="mt-8 space-y-3"
              items={module.highlights}
              renderItem={(item, active) => (
                <div
                  className={`flex gap-3 rounded-xl border px-3 py-3 text-[15px] leading-7 transition duration-500 ${
                    active
                      ? "border-teal/35 bg-white text-slate-700 shadow-[0_8px_24px_rgba(15,36,82,0.06)]"
                      : "border-transparent bg-transparent text-slate-400"
                  }`}
                >
                  <CheckCircle2
                    className={`mt-1 size-5 shrink-0 transition ${active ? "text-teal" : "text-slate-300"}`}
                    aria-hidden
                  />
                  {item}
                </div>
              )}
            />
          </div>
          <ScrollLite>
            <p className="mkt-eyebrow">Menus included</p>
            <h2 className="mkt-display mt-3 text-2xl text-[color:var(--bs-ink)]">Inside this app</h2>
            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {module.includes.map((item, i) => (
                <div
                  key={item}
                  className="mkt-cine-pop rounded-xl border border-[color:var(--bs-line)] bg-white px-3.5 py-2.5 text-sm font-medium text-[color:var(--bs-ink)] shadow-[0_1px_2px_rgba(15,36,82,0.04)]"
                  style={{ ["--cine-delay" as string]: `${Math.min(i, 8) * 40}ms` }}
                >
                  {item}
                </div>
              ))}
            </div>
          </ScrollLite>
        </div>
      </section>

      {flow ? (
        <section className="border-t border-[color:var(--bs-line)] bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
            <ModuleFlowDiagram flow={flow} />
          </div>
        </section>
      ) : null}

      {compliance ? (
        <section className="border-t border-[color:var(--bs-line)] bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
            <ScrollLite className="mkt-product-compliance">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-xl">
                  {isHealthcare ? (
                    <div className="mkt-cine-pop mb-4 h-24 w-28" style={{ ["--cine-delay" as string]: "0ms" }}>
                      <CinematicSvg name="hipaa-shield" className="h-full w-full object-contain" />
                    </div>
                  ) : null}
                  <p className="mkt-eyebrow">Trust & compliance</p>
                  <h2 className="mkt-display mt-3 text-3xl text-[color:var(--bs-ink)]">{compliance.title}</h2>
                  {isHealthcare ? (
                    <p className="mkt-muted mt-4 text-[15px] leading-7">
                      BusinessSuite Healthcare is designed for HIPAA-aligned operations: protect electronic PHI,
                      control who can see clinical records, and prove who accessed what — without a second clinical
                      system.
                    </p>
                  ) : null}
                </div>
                <ul className="grid max-w-xl flex-1 gap-3">
                  {compliance.items.map((item, i) => (
                    <li
                      key={item}
                      className="mkt-cine-pop flex gap-3 rounded-xl border border-[color:var(--bs-line)] bg-[color:var(--bs-cloud)] px-4 py-3 text-sm leading-6 text-slate-700"
                      style={{ ["--cine-delay" as string]: `${i * 70}ms` }}
                    >
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollLite>
          </div>
        </section>
      ) : null}

      {/* ── Closing CTA with parallax people ── */}
      <section className="mkt-product-cine-cta relative overflow-hidden border-t border-[color:var(--bs-line)]">
        <div className="absolute inset-0">
          <img
            src="/marketing/hero-team-diverse.png"
            alt=""
            className="mkt-product-cine-cta-photo h-full w-full object-cover object-[center_30%] opacity-[0.22]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/80" />
        </div>
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 md:flex-row md:items-center md:justify-between md:px-6 md:py-20">
          <Reveal className="max-w-xl">
            <p className="mkt-eyebrow">Ready when your team is</p>
            <h2 className="mkt-display mt-3 text-3xl text-[color:var(--bs-ink)] sm:text-4xl">
              Put {module.title} in production with the rest of your ERP
            </h2>
            <p className="mkt-muted mt-4 text-[15px] leading-7">
              Create a company, pick a package, and license only the apps you need. One login — CRM through
              finance{isHealthcare ? ", with HIPAA-ready healthcare controls" : ""}.
            </p>
          </Reveal>
          <Reveal delay={80} className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <MktCta href="/signup" className="mkt-product-cine-cta-btn">
              Create your company <ArrowRight className="size-4" />
            </MktCta>
            <MktCta href="/contact" variant="secondary" className="mkt-product-cine-cta-btn">
              Talk to sales
            </MktCta>
          </Reveal>
        </div>
      </section>
    </PublicSiteShell>
  );
}

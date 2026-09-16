"use client";

import {
  ArrowRight,
  Cloud,
  Play,
  ServerCog,
  ShieldCheck
} from "lucide-react";
import { MktCta } from "@/components/marketing/mkt-button";
import { Reveal } from "@/components/marketing/reveal";
import { StatCounter } from "@/components/marketing/stat-counter";
import { useLandingMedia } from "@/components/marketing/use-landing-media";
import { mediaUrl } from "@/lib/marketing-media";

const heroStats = [
  { value: 13, suffix: "", label: "Business apps" },
  { value: 2, suffix: "", label: "Platform engines" },
  { value: 180, suffix: "+", label: "Screens & registers" },
  { value: 4, suffix: "", label: "Deployment models" }
];

const heroFaces = [
  { src: "/marketing/hero-portrait-1.png", alt: "Operations leader" },
  { src: "/marketing/hero-portrait-2.png", alt: "Finance manager" },
  { src: "/marketing/hero-portrait-3.png", alt: "HR director" },
  { src: "/marketing/hero-portrait-4.png", alt: "Plant supervisor" },
  { src: "/marketing/hero-portrait-5.png", alt: "Healthcare admin" }
];

export function LandingHero() {
  const media = useLandingMedia();
  return (
    <section className="relative overflow-x-clip">
      <div className="mkt-aurora" aria-hidden />
      <div className="mkt-grid-fade pointer-events-none absolute inset-0 opacity-70" aria-hidden />

      <div className="relative mx-auto w-full max-w-[90rem] px-4 pt-14 md:px-6 md:pt-20 lg:px-8 lg:pt-24">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(17rem,0.7fr)_minmax(0,1.3fr)] lg:gap-10 xl:gap-12">
          <Reveal className="relative z-10">
            <span className="mkt-badge-pill">
              <span className="mkt-badge-dot">New</span>
              Cloud, VPS, self-hosted & intranet deployments
            </span>

            <h1 className="mkt-display mt-6 text-[2.5rem] text-[color:var(--bs-ink)] sm:text-5xl lg:text-[3.25rem]">
              One ERP that runs the <span className="mkt-gradient-text">entire company</span> — anywhere you want it hosted.
            </h1>

            <p className="mkt-muted mt-6 max-w-xl text-base leading-7 sm:text-lg">
              CRM, sales, procurement, inventory, plant operations, HRM &amp; payroll, hospital HMS, projects,
              documents, finance, and BI — 13 business apps behind one login, plus Email Engine and Rule Engine.
              Pay only for the apps you license.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <MktCta href="/signup" className="w-full min-w-[11.5rem] sm:w-auto">
                Start your company <ArrowRight className="size-4" />
              </MktCta>
              <MktCta href="/#modules" variant="secondary" className="w-full min-w-[11.5rem] sm:w-auto">
                <Play className="size-4" /> Tour the modules
              </MktCta>
            </div>

            <div className="mt-7 flex items-center gap-3">
              <span className="mkt-hero-faces" aria-hidden>
                {heroFaces.map((face) => (
                  <img key={face.src} src={face.src} alt="" width={40} height={40} />
                ))}
              </span>
              <p className="text-[13px] leading-snug text-slate-500">
                Trusted by teams in trading, healthcare, textile &amp; auto parts
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-[color:var(--bs-teal)]" aria-hidden /> Tenant-isolated Postgres
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Cloud className="size-4 text-[color:var(--bs-teal)]" aria-hidden /> Shared SaaS or dedicated
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ServerCog className="size-4 text-[color:var(--bs-teal)]" aria-hidden /> Licensed self-hosting
              </span>
            </div>
          </Reveal>

          <Reveal delay={120} className="relative min-w-0">
            <div className="mkt-hero-scene">
              <div className="mkt-hero-scene-glow" aria-hidden />
              <div className="mkt-hero-shot">
                <img
                  src={mediaUrl("hero.dashboard", media)}
                  alt="BusinessSuite executive dashboard — live operational mix, CRM funnel, and company KPIs"
                />
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={200}>
          <div className="mkt-hero-stats mx-auto mb-16 mt-12 max-w-4xl md:mb-20">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-[color:var(--bs-line)] bg-white/85 px-3 py-3 text-center backdrop-blur"
              >
                <p className="mkt-stat-value text-2xl font-semibold text-[color:var(--bs-ink)]">
                  <StatCounter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

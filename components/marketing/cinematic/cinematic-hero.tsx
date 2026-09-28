"use client";

import { ArrowRight, ChevronDown, Cloud, Play, ServerCog, ShieldCheck } from "lucide-react";
import { MktCta } from "@/components/marketing/mkt-button";
import { StatCounter } from "@/components/marketing/stat-counter";
import { OrbitRings } from "@/components/marketing/cinematic/client-illustrations";
import { KineticHeadline, RotatingPhrase } from "@/components/marketing/cinematic/kinetic-text";
import { LiveOpsDeck } from "@/components/marketing/cinematic/live-ops-deck";
import { ParticleField } from "@/components/marketing/cinematic/particle-field";
import { productModules } from "@/lib/product-modules";
import { BUSINESS_APP_COUNT, PLATFORM_APP_COUNT, TOTAL_PAYABLE_APP_COUNT } from "@/lib/billing/module-catalog";

const VERBS = [
  "posting invoices",
  "running payroll",
  "admitting patients",
  "picking stock FEFO",
  "closing the books",
  "winning pipeline"
];

const STATS = [
  { value: BUSINESS_APP_COUNT, suffix: "", label: "Business apps" },
  { value: PLATFORM_APP_COUNT, suffix: "", label: "Platform engines" },
  { value: 180, suffix: "+", label: "Screens & registers" },
  { value: 4, suffix: "", label: "Deployment models" }
];

const FACES = [
  "/marketing/hero-portrait-1.png",
  "/marketing/hero-portrait-2.png",
  "/marketing/hero-portrait-3.png",
  "/marketing/hero-portrait-4.png",
  "/marketing/hero-portrait-5.png"
];

/** Opening title sequence — dark stage, constellation, kinetic type, live console. */
export function CinematicHero() {
  const ticker = [...productModules, ...productModules];
  return (
    <section className="mkt-x-hero" aria-label="BusinessSuite ERP">
      <ParticleField className="mkt-x-hero-particles" />
      <div className="mkt-x-hero-aurora" aria-hidden />
      <div className="mkt-x-hero-grid" aria-hidden />
      <div className="mkt-x-hero-beam" aria-hidden />

      <div className="relative z-10 mx-auto w-full max-w-[90rem] px-4 pt-20 md:px-6 md:pt-24 lg:px-8 lg:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-8 xl:gap-14">
          <div className="relative min-w-0">
            <span className="mkt-x-pill mkt-x-enter" style={{ animationDelay: "60ms" }}>
              <span className="mkt-x-live-dot" aria-hidden />
              Live product · {TOTAL_PAYABLE_APP_COUNT} apps · one login
            </span>

            <KineticHeadline
              text="The ERP that runs the entire company like a live broadcast."
              accent={["entire", "company", "live", "broadcast"]}
              className="mkt-display mt-7 text-[2.65rem] leading-[1.02] text-white sm:text-5xl lg:text-[3.7rem] xl:text-[4.1rem]"
              delay={180}
            />

            <p className="mkt-x-enter mt-7 max-w-xl text-base leading-7 text-white/70 sm:text-lg" style={{ animationDelay: "720ms" }}>
              Right now BusinessSuite is{" "}
              <RotatingPhrase phrases={VERBS} className="font-semibold text-white" />
              {" "}for trading, textile, auto-parts, and hospital teams — CRM to Finance, HRM to HIPAA-ready
              HMS, on shared SaaS or your own servers.
            </p>

            <div className="mkt-x-enter mt-9 flex flex-col gap-3 sm:flex-row sm:items-center" style={{ animationDelay: "880ms" }}>
              <MktCta href="/signup" className="mkt-x-cta-glow w-full min-w-[12rem] sm:w-auto">
                Create your company <ArrowRight className="size-4" />
              </MktCta>
              <MktCta href="#erp-film" variant="ghost" className="w-full min-w-[12rem] border border-white/20 text-white hover:bg-white/10 sm:w-auto">
                <Play className="size-4" /> Watch the ERP unfold
              </MktCta>
            </div>

            <div className="mkt-x-enter mt-8 flex items-center gap-3" style={{ animationDelay: "1000ms" }}>
              <span className="mkt-x-faces" aria-hidden>
                {FACES.map((src) => (
                  <img key={src} src={src} alt="" width={36} height={36} loading="eager" />
                ))}
              </span>
              <p className="text-[13px] leading-snug text-white/55">
                Built with operators in distribution, healthcare, textile &amp; auto parts
              </p>
            </div>

            <div className="mkt-x-enter mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-white/55" style={{ animationDelay: "1100ms" }}>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-teal" aria-hidden /> HIPAA-ready HMS · PHI audit
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Cloud className="size-4 text-teal" aria-hidden /> Shared SaaS or dedicated
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ServerCog className="size-4 text-teal" aria-hidden /> Self-hosted &amp; intranet
              </span>
            </div>
          </div>

          <div className="relative min-w-0">
            <OrbitRings className="mkt-x-hero-orbit" />
            <div className="mkt-x-hero-art mkt-x-enter" style={{ animationDelay: "420ms" }} aria-hidden>
              <img src="/marketing/cinematic/erp-commercial-hero.png" alt="" className="mkt-cine-ken" loading="eager" />
            </div>
            <div className="mkt-x-enter" style={{ animationDelay: "560ms" }}>
              <LiveOpsDeck />
            </div>
            <img
              src="/marketing/cinematic/hipaa-shield.svg"
              alt=""
              aria-hidden
              className="mkt-x-hero-shield mkt-x-float"
              style={{ animationDelay: "-3s" }}
            />
          </div>
        </div>

        <div className="mkt-x-enter mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4" style={{ animationDelay: "1200ms" }}>
          {STATS.map((s) => (
            <div key={s.label} className="mkt-x-stat">
              <p className="text-2xl font-semibold tabular-nums text-white sm:text-3xl">
                <StatCounter value={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mkt-x-ticker mt-12" aria-hidden>
          <div className="mkt-x-ticker-track">
            {ticker.map((m, i) => (
              <span key={`${m.slug}-${i}`} className="mkt-x-ticker-item">
                <i />
                {m.title}
              </span>
            ))}
          </div>
        </div>

        <a href="#erp-film" className="mkt-x-scrollcue" aria-label="Scroll to the product film">
          <span>Scroll</span>
          <ChevronDown className="size-4" aria-hidden />
        </a>
      </div>
    </section>
  );
}

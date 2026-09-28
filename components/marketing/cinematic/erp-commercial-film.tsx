"use client";

import Link from "next/link";
import { useMemo, useRef } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { CinematicSvg } from "@/components/marketing/cinematic/client-illustrations";
import {
  clamp01,
  usePrefersReducedMotion,
  useScrollProgress
} from "@/components/marketing/cinematic/motion-hooks";
import { useLandingMedia } from "@/components/marketing/use-landing-media";
import { screenshotForModule } from "@/lib/marketing-media";

type Beat = {
  slug: string;
  label: string;
  outcome: string;
  detail: string;
  svg: "orbit-apps" | "data-flow" | "hipaa-shield" | "warehouse-flow" | "payroll-pulse";
  art?: "hero" | "orbit" | "flow";
  hipaa?: boolean;
};

const BEATS: Beat[] = [
  {
    slug: "crm",
    label: "01 · CRM",
    outcome: "Capture the lead before it cools.",
    detail: "Pipeline, activities, and follow-ups on one desk — no side spreadsheet.",
    svg: "data-flow",
    art: "flow"
  },
  {
    slug: "sales",
    label: "02 · Sales",
    outcome: "Quote to cash without leaving the suite.",
    detail: "Quotations, orders, invoices, and receipts with credit hold that actually bites.",
    svg: "data-flow"
  },
  {
    slug: "inventory",
    label: "03 · Inventory",
    outcome: "Stock that matches the warehouse floor.",
    detail: "Batches, bins, FEFO picks, and low-stock alerts that can raise a requisition.",
    svg: "warehouse-flow",
    art: "orbit"
  },
  {
    slug: "hrm",
    label: "04 · HRM",
    outcome: "People, attendance, and payroll in sync.",
    detail: "Shifts, leave, loans, and finalize that posts straight to the books.",
    svg: "payroll-pulse"
  },
  {
    slug: "healthcare",
    label: "05 · Healthcare",
    outcome: "HIPAA-ready hospital workflows.",
    detail: "Patients, wards, pharmacy, lab, and EMR — PHI audit and break-glass built in.",
    svg: "hipaa-shield",
    hipaa: true,
    art: "hero"
  },
  {
    slug: "finance",
    label: "06 · Finance & BI",
    outcome: "One set of numbers for leadership.",
    detail: "Ledgers, P&L, cash flow, and executive KPIs from the same live company data.",
    svg: "orbit-apps",
    art: "flow"
  }
];

function artSrc(beat: Beat, shot: string) {
  if (beat.art === "hero") return "/marketing/cinematic/erp-commercial-hero.png";
  if (beat.art === "orbit") return "/marketing/cinematic/erp-orbit-modules.png";
  if (beat.art === "flow") return "/marketing/cinematic/erp-flow-commercial.png";
  return shot;
}

/**
 * Sticky scroll “ERP commercial” — CRM → Sales → Inventory → HRM → Healthcare → Finance.
 * Progress is scrubbed from scroll; reduced-motion shows a static stacked reel.
 */
export function ErpCommercialFilm() {
  const media = useLandingMedia();
  const stageRef = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const progress = useScrollProgress(stageRef, !reduced);

  const active = useMemo(() => {
    if (reduced) return 0;
    const idx = Math.min(BEATS.length - 1, Math.floor(progress * BEATS.length));
    return Number.isFinite(idx) ? idx : 0;
  }, [progress, reduced]);

  const meter = reduced ? 1 : clamp01((progress * BEATS.length) % 1 || (active === BEATS.length - 1 ? 1 : 0));

  if (reduced) {
    return (
      <section id="erp-film" className="mkt-cine-section border-y border-[color:var(--bs-line)] bg-[color:var(--bs-cloud)]">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <p className="mkt-eyebrow">Product film</p>
          <h2 className="mkt-display mt-3 text-3xl text-[color:var(--bs-ink)]">The whole ERP in one scroll</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BEATS.map((beat) => (
              <Link
                key={beat.slug}
                href={`/product/${beat.slug}`}
                className="rounded-2xl border border-[color:var(--bs-line)] bg-white p-5 shadow-[0_1px_2px_rgba(15,36,82,0.04)]"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal">{beat.label}</p>
                <p className="mt-2 text-lg font-semibold text-[color:var(--bs-ink)]">{beat.outcome}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{beat.detail}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="erp-film"
      ref={stageRef}
      className="mkt-cine-section relative"
      style={{ height: `${BEATS.length * 100}vh` }}
      aria-label="BusinessSuite ERP product film"
    >
      <div className="mkt-cine-sticky bg-[color:color-mix(in_srgb,var(--bs-ink)_94%,#04101c)] text-white">
        <div className="mkt-cine-backdrop" aria-hidden />
        <div className="mkt-cine-grain" aria-hidden />

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-8 md:px-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal/90">Scroll the commercial</p>
              <h2 className="mkt-display mt-2 text-2xl text-white sm:text-3xl md:text-4xl">
                Watch the ERP unfold
              </h2>
            </div>
            <p className="text-xs font-semibold tabular-nums text-white/55">
              {String(active + 1).padStart(2, "0")} / {String(BEATS.length).padStart(2, "0")}
            </p>
          </div>

          <div className="relative min-h-[min(70vh,36rem)]">
            {BEATS.map((beat, i) => {
              const shot = screenshotForModule(beat.slug, media);
              const src = artSrc(beat, shot);
              const state = i === active ? "active" : i < active ? "past" : "future";
              return (
                <div
                  key={beat.slug}
                  className="mkt-cine-slide absolute inset-0 grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]"
                  data-cine-state={state}
                  data-cine-play={state === "active" ? "on" : "off"}
                >
                  <div className="relative z-10 max-w-xl">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal">{beat.label}</p>
                    {beat.hipaa ? (
                      <span className="mkt-cine-hipaa mt-3 inline-flex items-center gap-1.5 rounded-full border border-teal/40 bg-teal/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-teal">
                        <ShieldCheck className="size-3.5" aria-hidden />
                        HIPAA-ready · PHI audit
                      </span>
                    ) : null}
                    <h3 className="mkt-display mt-4 text-3xl text-white sm:text-4xl md:text-[2.75rem]">{beat.outcome}</h3>
                    <p className="mt-4 text-base leading-7 text-white/70">{beat.detail}</p>
                    <Link
                      href={`/product/${beat.slug}`}
                      className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-teal hover:text-white"
                    >
                      Open {beat.slug === "healthcare" ? "Healthcare" : beat.label.split("·")[1]?.trim() || beat.slug}
                      <ArrowRight className="size-4" />
                    </Link>
                    <div className="mkt-cine-meter mkt-cine-meter-scrub mt-8 h-1 overflow-hidden rounded-full bg-white/10">
                      <i
                        className="block h-full rounded-full bg-gradient-to-r from-teal to-[color:color-mix(in_srgb,var(--bs-coral)_55%,var(--bs-teal))]"
                        style={{
                          width:
                            state === "active"
                              ? `${Math.round(Math.max(0.08, meter) * 100)}%`
                              : state === "past"
                                ? "100%"
                                : "8%",
                          animation: "none"
                        }}
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <div className="mkt-cine-frame">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt=""
                        className="mkt-cine-art mkt-cine-ken aspect-[16/10] w-full object-cover object-top"
                        loading={i === 0 ? "eager" : "lazy"}
                      />
                      <div className="mkt-cine-frame-veil" aria-hidden />
                      <div className="mkt-cine-scan" aria-hidden />
                    </div>
                    <div className="pointer-events-none absolute -bottom-3 -left-2 h-20 w-24 sm:-left-4 sm:h-24 sm:w-28">
                      <CinematicSvg name={beat.svg} className="h-full w-full object-contain drop-shadow-lg" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {BEATS.map((beat, i) => (
              <span
                key={beat.slug}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] transition ${
                  i === active ? "bg-teal text-[color:var(--bs-ink)]" : "bg-white/10 text-white/50"
                }`}
              >
                {beat.slug}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

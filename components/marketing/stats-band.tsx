"use client";

import { Reveal } from "@/components/marketing/reveal";
import { StatCounter } from "@/components/marketing/stat-counter";

const stats = [
  { value: 15, suffix: "", label: "Pay-per apps", note: "13 business + 2 platform" },
  { value: 180, suffix: "+", label: "Screens & registers", note: "All searchable via ⌘K" },
  { value: 57, suffix: "", label: "Master catalogs", note: "Banks to lab tests" },
  { value: 4, suffix: "", label: "Deployment models", note: "Cloud · VPS · self-hosted · intranet" }
];

export function StatsBand() {
  return (
    <section className="mkt-dark-band">
      <div className="mkt-beam" aria-hidden />
      <div className="mkt-grid-fade pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--bs-teal)]">By the numbers</p>
          <h2 className="mkt-display mt-3 text-3xl text-white sm:text-4xl">
            The depth of a suite, the polish of a product
          </h2>
        </Reveal>
        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 80}>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-6 text-center backdrop-blur">
                <p className="mkt-stat-value text-4xl font-semibold text-white sm:text-5xl">
                  <StatCounter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-2 text-sm font-semibold text-white/90">{stat.label}</p>
                <p className="mt-1 text-xs text-white/55">{stat.note}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

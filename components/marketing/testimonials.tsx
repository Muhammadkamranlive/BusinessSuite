"use client";

import { Star } from "lucide-react";
import { erpScreenshots } from "@/lib/marketing-media";
import { Reveal } from "@/components/marketing/reveal";

const quotes = [
  {
    quote:
      "We replaced five disconnected tools with one login. The three-way match alone caught vendor billing errors we'd been eating for years.",
    name: "Operations Director",
    company: "Wholesale distribution, UAE"
  },
  {
    quote:
      "Pharmacy batches, expiries, and the OPD desk in the same system as our accounts. Our auditors finally stopped asking for spreadsheets.",
    name: "Managing Partner",
    company: "Pharmacy supply, Pakistan"
  },
  {
    quote:
      "Credit hold stopped a six-figure exposure the first month. Sales didn't love it — finance did.",
    name: "CFO",
    company: "Auto parts trading, KSA"
  },
  {
    quote:
      "We run it on our own intranet at the mill. No internet on the floor, and payroll still posts to GL on time.",
    name: "Plant Manager",
    company: "Textile manufacturing, Pakistan"
  },
  {
    quote:
      "Role-based menus mean my storekeeper sees stock and nothing else. Setup took an afternoon, not a consulting engagement.",
    name: "General Manager",
    company: "Multi-warehouse retail"
  },
  {
    quote:
      "The recycle bin and audit log saved us in a dispute. Every change had a name and a timestamp attached.",
    name: "Head of Compliance",
    company: "Healthcare network"
  }
];

export function Testimonials() {
  const loop = [...quotes, ...quotes];
  return (
    <section className="border-t border-[color:var(--bs-line)] bg-[color:var(--bs-cloud)] py-16 md:py-24">
      <Reveal className="mx-auto grid max-w-6xl items-center gap-8 px-4 md:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div>
          <p className="mkt-eyebrow">What operators say</p>
          <h2 className="mkt-display mt-3 text-3xl text-[color:var(--bs-ink)] sm:text-4xl">
            Run by people who run companies
          </h2>
          <p className="mkt-muted mt-4 max-w-lg text-base leading-7">
            Distributors, manufacturers, clinics, and trading houses run their day on BusinessSuite —
            from the warehouse floor to the boardroom. Here is what their operators tell us.
          </p>
        </div>
        <div className="mkt-testimonial-photo">
          <img
            src={erpScreenshots.administration}
            alt="BusinessSuite administration — company dashboard, users, and access control"
            width={1200}
            height={900}
          />
        </div>
      </Reveal>

      <div className="mkt-marquee mkt-marquee-slow mt-12">
        <div className="mkt-marquee-track px-4">
          {loop.map((q, i) => (
            <figure key={`${q.name}-${i}`} className="mkt-quote-card">
              <div className="flex gap-0.5 text-amber-400" aria-hidden>
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="size-3.5 fill-current" />
                ))}
              </div>
              <blockquote className="mt-3 text-[15px] leading-6 text-[color:var(--bs-ink)]">
                &ldquo;{q.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-4">
                <p className="text-sm font-semibold text-[color:var(--bs-ink)]">{q.name}</p>
                <p className="text-xs text-slate-500">{q.company}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

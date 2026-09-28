"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { ScrollLite } from "@/components/marketing/cinematic/scroll-lite";
import { useInView, usePrefersReducedMotion } from "@/components/marketing/cinematic/motion-hooks";
import { TOTAL_PAYABLE_APP_COUNT } from "@/lib/billing/module-catalog";

type NodeDef = { id: string; label: string; x: number; y: number; tone?: "coral" };

const CENTER = { x: 400, y: 230 };
const NODES: NodeDef[] = [
  { id: "crm", label: "CRM", x: 90, y: 90 },
  { id: "sales", label: "Sales", x: 400, y: 40 },
  { id: "inventory", label: "Inventory", x: 710, y: 90 },
  { id: "hrm", label: "HRM · Payroll", x: 90, y: 380 },
  { id: "healthcare", label: "Healthcare · HMS", x: 400, y: 430, tone: "coral" },
  { id: "finance", label: "Finance & BI", x: 710, y: 380 }
];

const EVENTS = [
  ["Lead won", "CRM → Sales"],
  ["Invoice posted", "Sales → Finance"],
  ["Stock picked", "Inventory → Sales"],
  ["Payroll journal", "HRM → Finance"],
  ["Pharmacy issue", "HMS → Inventory"],
  ["P&L refreshed", "Finance → BI"]
];

function pathTo(n: NodeDef) {
  const mx = (n.x + CENTER.x) / 2;
  const my = (n.y + CENTER.y) / 2;
  const bend = (n.y < CENTER.y ? -1 : 1) * 38;
  return `M ${n.x} ${n.y} Q ${mx} ${my + bend} ${CENTER.x} ${CENTER.y}`;
}

/** Every department wired into one core — pulses travel the paths, live. */
export function DataFlowStage() {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const inView = useInView(ref, "0px");
  const animate = inView && !reduced;

  return (
    <section ref={ref} className="mkt-x-flow" aria-labelledby="flow-title">
      <div className="mkt-x-flow-bg" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <ScrollLite className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="mkt-eyebrow">One nervous system</p>
            <h2 id="flow-title" className="mkt-display mt-4 text-3xl text-white sm:text-4xl md:text-5xl">
              Every department posts into the <span className="mkt-x-grad">same live core</span>.
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-white/65">
              A won deal becomes an order, the order picks stock, the pick posts an invoice, payroll lands in the
              same ledger — and the hospital wing runs on the same tenant with PHI audit on every read.
            </p>
            <ul className="mt-8 grid gap-2.5">
              {EVENTS.map(([a, b], i) => (
                <li
                  key={a}
                  className="mkt-cine-pop flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm"
                  style={{ animationDelay: `${200 + i * 140}ms` }}
                >
                  <span className="inline-flex items-center gap-2 font-medium text-white">
                    <span className="mkt-x-live-dot" aria-hidden /> {a}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">{b}</span>
                </li>
              ))}
            </ul>
            <Link href="/product/reports" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-teal hover:text-white">
              See the reporting layer <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="mkt-x-flow-frame">
            <svg viewBox="0 0 800 470" className="h-auto w-full" role="img" aria-label="Modules connected to a shared BusinessSuite core">
              <defs>
                <radialGradient id="mkt-x-core" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--bs-teal)" stopOpacity="0.95" />
                  <stop offset="60%" stopColor="var(--bs-teal)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--bs-teal)" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="mkt-x-link" x1="0" x2="1">
                  <stop offset="0" stopColor="var(--bs-teal)" stopOpacity="0.15" />
                  <stop offset="1" stopColor="var(--bs-teal)" stopOpacity="0.9" />
                </linearGradient>
                <filter id="mkt-x-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <circle cx={CENTER.x} cy={CENTER.y} r="120" fill="url(#mkt-x-core)" className="mkt-x-flow-corehalo" />
              <circle cx={CENTER.x} cy={CENTER.y} r="64" fill="none" stroke="var(--bs-teal)" strokeOpacity="0.35" strokeDasharray="4 8" className="mkt-cine-spin" style={{ transformOrigin: `${CENTER.x}px ${CENTER.y}px` }} />
              <circle cx={CENTER.x} cy={CENTER.y} r="86" fill="none" stroke="white" strokeOpacity="0.12" strokeDasharray="2 14" className="mkt-cine-spin-rev" style={{ transformOrigin: `${CENTER.x}px ${CENTER.y}px` }} />

              {NODES.map((n, i) => (
                <g key={n.id}>
                  <path
                    id={`mkt-x-p-${n.id}`}
                    d={pathTo(n)}
                    fill="none"
                    stroke="url(#mkt-x-link)"
                    strokeWidth="1.5"
                    className="mkt-cine-draw"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                  <path d={pathTo(n)} fill="none" stroke="white" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="3 12" className="mkt-cine-flow" />
                  {animate ? (
                    <>
                      <circle r="4" fill="var(--bs-teal)" filter="url(#mkt-x-glow)">
                        <animateMotion dur={`${3.2 + i * 0.35}s`} repeatCount="indefinite" begin={`${i * 0.5}s`} rotate="auto">
                          <mpath href={`#mkt-x-p-${n.id}`} />
                        </animateMotion>
                      </circle>
                      <circle r="3" fill={n.tone === "coral" ? "var(--bs-coral)" : "white"} opacity="0.9">
                        <animateMotion dur={`${4.1 + i * 0.3}s`} repeatCount="indefinite" begin={`${1.6 + i * 0.4}s`} keyPoints="1;0" keyTimes="0;1" calcMode="linear">
                          <mpath href={`#mkt-x-p-${n.id}`} />
                        </animateMotion>
                      </circle>
                    </>
                  ) : null}
                </g>
              ))}

              <g className="mkt-cine-pop" style={{ animationDelay: "400ms" }}>
                <circle cx={CENTER.x} cy={CENTER.y} r="44" fill="#0b1f3a" stroke="var(--bs-teal)" strokeWidth="1.5" />
                <circle cx={CENTER.x} cy={CENTER.y} r="44" fill="none" stroke="var(--bs-teal)" strokeOpacity="0.5" className="mkt-cine-ping" />
                <text x={CENTER.x} y={CENTER.y - 4} textAnchor="middle" fill="white" fontSize="13" fontWeight="700" letterSpacing="0.08em">
                  BUSINESS
                </text>
                <text x={CENTER.x} y={CENTER.y + 13} textAnchor="middle" fill="var(--bs-teal)" fontSize="13" fontWeight="700" letterSpacing="0.08em">
                  SUITE
                </text>
              </g>

              {NODES.map((n, i) => (
                <g key={`n-${n.id}`} className="mkt-cine-pop" style={{ animationDelay: `${300 + i * 110}ms` }}>
                  <rect x={n.x - 74} y={n.y - 20} width="148" height="40" rx="12" fill="#0b1f3a" stroke={n.tone === "coral" ? "var(--bs-coral)" : "white"} strokeOpacity={n.tone === "coral" ? 0.7 : 0.18} />
                  <circle cx={n.x - 58} cy={n.y} r="4" fill={n.tone === "coral" ? "var(--bs-coral)" : "var(--bs-teal)"} className="mkt-cine-blink" style={{ animationDelay: `${i * 0.4}s` }} />
                  <text x={n.x - 46} y={n.y + 4.5} fill="white" fontSize="13" fontWeight="600">
                    {n.label}
                  </text>
                </g>
              ))}
            </svg>
            <div className="mkt-x-flow-caption">
              <span className="mkt-x-live-dot" aria-hidden /> Live tenant · 1 Postgres · {TOTAL_PAYABLE_APP_COUNT} apps · every post audited
            </div>
          </div>
        </ScrollLite>
      </div>
    </section>
  );
}

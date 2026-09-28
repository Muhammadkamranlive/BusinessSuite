"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Boxes, FileText, HeartPulse, ShieldCheck, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInView, usePrefersReducedMotion } from "@/components/marketing/cinematic/motion-hooks";

type Ev = { id: number; module: string; text: string; icon: typeof Activity; tone: "teal" | "coral" | "mint"; at: string };

const POOL: Omit<Ev, "id" | "at">[] = [
  { module: "CRM", text: "Deal “Meridian Q4 restock” moved to Won · PKR 4.8M", icon: Users, tone: "teal" },
  { module: "Sales", text: "INV-20432 posted · credit check passed · Net 30", icon: FileText, tone: "mint" },
  { module: "Inventory", text: "Bin A-14 below reorder · PR-8813 raised automatically", icon: Boxes, tone: "coral" },
  { module: "HRM", text: "Shift B attendance closed · 3 late arrivals flagged", icon: Wallet, tone: "teal" },
  { module: "Healthcare", text: "Bed B-07 admission · PHI access logged (break-glass off)", icon: HeartPulse, tone: "mint" },
  { module: "Finance", text: "Payroll journal JV-1188 posted to 5100 Salaries", icon: Activity, tone: "teal" },
  { module: "Rule Engine", text: "Rule “credit hold > 45d” blocked SO-9931", icon: ShieldCheck, tone: "coral" },
  { module: "Sales", text: "Receipt RC-5521 applied · INV-20419 fully paid", icon: FileText, tone: "mint" },
  { module: "Inventory", text: "GRN-4402 received · 400 × AMX-500 · batch 1025 FEFO", icon: Boxes, tone: "teal" },
  { module: "Healthcare", text: "Lab order CBC resulted · pharmacy dispense queued", icon: HeartPulse, tone: "mint" },
  { module: "Email Engine", text: "Statement of account sent to 128 customers", icon: FileText, tone: "teal" },
  { module: "Finance", text: "Cash position refreshed · runway 14.2 months", icon: Activity, tone: "teal" }
];

const KPIS = [
  { label: "Invoices posted today", base: 1284, step: [1, 3], prefix: "", suffix: "" },
  { label: "Stock moves / hr", base: 412, step: [2, 7], prefix: "", suffix: "" },
  { label: "Revenue MTD", base: 92.4, step: [0.01, 0.04], prefix: "PKR ", suffix: "M", decimals: 1 },
  { label: "PHI reads audited", base: 100, step: [0, 0], prefix: "", suffix: "%" }
];

function stamp(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** Integer LCG so server and client produce byte-identical path data (no Math.sin drift). */
function noise(i: number, seed: number): number {
  let h = (i * 374761393 + seed * 668265263 + 1) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function Spark({ seed, tone }: { seed: number; tone: string }) {
  const d = useMemo(() => {
    let v = 40;
    const pts: string[] = [];
    const s = Math.round(seed * 10);
    for (let i = 0; i <= 24; i++) {
      const wave = ((i + s) % 9) - 4;
      v += wave * 1.5 + (noise(i, s) - 0.4) * 5;
      v = Math.max(12, Math.min(68, v));
      pts.push(`${Math.round((i / 24) * 1600) / 10},${Math.round((80 - v) * 10) / 10}`);
    }
    return `M ${pts.join(" L ")}`;
  }, [seed]);
  return (
    <svg viewBox="0 0 160 80" className="h-12 w-full" aria-hidden>
      <path d={d} fill="none" stroke={tone} strokeWidth="2" className="mkt-x-spark" />
      <path d={`${d} L 160 80 L 0 80 Z`} fill={tone} opacity="0.12" />
    </svg>
  );
}

/** A live operations wall: streaming events, ticking KPIs, self-drawing sparklines. */
export function LiveCommandCenter() {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const inView = useInView(ref, "0px");
  const running = inView && !reduced;
  const [events, setEvents] = useState<Ev[]>(() =>
    POOL.slice(0, 5).map((e, i) => ({ ...e, id: i, at: "" }))
  );
  const [kpi, setKpi] = useState(KPIS.map((k) => k.base));
  const counter = useRef(5);

  useEffect(() => {
    setEvents((prev) => prev.map((e) => ({ ...e, at: e.at || stamp(new Date()) })));
  }, []);

  useEffect(() => {
    if (!running) return;
    const feed = window.setInterval(() => {
      const next = POOL[counter.current % POOL.length];
      const id = counter.current++;
      setEvents((prev) => [{ ...next, id, at: stamp(new Date()) }, ...prev].slice(0, 6));
    }, 2100);
    const tick = window.setInterval(() => {
      setKpi((prev) =>
        prev.map((v, i) => {
          const [lo, hi] = KPIS[i].step;
          return v + lo + Math.random() * (hi - lo);
        })
      );
    }, 1400);
    return () => {
      window.clearInterval(feed);
      window.clearInterval(tick);
    };
  }, [running]);

  return (
    <section ref={ref} className="mkt-x-command" aria-labelledby="command-title">
      <div className="mkt-x-command-bg" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mkt-eyebrow">Command center</p>
          <h2 id="command-title" className="mkt-display mt-4 text-3xl text-white sm:text-4xl md:text-5xl">
            This is what your Monday looks like — <span className="mkt-x-grad">live</span>.
          </h2>
          <p className="mt-4 text-base leading-7 text-white/65">
            Every module writes to one audit trail. Leadership watches the company move in real time instead of
            waiting for month-end.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="mkt-x-panel">
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/60">
                <span className="mkt-x-live-dot" aria-hidden /> Activity stream
              </span>
              <span className="text-[11px] font-semibold text-white/40">tenant · alpha</span>
            </header>
            <ul className="mkt-x-stream divide-y divide-white/[0.06]">
              {events.map((e, i) => {
                const Icon = e.icon;
                return (
                  <li key={e.id} className={cn("mkt-x-stream-item", i === 0 && running && "mkt-x-stream-new")}>
                    <span className="mkt-x-stream-icon" data-tone={e.tone}>
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white/90">{e.text}</p>
                      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
                        {e.module}
                        {e.at ? ` · ${e.at}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {KPIS.map((k, i) => {
              const v = kpi[i];
              const text = `${k.prefix}${k.decimals ? v.toFixed(k.decimals) : Math.round(v).toLocaleString()}${k.suffix}`;
              const tone = i === 2 ? "var(--bs-coral)" : "var(--bs-teal)";
              return (
                <div key={k.label} className="mkt-x-panel p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50">{k.label}</p>
                  <p className="mkt-x-kpi mt-2 text-3xl font-semibold tabular-nums text-white">{text}</p>
                  <Spark seed={i * 1.3} tone={tone} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BadgeCheck,
  Boxes,
  FileText,
  HeartPulse,
  ShieldCheck,
  Users,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useInView, usePrefersReducedMotion } from "@/components/marketing/cinematic/motion-hooks";

type Scene = {
  id: string;
  module: string;
  icon: typeof Activity;
  title: string;
  lines: [string, string][];
  status: [string, string];
  amount?: string;
  tone: "teal" | "coral" | "mint";
  hipaa?: boolean;
};

const SCENES: Scene[] = [
  {
    id: "crm",
    module: "CRM",
    icon: Users,
    title: "Lead → Customer",
    lines: [
      ["Account", "Meridian Traders"],
      ["Stage", "Negotiation → Won"],
      ["Owner", "S. Ahmed"]
    ],
    status: ["Follow-up due", "Won"],
    amount: "PKR 4.8M",
    tone: "teal"
  },
  {
    id: "sales",
    module: "Sales",
    icon: FileText,
    title: "Invoice INV-20431",
    lines: [
      ["Customer", "Meridian Traders"],
      ["Lines", "12 items · FEFO picked"],
      ["Terms", "Net 30 · credit OK"]
    ],
    status: ["Draft", "Posted to ledger"],
    amount: "PKR 1,284,600",
    tone: "mint"
  },
  {
    id: "inventory",
    module: "Inventory",
    icon: Boxes,
    title: "Low stock · Bin A-14",
    lines: [
      ["SKU", "AMX-500 · batch 0925"],
      ["On hand", "42 → reorder 400"],
      ["Rule", "Auto requisition"]
    ],
    status: ["Alert raised", "PR-8812 created"],
    tone: "coral"
  },
  {
    id: "hrm",
    module: "HRM · Payroll",
    icon: Wallet,
    title: "Payroll · September",
    lines: [
      ["Employees", "236 · 3 shifts"],
      ["Loans & leave", "Applied"],
      ["Journal", "Posted to Finance"]
    ],
    status: ["Calculating", "Finalized"],
    amount: "PKR 18.2M",
    tone: "teal"
  },
  {
    id: "healthcare",
    module: "Healthcare · HMS",
    icon: HeartPulse,
    title: "Admission · Ward B",
    lines: [
      ["Patient", "MRN ••••••42"],
      ["Bed", "B-07 · Cardiology"],
      ["Orders", "CBC · ECG · Pharmacy"]
    ],
    status: ["Triage", "Admitted · PHI audited"],
    tone: "mint",
    hipaa: true
  },
  {
    id: "finance",
    module: "Finance & BI",
    icon: Activity,
    title: "Executive P&L",
    lines: [
      ["Revenue MTD", "PKR 92.4M"],
      ["Gross margin", "31.8%"],
      ["Cash runway", "14.2 months"]
    ],
    status: ["Refreshing", "Live"],
    tone: "teal"
  }
];

function useTicker(running: boolean, step: number, ms: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % step), ms);
    return () => window.clearInterval(id);
  }, [running, step, ms]);
  return i;
}

/**
 * Self-running “live console” — a deck of module cards that keep working:
 * drafts post, alerts resolve, payroll finalizes. Feels like screen-captured video.
 */
export function LiveOpsDeck({ className, tilt = true }: { className?: string; tilt?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const inView = useInView(ref, "0px");
  const running = inView && !reduced;
  const phaseLen = 3600;
  const active = useTicker(running, SCENES.length, phaseLen);
  const [phase, setPhase] = useState<"enter" | "work" | "done">("enter");

  useEffect(() => {
    if (!running) {
      setPhase("done");
      return;
    }
    setPhase("enter");
    const a = window.setTimeout(() => setPhase("work"), 500);
    const b = window.setTimeout(() => setPhase("done"), 2100);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [active, running]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !tilt || reduced) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--rx", `${(-py * 9).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(px * 12).toFixed(2)}deg`);
    };
    const onLeave = () => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [tilt, reduced]);

  const order = useMemo(() => {
    return SCENES.map((s, i) => {
      const rel = (i - active + SCENES.length) % SCENES.length;
      return { scene: s, rel };
    });
  }, [active]);

  const feed = useMemo(() => {
    const items: { scene: Scene; text: string }[] = [];
    for (let k = 1; k <= 4; k++) {
      const s = SCENES[(active - k + SCENES.length * 2) % SCENES.length];
      items.push({ scene: s, text: `${s.title} — ${s.status[1]}` });
    }
    return items;
  }, [active]);

  return (
    <div ref={ref} className={cn("mkt-x-deck", className)} data-running={running ? "1" : "0"}>
      <div className="mkt-x-deck-stage">
        <div className="mkt-x-deck-halo" aria-hidden />

        <div className="mkt-x-deck-rail" aria-hidden>
          {SCENES.map((s, i) => (
            <span key={s.id} className="mkt-x-deck-dot" data-on={i === active ? "1" : "0"} />
          ))}
        </div>

        <div className="mkt-x-deck-cards">
          {order.map(({ scene, rel }) => {
            const Icon = scene.icon;
            const isTop = rel === 0;
            const done = !isTop || phase === "done";
            const working = isTop && phase === "work";
            return (
              <article
                key={scene.id}
                className="mkt-x-card"
                data-rel={Math.min(rel, 3)}
                data-tone={scene.tone}
                aria-hidden={!isTop}
              >
                <header className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
                    <span className="mkt-x-card-icon">
                      <Icon className="size-3.5" aria-hidden />
                    </span>
                    {scene.module}
                  </span>
                  {scene.hipaa ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-teal/40 bg-teal/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-teal">
                      <ShieldCheck className="size-3" aria-hidden /> HIPAA
                    </span>
                  ) : (
                    <span className="mkt-x-live-dot" aria-hidden />
                  )}
                </header>

                <h3 className="mt-3 text-lg font-semibold tracking-tight text-white">{scene.title}</h3>

                <dl className="mt-3 grid gap-1.5 text-[13px]">
                  {scene.lines.map(([k, v], li) => (
                    <div
                      key={k}
                      className="mkt-x-card-line flex items-baseline justify-between gap-3"
                      style={{ animationDelay: `${120 + li * 90}ms` }}
                    >
                      <dt className="text-white/50">{k}</dt>
                      <dd className="text-right font-medium text-white/90">{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mkt-x-card-progress mt-4" data-phase={isTop ? phase : "done"}>
                  <i />
                </div>

                <footer className="mt-3 flex items-center justify-between gap-3">
                  <span className="mkt-x-status" data-done={done ? "1" : "0"}>
                    <span className="mkt-x-status-a">{scene.status[0]}</span>
                    <span className="mkt-x-status-b">
                      <BadgeCheck className="size-3.5" aria-hidden />
                      {scene.status[1]}
                    </span>
                  </span>
                  {scene.amount ? (
                    <span className={cn("text-sm font-semibold tabular-nums", working ? "text-white/70" : "text-white")}>
                      {scene.amount}
                    </span>
                  ) : null}
                </footer>
              </article>
            );
          })}
        </div>

        <ul className="mkt-x-feed" aria-label="Recent activity">
          {feed.map(({ scene, text }, i) => (
            <li key={`${scene.id}-${active}-${i}`} className="mkt-x-feed-item" style={{ animationDelay: `${i * 60}ms` }}>
              <span className="mkt-x-feed-tick" data-tone={scene.tone} aria-hidden />
              <span className="truncate">{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

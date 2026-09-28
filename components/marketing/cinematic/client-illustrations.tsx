"use client";

import { cn } from "@/lib/utils";

/** Client-safe cinematic SVGs via <img> (server inliner uses fs — not for "use client"). */
export function CinematicSvg({
  name,
  className
}: {
  name: "orbit-apps" | "data-flow" | "hipaa-shield" | "warehouse-flow" | "payroll-pulse";
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/marketing/cinematic/${name}.svg`}
      alt=""
      aria-hidden
      className={cn("pointer-events-none select-none", className)}
      loading="lazy"
    />
  );
}

const ORBIT_NODES: { label: string; ring: 1 | 2 | 3; angle: number; accent?: boolean }[] = [
  { label: "HRM", ring: 1, angle: -90 },
  { label: "CRM", ring: 1, angle: 0, accent: true },
  { label: "Sales", ring: 1, angle: 90 },
  { label: "Finance", ring: 2, angle: -45, accent: true },
  { label: "Payroll", ring: 2, angle: 135 },
  { label: "HMS", ring: 3, angle: -135 },
  { label: "Inventory", ring: 3, angle: -45, accent: true },
  { label: "Pharmacy", ring: 3, angle: -90 }
];

const RING_R = { 1: 150, 2: 205, 3: 260 } as const;

/** Inline orbit system — app nodes circling the suite core; inherits theme tokens. */
export function OrbitRings({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 600" className={cn("pointer-events-none select-none", className)} aria-hidden>
      <defs>
        <radialGradient id="mkt-x-orbit-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--bs-teal)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--bs-teal)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="300" cy="300" r="120" fill="url(#mkt-x-orbit-glow)" className="mkt-cine-pulse" style={{ transformOrigin: "300px 300px" }} />
      {([1, 2, 3] as const).map((ring) => (
        <circle
          key={ring}
          cx="300"
          cy="300"
          r={RING_R[ring]}
          fill="none"
          stroke="white"
          strokeOpacity={0.14 - ring * 0.025}
          strokeWidth="1"
          strokeDasharray={ring === 2 ? "3 10" : undefined}
        />
      ))}
      {([1, 2, 3] as const).map((ring) => (
        <g
          key={`g-${ring}`}
          className={ring === 2 ? "mkt-cine-spin-rev" : "mkt-cine-spin"}
          style={{ transformOrigin: "300px 300px", animationDuration: `${22 + ring * 10}s` }}
        >
          {ORBIT_NODES.filter((n) => n.ring === ring).map((n) => {
            const rad = (n.angle * Math.PI) / 180;
            const x = 300 + Math.cos(rad) * RING_R[ring];
            const y = 300 + Math.sin(rad) * RING_R[ring];
            const color = n.accent ? "var(--bs-coral)" : "var(--bs-teal)";
            return (
              <g key={n.label} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
                <title>{n.label}</title>
                <circle r="16" fill="#0b1f3a" stroke={color} strokeWidth="2" />
                <circle r="5" fill={color} />
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

export function moduleAccentSvg(
  slug: string
): "orbit-apps" | "data-flow" | "hipaa-shield" | "warehouse-flow" | "payroll-pulse" {
  if (slug === "healthcare") return "hipaa-shield";
  if (slug === "hrm") return "payroll-pulse";
  if (slug === "inventory" || slug === "purchases" || slug === "operations") return "warehouse-flow";
  if (slug === "crm" || slug === "sales" || slug === "finance" || slug === "reports") return "data-flow";
  return "orbit-apps";
}

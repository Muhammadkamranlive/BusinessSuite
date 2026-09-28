"use client";

import { useEffect, useRef, useState } from "react";
import { clamp01, usePrefersReducedMotion } from "@/components/marketing/cinematic/motion-hooks";

type Geometry = { top: number; height: number; d: string; endX: number; endY: number };

const TAIL = 140;

/**
 * A liquid stream that pours from the hero, glides down the content gutter as you
 * scroll, then bends into the Pricing heading and lands in a ripple. Scroll-scrubbed.
 */
export function PricingFlowLine({
  from = ".mkt-x-hero",
  to = "#pricing-title",
  hostRef
}: {
  from?: string;
  to?: string;
  hostRef: React.RefObject<HTMLElement | null>;
}) {
  const reduced = usePrefersReducedMotion();
  const [geo, setGeo] = useState<Geometry | null>(null);
  const measureRef = useRef<SVGPathElement>(null);
  const bodyRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const sheenRef = useRef<SVGPathElement>(null);
  const maskRef = useRef<SVGPathElement>(null);
  const cometRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const measure = () => {
      const start = document.querySelector<HTMLElement>(from);
      const end = document.querySelector<HTMLElement>(to);
      if (!start || !end || window.innerWidth < 1024) {
        setGeo(null);
        return;
      }
      const hostRect = host.getBoundingClientRect();
      const s = start.getBoundingClientRect();
      const e = end.getBoundingClientRect();
      const top = s.bottom - hostRect.top - 60;
      const endY = e.top + e.height / 2 - hostRect.top - top;
      const endX = e.left - hostRect.left - 26;

      // Ride the content gutter (just outside the 72rem column), never the screen edge.
      const gutter = (hostRect.width - 1152) / 2;
      const x0 = Math.max(36, Math.round(gutter - 44));
      const bendStart = Math.max(200, endY - 320);

      // Long, lazy waves — sampled sine turned into a smooth quadratic spline.
      const amp = 14;
      const wavelength = 1100;
      const step = 60;
      const pts: [number, number][] = [];
      for (let y = 0; y <= bendStart; y += step) {
        const damp = Math.min(1, y / 400) * Math.min(1, (bendStart - y) / 300);
        pts.push([x0 + Math.sin((y / wavelength) * Math.PI * 2) * amp * damp, y]);
      }
      if (pts[pts.length - 1][1] !== bendStart) pts.push([x0, bendStart]);
      const parts: string[] = [`M ${pts[0][0].toFixed(1)} ${pts[0][1]}`];
      for (let i = 1; i < pts.length - 1; i++) {
        const [cx, cy] = pts[i];
        const mx = (cx + pts[i + 1][0]) / 2;
        const my = (cy + pts[i + 1][1]) / 2;
        parts.push(`Q ${cx.toFixed(1)} ${cy} ${mx.toFixed(1)} ${my}`);
      }
      const last = pts[pts.length - 1];
      parts.push(`L ${last[0].toFixed(1)} ${last[1]}`);
      // One wide, confident bend into the heading.
      parts.push(`C ${x0} ${endY - 60}, ${(x0 + (endX - x0) * 0.42).toFixed(1)} ${endY}, ${endX} ${endY}`);

      setGeo({ top, height: endY + 140, d: parts.join(" "), endX, endY });
    };

    measure();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    ro?.observe(host);
    window.addEventListener("resize", measure);
    const t = window.setTimeout(measure, 900);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      window.clearTimeout(t);
    };
  }, [from, to, hostRef]);

  useEffect(() => {
    const path = measureRef.current;
    const wrap = wrapRef.current;
    if (!path || !wrap || !geo) return;
    const length = path.getTotalLength();
    const reveal = [bodyRef.current, glowRef.current, sheenRef.current, maskRef.current];
    const comet = cometRef.current;
    const head = headRef.current;
    const target = document.querySelector<HTMLElement>(to);
    for (const p of reveal) if (p) p.style.strokeDasharray = `${length}`;
    if (comet) comet.style.strokeDasharray = `${TAIL} ${length + TAIL}`;

    let frame = 0;
    let arrived = false;
    const update = () => {
      frame = 0;
      const rect = wrap.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const progress = reduced ? 1 : clamp01((viewport * 0.6 - rect.top) / geo.endY);
      const at = length * progress;
      for (const p of reveal) if (p) p.style.strokeDashoffset = `${length - at}`;
      if (comet) comet.style.strokeDashoffset = `${TAIL - at}`;
      if (head) {
        const pt = path.getPointAtLength(at);
        const back = path.getPointAtLength(Math.max(0, at - 2));
        const angle = (Math.atan2(pt.y - back.y, pt.x - back.x) * 180) / Math.PI - 90;
        head.setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)}) rotate(${angle.toFixed(1)})`);
        head.dataset.state = progress <= 0.002 ? "idle" : progress >= 0.995 ? "landed" : "flowing";
      }
      const now = progress >= 0.985;
      if (now !== arrived) {
        arrived = now;
        wrap.dataset.arrived = now ? "1" : "0";
        target?.closest("section")?.setAttribute("data-flow-arrived", now ? "1" : "0");
      }
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [geo, reduced, to]);

  if (!geo) return null;

  return (
    <div ref={wrapRef} className="mkt-x-water" style={{ top: geo.top, height: geo.height }} aria-hidden data-arrived="0">
      <svg width="100%" height={geo.height} className="mkt-x-water-svg" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="mkt-x-water-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={geo.height}>
            <stop offset="0" stopColor="#bfe3ff" />
            <stop offset="0.45" stopColor="var(--bs-teal)" />
            <stop offset="1" stopColor="#38bdf8" />
          </linearGradient>
          <radialGradient id="mkt-x-drop-grad" cx="38%" cy="32%" r="72%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.3" stopColor="#dbeeff" />
            <stop offset="0.75" stopColor="var(--bs-teal)" />
            <stop offset="1" stopColor="#0b4fa8" />
          </radialGradient>
          <filter id="mkt-x-water-soft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="mkt-x-water-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <mask id="mkt-x-water-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height={geo.height}>
            <path ref={maskRef} d={geo.d} fill="none" stroke="#fff" strokeWidth="16" strokeLinecap="round" />
          </mask>
        </defs>

        <path ref={measureRef} d={geo.d} fill="none" stroke="none" />

        {/* riverbed ahead of the water */}
        <path d={geo.d} fill="none" stroke="var(--bs-teal)" strokeOpacity="0.14" strokeWidth="1.5" strokeDasharray="1 9" strokeLinecap="round" />

        {/* ribbon: soft halo → body → sheen */}
        <path ref={glowRef} d={geo.d} fill="none" stroke="var(--bs-teal)" strokeOpacity="0.32" strokeWidth="18" strokeLinecap="round" filter="url(#mkt-x-water-soft)" />
        <path ref={bodyRef} d={geo.d} fill="none" stroke="url(#mkt-x-water-grad)" strokeWidth="6" strokeLinecap="round" />
        <path ref={sheenRef} d={geo.d} fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.5" strokeLinecap="round" transform="translate(-1.4 0)" />

        {/* moving current inside the ribbon */}
        <g mask="url(#mkt-x-water-mask)">
          <path d={geo.d} fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="2.4" strokeLinecap="round" className="mkt-x-water-current" />
        </g>

        {/* bright comet just behind the drop */}
        <path ref={cometRef} d={geo.d} fill="none" stroke="#eaf6ff" strokeOpacity="0.9" strokeWidth="6" strokeLinecap="round" className="mkt-x-water-comet" />

        {/* landing ripple */}
        <g transform={`translate(${geo.endX} ${geo.endY})`} className="mkt-x-water-pool">
          <circle r="26" fill="none" stroke="var(--bs-teal)" strokeOpacity="0.5" strokeWidth="1.5" className="mkt-x-water-ring" />
          <circle r="26" fill="none" stroke="var(--bs-teal)" strokeOpacity="0.5" strokeWidth="1.5" className="mkt-x-water-ring" style={{ animationDelay: "-1.2s" }} />
          <circle r="7" fill="url(#mkt-x-drop-grad)" filter="url(#mkt-x-water-glow)" />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <circle key={deg} r="2.2" fill="#bfe3ff" className="mkt-x-water-splash" style={{ transform: `rotate(${deg}deg)` }} />
          ))}
        </g>

        {/* the drop — teardrop pointing back along the flow */}
        <g ref={headRef} data-state="idle" className="mkt-x-water-head">
          <circle r="22" fill="var(--bs-teal)" opacity="0.35" filter="url(#mkt-x-water-soft)" />
          <path
            d="M 0 -22 C 7 -10, 10 -4, 10 3 A 10 10 0 1 1 -10 3 C -10 -4, -7 -10, 0 -22 Z"
            fill="url(#mkt-x-drop-grad)"
            filter="url(#mkt-x-water-glow)"
          />
          <ellipse cx="-3.2" cy="-1" rx="2.4" ry="4" fill="#fff" opacity="0.85" transform="rotate(-18 -3.2 -1)" />
        </g>
      </svg>
    </div>
  );
}

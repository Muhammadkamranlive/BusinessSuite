"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/components/marketing/cinematic/motion-hooks";

/** Soft light that trails the pointer across dark stages (fine pointers only). */
export function SpotlightCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 3;
    let tx = x;
    let ty = y;
    let frame = 0;
    let idle: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      el.style.setProperty("--sx", `${x}px`);
      el.style.setProperty("--sy", `${y}px`);
      if (Math.abs(tx - x) > 0.4 || Math.abs(ty - y) > 0.4) {
        frame = window.requestAnimationFrame(tick);
      } else {
        frame = 0;
      }
    };

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      el.dataset.on = "1";
      if (!frame) frame = window.requestAnimationFrame(tick);
      if (idle) clearTimeout(idle);
      idle = setTimeout(() => {
        el.dataset.on = "0";
      }, 2200);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
      if (idle) clearTimeout(idle);
    };
  }, [reduced]);

  if (reduced) return null;
  return <div ref={ref} className="mkt-x-spotlight" aria-hidden data-on="0" />;
}

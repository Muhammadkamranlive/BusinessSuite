"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function mix(from: number, to: number, t: number): number {
  return from + (to - from) * clamp01(t);
}

const MOTION_KEY = "businesssuite:motion";

/**
 * Motion is ON by default — the landing is a film, not a document.
 * Reduce only when explicitly requested: `?motion=reduce` (persisted) or a saved
 * preference; `?motion=full` clears it. Sets `html[data-motion]` so CSS follows.
 */
export function readMotionPreference(): "full" | "reduce" {
  if (typeof window === "undefined") return "full";
  try {
    const q = new URLSearchParams(window.location.search).get("motion");
    if (q === "reduce" || q === "full") {
      window.localStorage.setItem(MOTION_KEY, q);
      return q;
    }
    return window.localStorage.getItem(MOTION_KEY) === "reduce" ? "reduce" : "full";
  } catch {
    return "full";
  }
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const pref = readMotionPreference();
    setReduced(pref === "reduce");
    if (pref === "reduce") document.documentElement.dataset.motion = "reduce";
    else delete document.documentElement.dataset.motion;
  }, []);

  return reduced;
}

/**
 * Progress of a tall element travelling through the viewport, 0 → 1.
 * When the element is shorter than the viewport it falls back to a
 * centre-crossing measure so short sections still scrub.
 */
export function useScrollProgress<T extends HTMLElement>(
  ref: RefObject<T | null>,
  enabled = true
): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const span = rect.height - viewport;
      if (span > 1) {
        setProgress(clamp01(-rect.top / span));
        return;
      }
      setProgress(clamp01((viewport - rect.top) / (viewport + rect.height)));
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ref, enabled]);

  return progress;
}

/** One-shot in-view flag — used to defer mounting / loading below-fold art. */
export function useInView<T extends HTMLElement>(
  ref: RefObject<T | null>,
  rootMargin = "25% 0px"
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);

  return inView;
}

/** Width of a horizontal track and its viewport, kept fresh on resize. */
export function useTrackMetrics<V extends HTMLElement, T extends HTMLElement>(
  viewportRef: RefObject<V | null>,
  trackRef: RefObject<T | null>
): { travel: number } {
  const [travel, setTravel] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const measure = () => {
      raf.current = 0;
      setTravel(Math.max(0, track.scrollWidth - viewport.clientWidth));
    };
    const schedule = () => {
      if (raf.current) return;
      raf.current = window.requestAnimationFrame(measure);
    };

    measure();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    ro?.observe(viewport);
    ro?.observe(track);
    window.addEventListener("resize", schedule);
    return () => {
      if (raf.current) window.cancelAnimationFrame(raf.current);
      ro?.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [viewportRef, trackRef]);

  return { travel };
}

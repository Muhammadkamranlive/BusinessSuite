"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/components/marketing/cinematic/motion-hooks";

/** Lights up children when they enter the viewport (scroll film beat). */
export function ScrollLite({
  children,
  className,
  rootMargin = "0px 0px -12% 0px"
}: {
  children: ReactNode;
  className?: string;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [on, setOn] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      setOn(true);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setOn(true);
      },
      { rootMargin, threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, rootMargin]);

  return (
    <div ref={ref} data-cine-play={on ? "on" : "off"} className={cn(className)}>
      {children}
    </div>
  );
}

/** Staggered list items that activate one-by-one on scroll. */
export function ScrollLiteList({
  items,
  renderItem,
  className
}: {
  items: string[];
  renderItem: (item: string, active: boolean, index: number) => ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(reduced ? items.length : 0);

  useEffect(() => {
    if (reduced) {
      setActive(items.length);
      return;
    }
    const root = ref.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-lite-item]"));
    if (!nodes.length || typeof IntersectionObserver === "undefined") {
      setActive(items.length);
      return;
    }
    const seen = new Set<number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const i = Number((entry.target as HTMLElement).dataset.liteItem);
          if (!Number.isFinite(i)) continue;
          seen.add(i);
        }
        setActive(seen.size ? Math.max(...Array.from(seen)) + 1 : 0);
      },
      { rootMargin: "0px 0px -18% 0px", threshold: 0.35 }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [items.length, reduced]);

  return (
    <ul ref={ref} className={className}>
      {items.map((item, i) => (
        <li key={item} data-lite-item={i}>
          {renderItem(item, i < active, i)}
        </li>
      ))}
    </ul>
  );
}

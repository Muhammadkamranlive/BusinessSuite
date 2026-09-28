"use client";

import { useEffect, useRef, useState, type ElementType } from "react";
import { cn } from "@/lib/utils";
import { clamp01, usePrefersReducedMotion, useScrollProgress } from "@/components/marketing/cinematic/motion-hooks";

/** Headline whose words rise out of a clip one after another. */
export function KineticHeadline({
  text,
  as: Tag = "h1",
  className,
  accent = [],
  delay = 0
}: {
  text: string;
  as?: ElementType;
  className?: string;
  accent?: string[];
  delay?: number;
}) {
  const words = text.split(" ");
  return (
    <Tag className={cn("mkt-x-kinetic", className)} aria-label={text}>
      {words.map((word, i) => {
        const clean = word.replace(/[^\w&-]/g, "").toLowerCase();
        const isAccent = accent.some((a) => a.toLowerCase() === clean);
        return (
          <span key={`${word}-${i}`} className="mkt-x-kinetic-word" aria-hidden>
            <span
              className={cn("mkt-x-kinetic-inner", isAccent && "mkt-x-kinetic-accent")}
              style={{ animationDelay: `${delay + i * 70}ms` }}
            >
              {word}
            </span>
          </span>
        );
      })}
    </Tag>
  );
}

/** Rotating verb ribbon — “posting invoices” → “running payroll” … */
export function RotatingPhrase({
  phrases,
  className,
  interval = 2400
}: {
  phrases: string[];
  className?: string;
  interval?: number;
}) {
  const [index, setIndex] = useState(0);
  const reduced = usePrefersReducedMotion();
  const longest = phrases.reduce((a, b) => (a.length > b.length ? a : b), "");

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % phrases.length), interval);
    return () => window.clearInterval(id);
  }, [phrases.length, interval, reduced]);

  return (
    <span className={cn("mkt-x-rotator", className)} aria-live="polite">
      <span className="invisible" aria-hidden>
        {longest}
      </span>
      {phrases.map((p, i) => (
        <span key={p} className="mkt-x-rotator-item" data-state={i === index ? "in" : i === (index + phrases.length - 1) % phrases.length ? "out" : "idle"}>
          {p}
        </span>
      ))}
    </span>
  );
}

/** Large statement whose words fill with light as the reader scrolls through. */
export function ScrollStatement({
  text,
  eyebrow,
  className
}: {
  text: string;
  eyebrow?: string;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const progress = useScrollProgress(ref, !reduced);
  const words = text.split(" ");
  const lit = reduced ? words.length : Math.round(clamp01((progress - 0.12) / 0.7) * words.length);

  return (
    <section ref={ref} className={cn("mkt-x-statement", className)} style={{ minHeight: reduced ? undefined : "160vh" }}>
      <div className="mkt-x-statement-sticky">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          {eyebrow ? <p className="mkt-eyebrow text-center">{eyebrow}</p> : null}
          <p className="mkt-display mt-6 text-center text-[2rem] leading-[1.12] text-white sm:text-4xl md:text-5xl lg:text-[3.6rem]">
            {words.map((w, i) => (
              <span key={`${w}-${i}`} className="mkt-x-statement-word" data-lit={i < lit ? "1" : "0"}>
                {w}{" "}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}

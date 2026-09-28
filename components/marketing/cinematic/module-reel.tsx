"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { CinematicSvg, moduleAccentSvg } from "@/components/marketing/cinematic/client-illustrations";
import { usePrefersReducedMotion, useScrollProgress, useTrackMetrics } from "@/components/marketing/cinematic/motion-hooks";
import { useLandingMedia } from "@/components/marketing/use-landing-media";
import { screenshotForModule } from "@/lib/marketing-media";
import { productModules } from "@/lib/product-modules";

/**
 * Sticky horizontal reel — vertical scroll pans every product app like a camera dolly.
 * Reduced motion / no-JS: a normal responsive grid.
 */
export function ModuleReel() {
  const media = useLandingMedia();
  const reduced = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(sectionRef, !reduced);
  const { travel } = useTrackMetrics(viewportRef, trackRef);
  const shift = reduced ? 0 : -progress * travel;
  const activeIdx = Math.min(productModules.length - 1, Math.floor(progress * productModules.length));

  return (
    <section
      id="modules"
      ref={sectionRef}
      className="mkt-x-reel"
      style={reduced ? undefined : { height: `calc(100vh + ${Math.max(travel, 600)}px)` }}
      aria-labelledby="reel-title"
    >
      <div className="mkt-x-reel-sticky">
        <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mkt-eyebrow">Inside the product</p>
              <h2 id="reel-title" className="mkt-display mt-3 text-3xl text-[color:var(--bs-ink)] sm:text-4xl">
                Every app, one login. Keep scrolling — the camera pans.
              </h2>
            </div>
            <p className="text-xs font-semibold tabular-nums text-slate-500">
              {String(activeIdx + 1).padStart(2, "0")} / {String(productModules.length).padStart(2, "0")}
            </p>
          </div>
          <div className="mkt-x-reel-rail mt-4" aria-hidden>
            <i style={{ transform: `scaleX(${reduced ? 1 : Math.max(0.03, progress)})` }} />
          </div>
        </div>

        <div ref={viewportRef} className="mkt-x-reel-viewport mt-8">
          <div
            ref={trackRef}
            className="mkt-x-reel-track"
            style={{ transform: `translate3d(${shift}px, 0, 0)` }}
            data-reduced={reduced ? "1" : "0"}
          >
            {productModules.map((m, i) => {
              const shot = screenshotForModule(m.slug, media);
              const dist = Math.abs(i - activeIdx);
              return (
                <Link
                  key={m.slug}
                  href={`/product/${m.slug}`}
                  className="mkt-x-reel-card group"
                  data-near={dist === 0 ? "0" : dist === 1 ? "1" : "2"}
                >
                  <div className="mkt-x-reel-shot">
                    <img
                      src={shot}
                      alt={m.heroCaption}
                      loading="lazy"
                      style={{ transform: reduced ? undefined : `translate3d(${(i - activeIdx) * -6}px, 0, 0) scale(1.06)` }}
                    />
                    <div className="mkt-x-reel-veil" aria-hidden />
                    <div className="absolute -bottom-2 -left-2 h-16 w-20 sm:h-20 sm:w-24">
                      <CinematicSvg name={moduleAccentSvg(m.slug)} className="h-full w-full object-contain drop-shadow-lg" />
                    </div>
                    {m.slug === "healthcare" ? (
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-teal shadow-sm">
                        <ShieldCheck className="size-3" aria-hidden /> HIPAA
                      </span>
                    ) : null}
                    <span className="absolute right-3 top-3 rounded-full bg-[color:var(--bs-ink)]/80 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal">{m.eyebrow}</p>
                    <h3 className="mt-2 text-xl font-semibold text-[color:var(--bs-ink)]">{m.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{m.summary}</p>
                    <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--bs-ink)] group-hover:text-teal">
                      Open {m.title} <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

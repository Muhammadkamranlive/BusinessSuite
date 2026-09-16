"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { MktCta } from "@/components/marketing/mkt-button";
import { LaptopFrame } from "@/components/marketing/screenshot-frame";
import { useLandingMedia } from "@/components/marketing/use-landing-media";
import { productModules } from "@/lib/product-modules";
import { screenshotForModule } from "@/lib/marketing-media";

export function ModuleLaptopStage() {
  const media = useLandingMedia();
  const [slug, setSlug] = useState(productModules[0]?.slug ?? "crm");
  const current = productModules.find((m) => m.slug === slug) ?? productModules[0];

  if (!current) return null;

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2">
        {productModules.map((item) => {
          const on = item.slug === current.slug;
          return (
            <button
              key={item.slug}
              type="button"
              onClick={() => setSlug(item.slug)}
              className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                on
                  ? "bg-[color:var(--bs-ink)] text-white shadow-sm"
                  : "border border-[color:var(--bs-line)] bg-white text-[color:var(--bs-ink)] hover:border-[color:var(--bs-teal)]"
              }`}
            >
              {item.title}
            </button>
          );
        })}
      </div>
      <div className="mx-auto mt-8 max-w-4xl">
        <LaptopFrame src={screenshotForModule(current.slug, media)} alt={current.heroCaption} hero />
      </div>
      <div className="mx-auto mt-8 max-w-xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--bs-teal)]">{current.eyebrow}</p>
        <p className="mt-2 text-[15px] leading-7 text-slate-600">{current.summary}</p>
        <div className="mt-5 flex justify-center">
          <MktCta href={`/product/${current.slug}`} variant="secondary">
            Open {current.title} <ArrowRight className="size-4" />
          </MktCta>
        </div>
      </div>
    </div>
  );
}

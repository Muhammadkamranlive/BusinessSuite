"use client";

import { useParams } from "next/navigation";
import { PublicSiteShell } from "@/components/layout/public-site-shell";
import { MktCta } from "@/components/marketing/mkt-button";
import { ProductModulePage } from "@/components/marketing/product-module-page";
import { getProductModule } from "@/lib/product-modules";

export default function ProductSlugPage() {
  const params = useParams();
  const slug = params.slug as string;
  const module = getProductModule(slug);

  if (!module) {
    return (
      <PublicSiteShell>
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <p className="mkt-display text-2xl text-[color:var(--bs-ink)]">Module not found</p>
          <div className="mt-6 flex justify-center">
            <MktCta href="/#modules" variant="secondary">
              Back to product
            </MktCta>
          </div>
        </div>
      </PublicSiteShell>
    );
  }

  return <ProductModulePage module={module} />;
}

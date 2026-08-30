"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PublicSiteShell } from "@/components/layout/public-site-shell";
import { CmsArticle } from "@/components/marketing/cms-article";
import { MktCta } from "@/components/marketing/mkt-button";
import {
  ensureProductionSiteContent,
  getMenuBySlug,
  getPage,
  listPages,
  type CmsMenu,
  type CmsPage
} from "@/modules/cms/services/cms.store";

export default function SiteMenuPage() {
  const params = useParams();
  const menuSlug = params.menu as string;
  const pageParam = params.page;
  const pageSlug = Array.isArray(pageParam) ? pageParam[0] : undefined;

  const [menu, setMenu] = useState<CmsMenu | null>(null);
  const [page, setPage] = useState<CmsPage | null>(null);
  const [siblings, setSiblings] = useState<CmsPage[]>([]);

  useEffect(() => {
    ensureProductionSiteContent();
    const m = getMenuBySlug(menuSlug);
    setMenu(m);
    if (!m) {
      setPage(null);
      setSiblings([]);
      return;
    }
    const pages = listPages(m.id);
    setSiblings(pages);
    if (pageSlug) {
      const result = getPage(menuSlug, pageSlug);
      setPage(result?.page ?? null);
    } else {
      setPage(pages[0] ?? null);
    }
  }, [menuSlug, pageSlug]);

  if (!menu) {
    return (
      <PublicSiteShell>
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <p className="mkt-display text-2xl">Page not found</p>
          <div className="mt-6 flex justify-center">
            <MktCta href="/" variant="secondary">
              Home
            </MktCta>
          </div>
        </div>
      </PublicSiteShell>
    );
  }

  return (
    <PublicSiteShell>
      <section className="relative overflow-hidden">
        <div className="mkt-mesh absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-16">
          <p className="mkt-eyebrow">{menu.label}</p>
          <h1 className="mkt-display mt-3 text-3xl sm:text-4xl">{page?.title ?? menu.label}</h1>
          <p className="mkt-muted mt-3 max-w-2xl text-base leading-7">{page?.summary ?? menu.description}</p>
        </div>
      </section>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-20 md:grid-cols-[220px_1fr] md:px-6">
        <aside className="h-fit rounded-2xl border border-[#e6ebf1] bg-white p-3">
          <nav className="space-y-1">
            {siblings.map((p) => (
              <Link
                key={p.id}
                href={`/site/${menu.slug}/${p.slug}`}
                className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  page?.id === p.id ? "bg-[#0a2540] text-white" : "text-[#425466] hover:bg-[#f6f9fc]"
                }`}
              >
                {p.title}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="rounded-[1.5rem] border border-[#e6ebf1] bg-white p-6 sm:p-10">
          {page ? (
            <CmsArticle title={page.title} content={page.content} hideTitle />
          ) : (
            <p className="text-sm text-slate-500">No published pages under this section yet. Add them in Administration → Menus & Pages.</p>
          )}
        </div>
      </div>
    </PublicSiteShell>
  );
}

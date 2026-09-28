"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogIn, Menu, X } from "lucide-react";
import { BrandMark } from "@/components/marketing/brand-mark";
import { ProductNav } from "@/components/marketing/product-nav";
import { MktCta } from "@/components/marketing/mkt-button";
import { ensureProductionSiteContent, listMenus, listPages } from "@/modules/cms/services/cms.store";
import { applyDesignTokens, fetchDesignTokens } from "@/lib/design-tokens";
import { fetchLandingMedia } from "@/lib/marketing-media";
import { getStoredUserEmail } from "@/lib/auth/session";
import { useProductBrand } from "@/components/common/use-product-brand";
import { MEGA_MENU_SECTIONS, TOTAL_PAYABLE_APP_COUNT } from "@/lib/billing/module-catalog";

/** Footer "Product" column is generated from the billing catalog so it never drifts from what is sold. */
const footerProductLinks = [
  { href: "/#modules", label: "All apps" },
  ...MEGA_MENU_SECTIONS.flatMap((section) =>
    section.items
      .filter((item) => item.href.startsWith("/product/"))
      .map((item) => ({ href: item.href, label: item.label }))
  ),
  { href: "/pricing", label: "Pricing" }
];

const primaryNav = [
  { href: "/product/rule-engine", label: "Rule Engine" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" }
];

export function PublicSiteShell({ children }: { children: React.ReactNode }) {
  const [menus, setMenus] = useState(() => listMenus());
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const brand = useProductBrand();

  useEffect(() => {
    fetchDesignTokens().then(applyDesignTokens);
    void fetchLandingMedia();
    ensureProductionSiteContent();
    setMenus(listMenus());
    setLoggedIn(Boolean(getStoredUserEmail()));
  }, []);

  return (
    <div className="mkt-root min-h-[100dvh] overflow-x-clip">
      <header className="sticky top-0 z-40 border-b border-[color:var(--bs-line)] bg-white/80 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <BrandMark />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold tracking-tight text-[color:var(--bs-ink)]">{brand.productName}</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--bs-teal)]">{brand.productTagline}</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex">
            <ProductNav />
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-[13px] font-medium tracking-tight text-slate-600 transition hover:bg-[color:var(--bs-cloud)] hover:text-[color:var(--bs-ink)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            {loggedIn ? (
              <MktCta href="/apps">Open workspace</MktCta>
            ) : (
              <>
                <MktCta href="/login" variant="ghost">
                  Sign in
                </MktCta>
                <MktCta href="/signup">Create your company</MktCta>
              </>
            )}
          </div>

          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-full border border-[color:var(--bs-line)] bg-white text-[color:var(--bs-ink)] lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {open ? (
          <div className="max-h-[min(80dvh,40rem)] overflow-y-auto border-t border-[color:var(--bs-line)] bg-white px-4 py-4 lg:hidden">
            <div className="flex flex-col gap-5">
              <div>
                <div className="flex items-center justify-between px-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Product</p>
                  <span className="text-[11px] font-medium text-slate-400">{TOTAL_PAYABLE_APP_COUNT} apps</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {MEGA_MENU_SECTIONS.flatMap((section) =>
                    section.items.map((item) => (
                      <Link
                        key={item.href + item.label}
                        href={item.href}
                        className="rounded-xl border border-[color:var(--bs-line)] bg-[color:var(--bs-cloud)] px-3 py-3 transition active:bg-white"
                        onClick={() => setOpen(false)}
                      >
                        <span className="block text-[13px] font-semibold text-[color:var(--bs-ink)]">{item.label}</span>
                        <span className="mt-0.5 block text-[10px] leading-snug text-slate-500 line-clamp-2">{item.tagline}</span>
                      </Link>
                    ))
                  )}
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <Link
                    href="/#build-your-plan"
                    className="rounded-xl bg-[color:var(--bs-ink)] px-3 py-3 text-center text-sm font-semibold text-white"
                    onClick={() => setOpen(false)}
                  >
                    Build your plan
                  </Link>
                  <Link
                    href="/#modules"
                    className="rounded-xl px-3 py-2.5 text-center text-sm font-medium text-slate-600"
                    onClick={() => setOpen(false)}
                  >
                    Browse all apps
                  </Link>
                </div>
              </div>

              <div className="border-t border-[color:var(--bs-line)] pt-3">
                <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Company</p>
                <div className="mt-1 flex flex-col">
                  {primaryNav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-xl px-3 py-3 text-sm font-medium text-[color:var(--bs-ink)]"
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  {menus.map((menu) => {
                    const firstPage = listPages(menu.id)[0];
                    const href = firstPage ? `/site/${menu.slug}/${firstPage.slug}` : `/site/${menu.slug}`;
                    return (
                      <Link key={menu.id} href={href} className="rounded-xl px-3 py-3 text-sm font-medium" onClick={() => setOpen(false)}>
                        {menu.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-[color:var(--bs-line)] pt-3 sm:flex-row">
                <MktCta href="/login" variant="secondary" className="w-full">
                  <LogIn className="size-4" /> Sign in
                </MktCta>
                <MktCta href="/signup" className="w-full">
                  Create your company
                </MktCta>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <main className="pb-[env(safe-area-inset-bottom)]">{children}</main>

      <footer className="border-t border-[color:var(--bs-line)] bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-4 md:px-6">
          <div className="md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <BrandMark />
              <span className="text-[15px] font-semibold tracking-tight text-[color:var(--bs-ink)]">{brand.productName}</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-600">
              Cloud ERP for operators — CRM, sales, stock, plant, people, hospital HMS, pharmacy, and finance in one
              subscribed workspace.
            </p>
            <p className="mt-4 text-xs text-slate-400">
              {TOTAL_PAYABLE_APP_COUNT} pay-per apps · Shared SaaS, dedicated, self-hosted, or intranet
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row md:flex-col">
              <MktCta href="/signup" className="w-full sm:w-auto md:w-full">
                Create your company
              </MktCta>
              <MktCta href="/contact" variant="secondary" className="w-full sm:w-auto md:w-full">
                Talk to sales
              </MktCta>
            </div>
          </div>
          {[
            {
              title: "Product",
              links: footerProductLinks
            },
            {
              title: "Company",
              links: [
                { href: "/about", label: "About" },
                { href: "/contact", label: "Contact" },
                { href: "/site/company/careers", label: "Careers" },
                { href: "/blog", label: "Insights" }
              ]
            },
            {
              title: "Legal",
              links: [
                { href: "/privacy", label: "Privacy" },
                { href: "/terms", label: "Terms" },
                { href: "/cookies", label: "Cookies" },
                { href: "/security", label: "Security" }
              ]
            }
          ].map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--bs-ink)]">{col.title}</p>
              <div className="mt-4 flex flex-col gap-2.5 text-sm text-slate-600">
                {col.links.map((link) => (
                  <Link key={link.href + link.label} href={link.href} className="transition hover:text-[color:var(--bs-teal)]">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[color:var(--bs-line)]">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-slate-400 md:flex-row md:items-center md:justify-between md:px-6">
            <p>
              © {new Date().getFullYear()} {brand.legalName} · All rights reserved
            </p>
            <p>Card payments processed by Stripe · Tenant-isolated Postgres · Role-based access on every menu</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

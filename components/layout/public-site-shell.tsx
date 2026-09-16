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
    <div className="mkt-root min-h-[100dvh] overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-[#e6ebf1] bg-white/80 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
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
                className="rounded-full px-3.5 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-[color:var(--bs-cloud)] hover:text-[color:var(--bs-ink)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            {loggedIn ? (
              <MktCta href="/dashboard">Open workspace</MktCta>
            ) : (
              <>
                <MktCta href="/login" variant="ghost">
                  Sign in
                </MktCta>
                <MktCta href="/signup">Start free trial</MktCta>
              </>
            )}
          </div>

          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-full border border-[#e6ebf1] bg-white text-[#0a2540] lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {open ? (
          <div className="border-t border-[#e6ebf1] bg-white px-4 py-3 lg:hidden">
            <div className="flex flex-col gap-1">
              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Apps ({TOTAL_PAYABLE_APP_COUNT})</p>
              <Link href="/#modules" className="rounded-xl px-3 py-3 text-sm font-medium text-[#0a2540]" onClick={() => setOpen(false)}>
                All apps overview
              </Link>
              <Link href="/#build-your-plan" className="rounded-xl px-3 py-2.5 text-sm font-medium text-[color:var(--bs-teal)]" onClick={() => setOpen(false)}>
                Pay per app pricing
              </Link>
              {MEGA_MENU_SECTIONS.map((section) => (
                <div key={section.title}>
                  <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{section.title}</p>
                  {section.items.map((item) => (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[#0a2540]"
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ))}
              {primaryNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl px-3 py-3 text-sm font-medium text-[#0a2540]"
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
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <MktCta href="/login" variant="secondary" className="w-full">
                  <LogIn className="size-4" /> Sign in
                </MktCta>
                <MktCta href="/signup" className="w-full">
                  Start free trial
                </MktCta>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <main className="pb-[env(safe-area-inset-bottom)]">{children}</main>

      <footer className="border-t border-[#e6ebf1] bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-4 md:px-6">
          <div className="md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <BrandMark />
              <span className="text-[15px] font-semibold tracking-tight">{brand.productName}</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-[#425466]">
              Cloud ERP for operators — CRM, sales, stock, plant, people, hospital HMS, and finance in one subscribed workspace.
            </p>
            <p className="mt-4 text-xs text-slate-400">Austin, TX · Support 8a–6p ET</p>
          </div>
          {[
            {
              title: "Product",
              links: [
                { href: "/#modules", label: "All modules" },
                { href: "/product/email-engine", label: "Email Engine" },
                { href: "/product/rule-engine", label: "Rule Engine" },
                { href: "/product/crm", label: "CRM" },
                { href: "/product/sales", label: "Sales" },
                { href: "/product/hrm", label: "HRM" },
                { href: "/product/healthcare", label: "Healthcare" },
                { href: "/product/operations", label: "Operations" },
                { href: "/product/finance", label: "Finance" },
                { href: "/product/inventory", label: "Inventory" },
                { href: "/product/administration", label: "Administration" },
                { href: "/pricing", label: "Pricing" }
              ]
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
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0a2540]">{col.title}</p>
              <div className="mt-4 flex flex-col gap-2.5 text-sm text-[#425466]">
                {col.links.map((link) => (
                  <Link key={link.href + link.label} href={link.href} className="transition hover:text-[color:var(--bs-teal)]">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[#eef2f6]">
          <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-slate-400 md:px-6">
            <p>© {new Date().getFullYear()} {brand.legalName}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

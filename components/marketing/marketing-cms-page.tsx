"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Building2, Clock, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { PublicSiteShell } from "@/components/layout/public-site-shell";
import { CmsArticle, extractHeadings } from "@/components/marketing/cms-article";
import { ContactForm } from "@/components/marketing/contact-form";
import { MktCta } from "@/components/marketing/mkt-button";
import { Reveal } from "@/components/marketing/reveal";
import {
  ensureProductionSiteContent,
  getPage,
  publicPageRoutes,
  type CmsPage
} from "@/modules/cms/services/cms.store";
import { mediaUrl } from "@/lib/marketing-media";
import { useLandingMedia } from "@/components/marketing/use-landing-media";

const aboutValues = [
  {
    title: "Operators first",
    text: "We design for controllers, warehouse leads, and department managers — people who live in the numbers, not the pitch deck."
  },
  {
    title: "One system of record",
    text: "CRM, sales, procurement, inventory, operations, HRM, hospital HMS, and finance share a tenant. No nightly exports. No ‘which spreadsheet is true?’"
  },
  {
    title: "Clear commercial terms",
    text: "Four packages. USD. Monthly or annual. Activate with Stripe on this site — the same motion you expect from production SaaS."
  }
];

export function MarketingCmsPage({
  route,
  showContactForm = false,
  heroImage
}: {
  route: keyof typeof publicPageRoutes;
  showContactForm?: boolean;
  heroImage?: string;
}) {
  const media = useLandingMedia();
  const [page, setPage] = useState<CmsPage | null>(null);
  const spec = publicPageRoutes[route];

  useEffect(() => {
    ensureProductionSiteContent();
    const found = getPage(spec.menuSlug, spec.pageSlug);
    setPage(found?.page ?? null);
  }, [spec.menuSlug, spec.pageSlug]);

  if (!page) {
    return (
      <PublicSiteShell>
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <p className="mkt-display text-2xl">This page is not published yet.</p>
          <p className="mkt-muted mt-3 text-sm">Administrators can create it under Administration → Menus & Pages.</p>
          <div className="mt-6 flex justify-center">
            <MktCta href="/" variant="secondary">
              Back to home
            </MktCta>
          </div>
        </div>
      </PublicSiteShell>
    );
  }

  const layout =
    route === "about"
      ? "about"
      : route === "contact" || showContactForm
        ? "contact"
        : route === "security"
          ? "security"
          : ["privacy", "terms", "cookies"].includes(String(route))
            ? "legal"
            : "article";

  const fallbackImage =
    route === "contact" || showContactForm
      ? mediaUrl("photo.support", media)
      : route === "security"
        ? mediaUrl("photo.dashboard", media)
        : mediaUrl("photo.office", media);
  const image = heroImage ?? fallbackImage;
  const officeImage = mediaUrl("photo.office", media);
  const headings = extractHeadings(page.content);

  return (
    <PublicSiteShell>
      {layout === "about" ? <AboutLayout page={page} image={image} officeImage={officeImage} /> : null}
      {layout === "contact" ? <ContactLayout page={page} /> : null}
      {layout === "security" ? <SecurityLayout page={page} /> : null}
      {layout === "legal" ? <LegalLayout page={page} headings={headings} /> : null}
      {layout === "article" ? <ArticleLayout page={page} image={image} /> : null}
    </PublicSiteShell>
  );
}

function PageHero({
  eyebrow,
  title,
  summary
}: {
  eyebrow: string;
  title: string;
  summary: string;
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="mkt-mesh absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <Reveal>
          <p className="mkt-eyebrow">{eyebrow}</p>
          <h1 className="mkt-display mt-4 max-w-3xl text-4xl sm:text-5xl">{title}</h1>
          <p className="mkt-muted mt-5 max-w-2xl text-base leading-7 sm:text-lg">{summary}</p>
        </Reveal>
      </div>
    </section>
  );
}

function AboutLayout({ page, image, officeImage }: { page: CmsPage; image: string; officeImage: string }) {
  return (
    <>
      <PageHero eyebrow="Company" title={page.title} summary={page.summary} />
      <section className="mx-auto max-w-6xl px-4 pb-8 md:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { n: "Austin, TX", l: "U.S. headquarters" },
            { n: "4 packages", l: "Silver to Professional" },
            { n: "8a–6p ET", l: "Human support hours" }
          ].map((s) => (
            <div key={s.l} className="rounded-2xl border border-[#e6ebf1] bg-white px-5 py-6">
              <p className="text-xl font-semibold tracking-tight text-[#0a2540]">{s.n}</p>
              <p className="mt-1 text-sm text-[#425466]">{s.l}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl items-start gap-12 px-4 py-12 md:grid-cols-[1.05fr_0.95fr] md:px-6 md:py-16">
        <CmsArticle title={page.title} content={page.content} hideTitle />
        <div className="space-y-4">
          <img src={image} alt="BusinessSuite team collaboration" className="h-72 w-full rounded-[1.5rem] object-cover shadow-[0_24px_50px_rgba(10,37,64,0.12)] sm:h-96" />
          <img src={officeImage} alt="Austin office" className="hidden h-56 w-full rounded-[1.5rem] object-cover md:block" />
        </div>
      </section>
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <p className="mkt-eyebrow">How we work</p>
          <h2 className="mkt-display mt-3 text-3xl">Built like the SaaS you already trust</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {aboutValues.map((v) => (
              <article key={v.title} className="mkt-card p-6">
                <h3 className="font-semibold text-[#0a2540]">{v.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#425466]">{v.text}</p>
              </article>
            ))}
          </div>
          <div className="mt-12 flex flex-col gap-3 sm:flex-row">
            <MktCta href="/signup">
              Start your company <ArrowRight className="size-4" />
            </MktCta>
            <MktCta href="/contact" variant="secondary">
              Talk to the team
            </MktCta>
          </div>
        </div>
      </section>
    </>
  );
}

function ContactLayout({ page }: { page: CmsPage }) {
  return (
    <>
      <PageHero eyebrow="Contact" title={page.title} summary={page.summary} />
      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-20 md:grid-cols-[0.9fr_1.1fr] md:px-6">
        <div className="space-y-4">
          {[
            { icon: Mail, label: "Sales & onboarding", value: "hello@businesssuite.app" },
            { icon: Phone, label: "Phone", value: "+1 (512) 555-0148" },
            { icon: Clock, label: "Hours", value: "Monday–Friday, 8:00 a.m.–6:00 p.m. ET" },
            { icon: MapPin, label: "Headquarters", value: "500 West 2nd Street, Suite 1900, Austin, TX 78701" },
            { icon: Building2, label: "Existing customers", value: "support@businesssuite.app · billing in-app" }
          ].map((row) => (
            <div key={row.label} className="flex gap-4 rounded-2xl border border-[#e6ebf1] bg-white p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#eef0ff] text-[color:var(--bs-teal)]">
                <row.icon className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{row.label}</p>
                <p className="mt-1 text-sm font-medium leading-6 text-[#0a2540]">{row.value}</p>
              </div>
            </div>
          ))}
          <div className="pt-2 text-sm leading-7 text-[#425466]">
            <CmsArticle title={page.title} content={page.content} hideTitle />
          </div>
        </div>
        <ContactForm />
      </section>
    </>
  );
}

function SecurityLayout({ page }: { page: CmsPage }) {
  return (
    <>
      <PageHero eyebrow="Trust" title={page.title} summary={page.summary} />
      <section className="mx-auto max-w-6xl px-4 pb-8 md:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: "Tenant isolation", text: "Each company workspace is scoped by tenant identifier, access control, and audit logging." },
            { title: "Menu-level rights", text: "View, create, update, and delete — by role, with per-user exceptions Super Admin can audit." },
            { title: "Stripe on-site", text: "Card details are tokenized by Stripe Elements. We do not store full card numbers." }
          ].map((card) => (
            <article key={card.title} className="mkt-card p-6">
              <ShieldCheck className="size-5 text-[color:var(--bs-teal)]" />
              <h2 className="mt-4 font-semibold text-[#0a2540]">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#425466]">{card.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
        <CmsArticle title={page.title} content={page.content} hideTitle />
        <div className="mt-10">
          <MktCta href="/contact" variant="secondary">
            Report a concern
          </MktCta>
        </div>
      </section>
    </>
  );
}

function LegalLayout({ page, headings }: { page: CmsPage; headings: { id: string; label: string }[] }) {
  return (
    <>
      <PageHero eyebrow="Legal" title={page.title} summary={page.summary} />
      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-20 md:grid-cols-[220px_minmax(0,42rem)] md:px-6">
        {headings.length > 0 ? (
          <aside className="hidden md:block">
            <div className="sticky top-24 rounded-2xl border border-[#e6ebf1] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">On this page</p>
              <nav className="mt-3 flex flex-col gap-2 text-sm text-[#425466]">
                {headings.map((h) => (
                  <a key={h.id} href={`#${h.id}`} className="hover:text-[color:var(--bs-teal)]">
                    {h.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        ) : (
          <div className="hidden md:block" />
        )}
        <div className="rounded-[1.5rem] border border-[#e6ebf1] bg-white p-6 sm:p-10">
          <CmsArticle title={page.title} content={page.content} hideTitle />
        </div>
      </section>
    </>
  );
}

function ArticleLayout({ page, image }: { page: CmsPage; image: string }) {
  return (
    <>
      <PageHero eyebrow="BusinessSuite" title={page.title} summary={page.summary} />
      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-20 md:grid-cols-[1fr_0.85fr] md:px-6">
        <div className="rounded-[1.5rem] border border-[#e6ebf1] bg-white p-6 sm:p-10">
          <CmsArticle title={page.title} content={page.content} hideTitle />
        </div>
        <div className="hidden md:block">
          <img src={image} alt="" className="h-80 w-full rounded-[1.5rem] object-cover shadow-[0_24px_50px_rgba(10,37,64,0.12)]" />
          <div className="mt-6">
            <MktCta href="/signup">
              Start free trial <ArrowRight className="size-4" />
            </MktCta>
          </div>
        </div>
      </section>
    </>
  );
}

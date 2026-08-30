"use client";

import { Plus } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";

const faqs = [
  {
    q: "Can we host BusinessSuite ourselves?",
    a: "Yes. Beyond our shared cloud, we offer dedicated cloud/VPS deployments, licensed self-hosting with your own hosting company, and fully offline intranet installations. Self-hosted and intranet deployments include a commercial license, guided installation, and upgrade support — talk to sales to scope yours."
  },
  {
    q: "What does the intranet deployment mean exactly?",
    a: "The full ERP runs inside your building or private network with no internet dependency — common for factories, hospitals, and secure facilities. It's available alongside any package tier."
  },
  {
    q: "Which apps are included?",
    a: "Fifteen pay-per apps: Dashboard, CRM, Sales, Procurement, Inventory, Operations (BOM, work orders, maintenance), HRM & payroll, Hospital HMS (OPD, pharmacy, lab, wards), Projects, Documents, Finance, Reports/BI, Administration, plus platform apps Email Engine (compose, HTML templates) and Rule Engine (automations). Package tiers set your base bundle; add extra apps à la carte. Rule Engine requires Email Engine."
  },
  {
    q: "How does pay per app work?",
    a: "Pick a base package (Silver, Gold, Platinum, or Professional), then add only the business modules and platform engines you need. Licensed apps appear in the sidebar and mega menu; role rights control what each user can do inside those apps."
  },
  {
    q: "How does access control work?",
    a: "Every menu registers view / create / update / delete rights. You assign role-level defaults (e.g. accountant, HR manager) and can override per user. Effective rights are the merge of both — the user override wins."
  },
  {
    q: "Can each company customize forms?",
    a: "Yes — every tenant can add extra fields to fixed module forms (text, number, date, select) without a developer. Field answers are stored per record and appear on lists and printouts."
  },
  {
    q: "Is our data isolated from other customers?",
    a: "On shared SaaS, every row is tenant-scoped in Postgres with row-level isolation. Dedicated, self-hosted, and intranet deployments give you a completely separate database and stack."
  },
  {
    q: "Does it work on phones?",
    a: "Every screen is responsive down to phone width, and the same codebase is Capacitor-ready for native mobile shells. Tables scroll inside cards; forms stack; touch targets meet accessibility sizes."
  },
  {
    q: "Can we start on cloud and move to self-hosted later?",
    a: "Yes. Your data and configuration are portable across deployment models. Many customers start on shared SaaS and migrate to a dedicated or self-hosted stack as they scale."
  }
];

export function LandingFaq() {
  return (
    <section id="faq" className="bg-white">
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
        <Reveal className="text-center">
          <p className="mkt-eyebrow">Questions</p>
          <h2 className="mkt-display mt-3 text-3xl text-[color:var(--bs-ink)] sm:text-4xl">
            Everything buyers ask before the demo
          </h2>
        </Reveal>
        <div className="mt-10 space-y-3">
          {faqs.map((item, i) => (
            <Reveal key={item.q} delay={i * 40}>
              <details className="mkt-faq-item">
                <summary>
                  {item.q}
                  <Plus className="mkt-faq-chevron size-4" aria-hidden />
                </summary>
                <p className="px-5 pb-5 text-sm leading-7 text-slate-600">{item.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

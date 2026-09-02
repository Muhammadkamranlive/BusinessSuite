"use client";

import Link from "next/link";
import { Bell, CalendarClock, Mail, ShieldCheck, Workflow, Zap } from "lucide-react";
import { LaptopFrame } from "@/components/marketing/screenshot-frame";
import { MktCta } from "@/components/marketing/mkt-button";
import { Reveal } from "@/components/marketing/reveal";
import { erpScreenshots } from "@/lib/marketing-media";

const capabilities = [
  {
    icon: Workflow,
    title: "When → Then rules",
    body: "Pick a business event (login, lead assigned, invoice overdue, low stock). Add conditions. Fire in-app alerts, emails, tasks, or approval chains."
  },
  {
    icon: Mail,
    title: "Email with real templates",
    body: "Every Send email action picks from your Email Engine template library — sign-in alerts, leave requests, branded HTML layouts. Edit title and message per rule."
  },
  {
    icon: Bell,
    title: "In-app notifications",
    body: "Bell icon alerts for the right user — {{user_email}}, assignee, or a custom address. Same engine across all licensed business apps."
  },
  {
    icon: CalendarClock,
    title: "Schedules & cron",
    body: "Daily digests, weekly executive ticks, overdue sweeps. Schedules emit events your rules listen for."
  },
  {
    icon: ShieldCheck,
    title: "Approvals & audit",
    body: "Multi-step approval chains, event log with replay, and action results — see exactly which rule sent which email."
  },
  {
    icon: Zap,
    title: "Per-module consoles",
    body: "CRM, Sales, HRM, Finance… each module has its own Rule Engine tab plus a company-wide hub under Administration."
  }
];

export function RuleEngineShowcase() {
  return (
    <section id="rule-engine" className="border-t border-[color:var(--bs-line)] bg-[color:var(--bs-cloud)]">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="mkt-eyebrow">Rule Engine</p>
          <h2 className="mkt-display mt-3 text-3xl text-[color:var(--bs-ink)] sm:text-4xl">
            Automate tasks your team actually needs — no code
          </h2>
          <p className="mkt-muted mt-4 text-[15px] leading-7">
            Define rules once, run everywhere. Notify customers on overdue invoices, email HR on leave requests,
            alert buyers on low stock, or send a sign-in alert to any address. Rule Engine is a pay-per platform app
            and requires Email Engine for send-email actions. Gold and above include Email Engine in the base bundle.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <MktCta href="/product/rule-engine">See Rule Engine details</MktCta>
            <MktCta href="/product/email-engine" variant="secondary">
              Email Engine & templates
            </MktCta>
          </div>
        </Reveal>

        <Reveal delay={80} className="mx-auto mt-10 max-w-4xl">
          <LaptopFrame
            src={erpScreenshots.crmWorkflow}
            alt="Rule Engine and process flow — when→then automations across CRM, sales, HRM, and finance"
            hero
          />
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((cap, i) => {
            const Icon = cap.icon;
            return (
              <Reveal key={cap.title} delay={i * 50}>
                <div className="mkt-card h-full p-5">
                  <span className="mkt-bento-icon">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[17px] font-semibold text-[color:var(--bs-ink)]">{cap.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{cap.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={120} className="mt-10 rounded-[1.25rem] border border-[color:var(--bs-line)] bg-white p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--bs-teal)]">Example rule</p>
              <h3 className="mt-2 text-xl font-semibold text-[color:var(--bs-ink)]">When user signs in → email + task</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>· Event: <code className="text-xs">auth.login</code></li>
                <li>· Email To: <code className="text-xs">{"{{user_email}}, ops@company.com"}</code></li>
                <li>· Template: Sign-in alert</li>
                <li>· Task: Review post-login checklist</li>
              </ul>
            </div>
            <p className="text-sm leading-7 text-slate-600">
              Rules sync to your database — not stuck in one browser. Change the recipient, pick a different template,
              test with one click, and replay from the event log.{" "}
              <Link href="/pricing#build-your-plan" className="font-semibold text-[color:var(--bs-teal)] hover:underline">
                Pick your apps
              </Link>{" "}
              with pay-per-app pricing, then automate on top.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

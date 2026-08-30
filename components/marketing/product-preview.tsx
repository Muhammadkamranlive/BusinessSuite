"use client";

import { useProductBrand } from "@/components/common/use-product-brand";

function DesktopErp() {
  const brand = useProductBrand();
  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-white/70 bg-[color:var(--bs-ink)] shadow-[0_40px_80px_color-mix(in_srgb,var(--bs-ink)_28%,transparent)]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 truncate text-[11px] font-medium text-white/50">{brand.productName} · Northwind Distribution</span>
      </div>
      <div className="grid grid-cols-[5.5rem_1fr] sm:grid-cols-[9.25rem_1fr]">
        <aside className="space-y-1 bg-[color:color-mix(in_srgb,var(--bs-ink)_92%,black)] p-3 text-[11px] font-medium text-white/55">
          {["Home", "CRM", "Sales", "Inventory", "People", "Finance"].map((item, i) => (
            <div
              key={item}
              className={`rounded-lg px-2.5 py-1.5 ${i === 0 ? "bg-[color:var(--bs-teal)] text-white" : ""}`}
            >
              {item}
            </div>
          ))}
        </aside>
        <div className="space-y-3 bg-[color:var(--bs-cloud)] p-3 sm:p-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { l: "Revenue MTD", v: "$428k", d: "+18.2%" },
              { l: "Payroll", v: "$176k", d: "On cycle" },
              { l: "Low stock", v: "9 SKUs", d: "Reorder" }
            ].map((k) => (
              <div key={k.l} className="rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-[color:var(--bs-line)] sm:p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{k.l}</p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--bs-ink)] sm:text-lg">{k.v}</p>
                <p className="text-[10px] text-[color:var(--bs-teal)]">{k.d}</p>
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-[color:var(--bs-line)]">
            <div className="flex items-center justify-between border-b border-[color:var(--bs-line)] px-3 py-2.5">
              <span className="text-[11px] font-semibold text-[color:var(--bs-ink)]">Pipeline this week</span>
              <span className="rounded-full bg-[color:color-mix(in_srgb,var(--bs-teal)_12%,white)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--bs-teal)]">
                Live
              </span>
            </div>
            <div className="space-y-2 p-3">
              {[
                { n: "Eastern Retail Group", a: "$125,000", s: "Proposal" },
                { n: "BlueLine Clinics", a: "$94,000", s: "Negotiation" },
                { n: "Pacific Foods Co.", a: "$61,400", s: "Qualified" }
              ].map((row) => (
                <div key={row.n} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate font-medium text-[color:var(--bs-ink)]">{row.n}</span>
                  <span className="shrink-0 tabular-nums text-slate-500">{row.a}</span>
                  <span className="hidden shrink-0 rounded-full bg-[color:var(--bs-cloud)] px-2 py-0.5 font-medium text-slate-600 sm:inline">
                    {row.s}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileErp() {
  const brand = useProductBrand();
  return (
    <div className="mkt-phone mkt-float">
      <div className="mkt-phone-notch" />
      <div className="px-3 pb-4 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[color:var(--bs-ink)]">{brand.productName}</span>
          <span className="rounded-md bg-[color:var(--bs-ink)] px-1.5 py-0.5 text-[9px] font-semibold text-white">Menu</span>
        </div>
        <p className="mt-3 text-[10px] font-medium text-slate-400">Today</p>
        <p className="text-lg font-semibold tracking-tight text-[color:var(--bs-ink)]">$428,000</p>
        <p className="text-[10px] text-[color:var(--bs-teal)]">Revenue this month</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { l: "Open invoices", v: "12" },
            { l: "Leave today", v: "3" },
            { l: "Low stock", v: "9" },
            { l: "Deals", v: "7" }
          ].map((k) => (
            <div key={k.l} className="rounded-xl bg-[color:var(--bs-cloud)] p-2">
              <p className="text-[9px] text-slate-400">{k.l}</p>
              <p className="text-sm font-semibold text-[color:var(--bs-ink)]">{k.v}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-[color:var(--bs-line)] p-2.5">
          <p className="text-[10px] font-semibold text-[color:var(--bs-ink)]">Approvals</p>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">2 purchase orders · 1 leave request</p>
        </div>
      </div>
    </div>
  );
}

export function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div className="mkt-float-slow pointer-events-none absolute -left-4 -top-7 z-10 hidden rounded-2xl border border-white/80 bg-white/95 px-4 py-3 shadow-soft backdrop-blur lg:block">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Open invoices</p>
        <p className="text-lg font-semibold text-[color:var(--bs-ink)]">$96,420</p>
        <p className="text-xs text-[color:var(--bs-teal)]">12 invoices · on track</p>
      </div>

      <div className="flex flex-col items-center gap-8 lg:block">
        <DesktopErp />
        <div className="lg:absolute lg:-bottom-8 lg:-right-2 xl:-right-8">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 lg:hidden">
            Same workspace on the phone
          </p>
          <MobileErp />
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  Boxes,
  Building2,
  Factory,
  HeartPulse,
  Pill,
  ShoppingCart,
  Stethoscope,
  Truck,
  Warehouse,
  Wrench
} from "lucide-react";

const industries = [
  { icon: Building2, label: "Wholesale distribution" },
  { icon: Pill, label: "Pharmacy supply" },
  { icon: Truck, label: "Auto parts trading" },
  { icon: Factory, label: "Textile manufacturing" },
  { icon: Stethoscope, label: "Hospitals & clinics" },
  { icon: Warehouse, label: "Multi-warehouse retail" },
  { icon: Wrench, label: "Plant maintenance" },
  { icon: ShoppingCart, label: "B2B commerce" },
  { icon: HeartPulse, label: "Healthcare networks" },
  { icon: Boxes, label: "3PL & fulfilment" }
];

export function TrustStrip() {
  const loop = [...industries, ...industries];
  return (
    <section className="border-y border-[color:var(--bs-line)] bg-white py-6" aria-label="Industries BusinessSuite serves">
      <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        Built for real operating companies
      </p>
      <div className="mkt-marquee">
        <div className="mkt-marquee-track">
          {loop.map((item, i) => {
            const Icon = item.icon;
            return (
              <span key={`${item.label}-${i}`} className="mkt-trust-chip">
                <Icon className="size-4 text-[color:var(--bs-teal)]" aria-hidden />
                {item.label}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

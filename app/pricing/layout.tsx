import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — packages & pay per app",
  description:
    "Transparent USD pricing. Silver, Gold, Platinum on shared SaaS; Professional on your own database, domain, and stack. Add CRM, HRM, Healthcare HMS, Pharmacy, Email Engine, or Rule Engine à la carte."
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}

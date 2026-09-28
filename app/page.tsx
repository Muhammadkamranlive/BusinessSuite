import type { Metadata } from "next";
import { LandingHome } from "@/components/marketing/landing-home";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "BusinessSuite ERP Cloud — CRM, Stock, People, Clinic, Pharmacy & Finance in one login" },
  description:
    "Cloud ERP for growing companies. CRM, sales, procurement, inventory, operations, HRM, hospital HMS, finance, and BI. Professional adds a separate database, domain, and stack."
};

export default function HomePage() {
  return <LandingHome />;
}

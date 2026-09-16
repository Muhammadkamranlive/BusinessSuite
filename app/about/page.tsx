import type { Metadata } from "next";
import { MarketingCmsPage } from "@/components/marketing/marketing-cms-page";

export const metadata: Metadata = {
  title: "About | BusinessSuite ERP Cloud",
  description: "BusinessSuite ERP Cloud — operators-first ERP for growing U.S. companies."
};

export default function AboutPage() {
  return <MarketingCmsPage route="about" />;
}

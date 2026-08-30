import type { Metadata } from "next";
import { MarketingCmsPage } from "@/components/marketing/marketing-cms-page";

export const metadata: Metadata = {
  title: "Terms of service | BusinessSuite",
  description: "The agreement that governs your use of BusinessSuite ERP Cloud."
};

export default function TermsPage() {
  return <MarketingCmsPage route="terms" />;
}

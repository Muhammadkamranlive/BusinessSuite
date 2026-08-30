import type { Metadata } from "next";
import { MarketingCmsPage } from "@/components/marketing/marketing-cms-page";

export const metadata: Metadata = {
  title: "Privacy policy | BusinessSuite",
  description: "How BusinessSuite, Inc. collects, uses, and protects personal information."
};

export default function PrivacyPage() {
  return <MarketingCmsPage route="privacy" />;
}

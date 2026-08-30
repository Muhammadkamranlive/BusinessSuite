import type { Metadata } from "next";
import { MarketingCmsPage } from "@/components/marketing/marketing-cms-page";

export const metadata: Metadata = {
  title: "Cookie policy | BusinessSuite",
  description: "Cookies and similar technologies used on the BusinessSuite website and product."
};

export default function CookiesPage() {
  return <MarketingCmsPage route="cookies" />;
}

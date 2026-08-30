import type { Metadata } from "next";
import { MarketingCmsPage } from "@/components/marketing/marketing-cms-page";
import { marketingPhotos } from "@/lib/marketing-media";

export const metadata: Metadata = {
  title: "Security | BusinessSuite ERP Cloud",
  description: "Tenant isolation, menu-level access control, Stripe Elements payments, and responsible disclosure."
};

export default function SecurityPage() {
  return <MarketingCmsPage route="security" heroImage={marketingPhotos.dashboard} />;
}

import type { Metadata } from "next";
import { MarketingCmsPage } from "@/components/marketing/marketing-cms-page";
import { marketingPhotos } from "@/lib/marketing-media";

export const metadata: Metadata = {
  title: "About us | BusinessSuite ERP Cloud",
  description: "BusinessSuite is the cloud ERP for operators who have outgrown disconnected tools — including hospitals and plants."
};

export default function AboutPage() {
  return <MarketingCmsPage route="about" heroImage={marketingPhotos.collaboration} />;
}

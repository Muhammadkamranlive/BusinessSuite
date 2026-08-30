import type { Metadata } from "next";
import { MarketingCmsPage } from "@/components/marketing/marketing-cms-page";
import { marketingPhotos } from "@/lib/marketing-media";

export const metadata: Metadata = {
  title: "Contact us | BusinessSuite ERP Cloud",
  description: "Talk with BusinessSuite sales and onboarding. Austin headquarters. Support Monday–Friday, 8 a.m.–6 p.m. ET."
};

export default function ContactPage() {
  return <MarketingCmsPage route="contact" showContactForm heroImage={marketingPhotos.support} />;
}

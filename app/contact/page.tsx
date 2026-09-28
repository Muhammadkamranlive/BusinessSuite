import type { Metadata } from "next";
import { MarketingCmsPage } from "@/components/marketing/marketing-cms-page";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Talk with BusinessSuite sales and onboarding — demos, dedicated or self-hosted deployments, Professional scoping. Replies within one business day."
};

export default function ContactPage() {
  return <MarketingCmsPage route="contact" showContactForm />;
}

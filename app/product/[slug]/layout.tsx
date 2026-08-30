import type { Metadata } from "next";
import { getProductModule, productModules } from "@/lib/product-modules";

export function generateStaticParams() {
  return productModules.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const module = getProductModule(slug);
  if (!module) {
    return { title: "Module" };
  }
  return {
    title: `${module.title} | BusinessSuite ERP Cloud`,
    description: module.summary
  };
}

export default function ProductSlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}

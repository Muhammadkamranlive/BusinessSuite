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
    title: `${module.title} — ${module.eyebrow}`,
    description: module.summary,
    openGraph: {
      title: `${module.title} — ${module.eyebrow}`,
      description: module.summary,
      images: [{ url: module.image, alt: module.heroCaption }]
    }
  };
}

export default function ProductSlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}

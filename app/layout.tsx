import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ProductBrandProvider } from "@/components/common/use-product-brand";
import { AppNavigation } from "@/components/navigation/app-navigation";
import { readProductBrandFile } from "@/lib/product/product-file";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans"
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mkt"
});

function siteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  try {
    return new URL(raw && raw.length > 0 ? raw : "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const brand = await readProductBrandFile();
  const full = `${brand.productName} ${brand.productTagline}`.trim();
  const description =
    "Cloud ERP for growing companies — CRM, sales, procurement, inventory, operations, HRM, hospital HMS, pharmacy, finance, and BI in one subscribed workspace.";
  return {
    metadataBase: siteUrl(),
    title: {
      default: full,
      template: `%s | ${brand.productName}`
    },
    description,
    applicationName: full,
    openGraph: {
      type: "website",
      siteName: brand.productName,
      title: full,
      description,
      images: [{ url: "/marketing/cinematic/erp-commercial-hero.png", width: 1600, height: 1000, alt: full }]
    },
    twitter: {
      card: "summary_large_image",
      title: full,
      description,
      images: ["/marketing/cinematic/erp-commercial-hero.png"]
    },
    icons: {
      icon: "/icon.svg"
    },
    appleWebApp: {
      capable: true,
      title: full,
      statusBarStyle: "default"
    },
    formatDetection: {
      telephone: false
    }
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#1877f2"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const brand = await readProductBrandFile();
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ProductBrandProvider initial={brand}>
          <AppNavigation>{children}</AppNavigation>
        </ProductBrandProvider>
      </body>
    </html>
  );
}

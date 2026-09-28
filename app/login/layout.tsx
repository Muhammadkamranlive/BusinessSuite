import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your company workspace — CRM, sales, inventory, HRM, hospital HMS, pharmacy, and finance behind one login.",
  robots: { index: false, follow: true }
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}

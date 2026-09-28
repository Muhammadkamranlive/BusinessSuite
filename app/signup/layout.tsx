import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create your company",
  description:
    "Create your company workspace in minutes. Pick a package, choose your pay-per apps, pay securely with Stripe, and invite your team."
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}

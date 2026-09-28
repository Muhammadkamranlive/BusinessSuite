import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Insights — operating notes for growing companies",
  description:
    "Practical writing on running a growing company with one ERP — sales, procurement, stock, people, hospital HMS, and finance."
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}

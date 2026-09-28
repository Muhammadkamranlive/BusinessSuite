"use client";

import { PharmacyShell } from "@/components/pharmacy/pharmacy-shell";
import { Panel } from "@/components/ui";
import Link from "next/link";

export default function PharmacyPurchasesPage() {
  return (
    <PharmacyShell title="Purchases" description="Receive supplier stock into batches.">
      <Panel className="border border-line bg-white p-4 sm:p-5">
        <p className="text-sm leading-6 text-slate-600">
          For now, receive stock on{" "}
          <Link href="/pharmacy/inventory" className="font-semibold text-teal underline">
            Inventory & batches
          </Link>{" "}
          (Add batch). Full supplier PO → GRN flow is the next slice.
        </p>
      </Panel>
    </PharmacyShell>
  );
}

"use client";

import { PharmacyShell } from "@/components/pharmacy/pharmacy-shell";
import { Panel } from "@/components/ui";
import Link from "next/link";

export default function PharmacySuppliersPage() {
  return (
    <PharmacyShell title="Suppliers" description="Wholesale contacts — coming with purchase orders.">
      <Panel className="border border-line bg-white p-4 sm:p-5">
        <p className="text-sm leading-6 text-slate-600">
          Use <Link href="/pharmacy/inventory" className="font-semibold text-teal underline">Inventory</Link> to
          receive batches today. Supplier master will attach to POs next.
        </p>
      </Panel>
    </PharmacyShell>
  );
}

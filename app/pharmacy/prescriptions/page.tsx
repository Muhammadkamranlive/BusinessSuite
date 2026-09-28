"use client";

import { PharmacyShell } from "@/components/pharmacy/pharmacy-shell";
import { Panel } from "@/components/ui";
import Link from "next/link";

export default function PharmacyPrescriptionsPage() {
  return (
    <PharmacyShell title="Prescriptions" description="Optional Rx note when selling Rx-only medicines from POS.">
      <Panel className="border border-line bg-white p-4 sm:p-5">
        <p className="text-sm leading-6 text-slate-600">
          For medical shops, most sales happen on the <Link className="font-semibold text-teal underline" href="/pharmacy/pos">POS</Link>.
          Mark products as “Requires prescription” in Products; the cashier can note the Rx on the customer or sale remarks.
          A dedicated Rx queue UI can be added later if you need refill tracking.
        </p>
      </Panel>
    </PharmacyShell>
  );
}

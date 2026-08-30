"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { Button, Panel } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { listLowStock, getProductStock } from "@/modules/inventory/services/inventory.store";
import { createRequisitionFromLowStock } from "@/modules/purchase/services/purchase.store";
import { useRouter } from "next/navigation";

export default function LowStockPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const items = useMemo(() => listLowStock(tenantId), [tenantId]);
  const router = useRouter();

  return (
    <AppShell activeModule="inventory">
      <ModuleBreadcrumbs />
      <PageHeader title="Low Stock Alerts" description="Products below reorder level. Create a purchase requisition for the shortage." />
      <Panel>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">All products are above reorder level.</p>
        ) : (
          <>
            <div className="mb-3">
              <Button
                type="button"
                onClick={() => {
                  try {
                    createRequisitionFromLowStock(tenantId, "Stores");
                    router.push("/purchases/requisitions");
                  } catch (e) {
                    window.alert(e instanceof Error ? e.message : "Could not create requisition.");
                  }
                }}
              >
                Create purchase requisition
              </Button>
            </div>
            <ul className="space-y-2">
            {items.map((p) => (
              <li key={p.id} className="flex justify-between rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                <span className="font-semibold text-ink">{p.name} ({p.sku})</span>
                <span className="text-amber-700">Stock: {getProductStock(p.id, tenantId)} / Reorder: {p.reorder_level}</span>
              </li>
            ))}
            </ul>
          </>
        )}
      </Panel>
    </AppShell>
  );
}

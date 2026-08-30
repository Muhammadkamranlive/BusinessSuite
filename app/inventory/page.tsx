"use client";

import { useMemo } from "react";
import { AlertTriangle, Boxes, Factory, PackagePlus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { ModuleStartGuide } from "@/components/guides/module-start-guide";
import { Badge, Button, DataTable, Panel, SectionHeader, StatTile } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import {
  getProductStock,
  listLowStock,
  listProducts,
  listStockMovements,
  listWarehouses
} from "@/modules/inventory/services/inventory.store";

export default function InventoryPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const products = useMemo(() => listProducts(tenantId), [tenantId]);
  const warehouses = useMemo(() => listWarehouses(tenantId), [tenantId]);
  const movements = useMemo(() => listStockMovements(tenantId), [tenantId]);
  const lowStock = useMemo(() => listLowStock(tenantId), [tenantId]);

  return (
    <AppShell activeModule="inventory">
      <ModuleBreadcrumbs />
      <ModuleStartGuide module="inventory" />
      <div className="grid gap-4 md:grid-cols-4">
        <StatTile label="Products" value={String(products.length)} detail="Active SKUs" icon={Boxes} tone="teal" />
        <StatTile label="Warehouses" value={String(warehouses.length)} detail="Stock locations" icon={Factory} tone="coral" />
        <StatTile label="Low stock" value={String(lowStock.length)} detail="Needs replenishment" icon={AlertTriangle} tone="amber" />
        <StatTile label="Movements" value={String(movements.length)} detail="Ledger rows" icon={PackagePlus} tone="mint" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel>
          <SectionHeader
            title="Stock actions"
            eyebrow="Warehouse"
            action={
              <Button href="/inventory/movements">
                <PackagePlus className="size-4" /> Post movement
              </Button>
            }
          />
          <div className="mb-3 flex flex-wrap gap-2">
            <Button href="/inventory/products" variant="secondary">Add product</Button>
            <Button href="/inventory/warehouses" variant="secondary">Add warehouse</Button>
            <Button href="/inventory/low-stock" variant="secondary">Low stock</Button>
            <Button href="/inventory/uom" variant="secondary">Units of measure</Button>
            <Button href="/inventory/batches" variant="secondary">Batches</Button>
            <Button href="/inventory/bins" variant="secondary">Bins</Button>
          </div>
          <DataTable
            columns={["Date", "Product", "Type", "Qty"]}
            rows={movements.slice(0, 8).map((m) => [
              m.movement_date,
              products.find((p) => p.id === m.product_id)?.name ?? "—",
              m.movement_type.replace(/_/g, " "),
              m.quantity > 0 ? `+${m.quantity}` : String(m.quantity)
            ])}
          />
        </Panel>
        <Panel>
          <SectionHeader title="Low stock alerts" eyebrow="Reorder" />
          <div className="grid gap-3">
            {lowStock.length === 0 ? <p className="text-sm text-slate-500">No low-stock items.</p> : null}
            {lowStock.map((product) => {
              const stock = getProductStock(product.id, tenantId);
              return (
                <div key={product.id} className="rounded-md border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-ink">{product.name}</p>
                      <p className="text-sm text-amber-700">{product.sku}</p>
                    </div>
                    <Badge tone="warning">
                      {stock}/{product.reorder_level}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

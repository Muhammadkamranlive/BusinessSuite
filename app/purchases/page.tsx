"use client";

import { useMemo } from "react";
import { CheckCircle2, ClipboardCheck, PackageCheck, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { ModuleStartGuide } from "@/components/guides/module-start-guide";
import { Badge, Button, DataTable, Panel, SectionHeader, StatTile } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { money } from "@/lib/utils";
import { listPurchaseOrders, listSuppliers } from "@/modules/purchase/services/purchase.store";

export default function PurchasesPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const orders = useMemo(() => listPurchaseOrders(tenantId), [tenantId]);
  const suppliers = useMemo(() => listSuppliers(tenantId), [tenantId]);
  const openPos = orders.filter((o) => o.status !== "cancelled" && o.status !== "received");

  return (
    <AppShell activeModule="purchases">
      <ModuleBreadcrumbs />
      <ModuleStartGuide module="purchases" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatTile label="Purchase orders" value={String(orders.length)} detail={`${openPos.length} open`} icon={ClipboardCheck} tone="teal" />
        <StatTile label="Suppliers" value={String(suppliers.length)} detail="Vendor directory" icon={PackageCheck} tone="coral" />
        <StatTile
          label="Open pipeline"
          value={money(openPos.reduce((s, o) => s + o.total_amount, 0))}
          detail="Not yet received"
          icon={CheckCircle2}
          tone="amber"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <Panel>
          <SectionHeader
            title="Purchase orders"
            eyebrow="Procurement"
            action={
              <Button href="/purchases/orders">
                <Plus className="size-4" /> New PO
              </Button>
            }
          />
          <DataTable
            columns={["PO", "Supplier", "Status", "Amount", "ETA"]}
            rows={orders.map((po) => [
              po.purchase_order_no,
              po.supplier_name,
              <Badge key={po.id} tone={po.status === "approved" || po.status === "received" ? "success" : po.status === "draft" ? "neutral" : "warning"}>
                {po.status}
              </Badge>,
              money(po.total_amount),
              po.expected_delivery_date
            ])}
          />
        </Panel>
        <Panel>
          <SectionHeader
            title="Suppliers"
            eyebrow="Vendors"
            action={
              <Button href="/purchases/suppliers" variant="secondary">Add supplier</Button>
            }
          />
          <div className="mb-3">
            <Button href="/purchases/debit-notes" variant="secondary">Debit notes</Button>
          </div>
          <div className="grid gap-3">
            {suppliers.map((s) => (
              <div key={s.id} className="rounded-md border border-line bg-cloud p-3">
                <p className="font-bold text-ink">{s.name}</p>
                <p className="text-sm text-slate-500">
                  {s.contact_person} · {s.email || s.phone || "—"}
                </p>
              </div>
            ))}
            {suppliers.length === 0 ? <p className="text-sm text-slate-500">No suppliers yet — add one to create POs.</p> : null}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

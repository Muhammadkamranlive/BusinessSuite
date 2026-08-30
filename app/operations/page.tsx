"use client";

import { useMemo } from "react";
import { Cog, ClipboardList, Factory, Wrench } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { ModuleStartGuide } from "@/components/guides/module-start-guide";
import { ActionCard, Panel, SectionHeader, StatTile } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { catalogHref, catalogSpecsForModule } from "@/modules/catalog/catalog-registry";
import { listCatalog } from "@/modules/catalog/services/catalog.store";

export default function OperationsHomePage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const specs = catalogSpecsForModule("operations");
  const workOrders = useMemo(() => listCatalog("operations.work_orders", tenantId), [tenantId]);
  const maintenance = useMemo(() => listCatalog("operations.maintenance", tenantId), [tenantId]);
  const inspections = useMemo(() => listCatalog("operations.inspections", tenantId), [tenantId]);

  return (
    <AppShell activeModule="operations">
      <ModuleBreadcrumbs />
      <ModuleStartGuide module="operations" />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatTile label="Work orders" value={String(workOrders.length)} detail="Manufacturing / assembly" icon={Factory} tone="teal" />
        <StatTile label="Maintenance" value={String(maintenance.length)} detail="Preventive and breakdown" icon={Wrench} tone="amber" />
        <StatTile label="Inspections" value={String(inspections.length)} detail="Incoming / in-process / outgoing" icon={ClipboardList} tone="mint" />
      </div>
      <Panel>
        <SectionHeader title="Operations catalogs" eyebrow="Manufacturing, maintenance, quality, contracts" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {specs.map((spec) => (
            <ActionCard
              key={spec.slug}
              href={catalogHref(spec.slug)}
              title={spec.title}
              detail={spec.description}
              icon={Cog}
            />
          ))}
        </div>
      </Panel>
    </AppShell>
  );
}

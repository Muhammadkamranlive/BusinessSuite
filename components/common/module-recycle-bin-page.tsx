"use client";

import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { RecycleBinPanel } from "@/components/common/recycle-bin-panel";
import { getStoredTenantId } from "@/lib/auth/session";
import type { ModuleKey } from "@/lib/permissions";

const MODULE_META: Record<
  string,
  { activeModule: ModuleKey; trashModule: string; title: string }
> = {
  crm: { activeModule: "crm", trashModule: "crm", title: "CRM recycle bin" },
  sales: { activeModule: "sales", trashModule: "sales", title: "Sales recycle bin" },
  purchases: { activeModule: "purchases", trashModule: "purchases", title: "Purchases recycle bin" },
  inventory: { activeModule: "inventory", trashModule: "inventory", title: "Inventory recycle bin" },
  hrm: { activeModule: "hrm", trashModule: "hrm", title: "HRM recycle bin" },
  finance: { activeModule: "finance", trashModule: "finance", title: "Finance recycle bin" },
  projects: { activeModule: "projects", trashModule: "projects", title: "Projects recycle bin" },
  operations: { activeModule: "operations", trashModule: "operations", title: "Operations recycle bin" },
  healthcare: { activeModule: "healthcare", trashModule: "healthcare", title: "Healthcare recycle bin" }
};

export function ModuleRecycleBinPage({ moduleSlug }: { moduleSlug: keyof typeof MODULE_META }) {
  const meta = MODULE_META[moduleSlug];
  const tenantId = getStoredTenantId() ?? "alpha";

  return (
    <AppShell activeModule={meta.activeModule}>
      <ModuleBreadcrumbs />
      <PageHeader
        title={meta.title}
        description="Restore records or remove them from this module. Items you delete here stay available in Administration → Recycle bin until an admin permanently deletes them."
      />
      <RecycleBinPanel
        tenantId={tenantId}
        audience="module"
        moduleKey={meta.trashModule}
        title={meta.title}
        canPurgeForever={false}
      />
    </AppShell>
  );
}

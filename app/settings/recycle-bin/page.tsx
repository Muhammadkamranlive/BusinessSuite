"use client";

import { AppShell } from "@/components/app-shell";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { RecycleBinPanel } from "@/components/common/recycle-bin-panel";
import { getStoredTenantId } from "@/lib/auth/session";

export default function AdminRecycleBinPage() {
  const tenantId = getStoredTenantId() ?? "alpha";

  return (
    <AppShell activeModule="settings">
      <AdminSubnav active="/settings/recycle-bin" />
      <PageHeader
        title="Administration recycle bin"
        description="Company-wide trash. Includes items still in module bins and items users already cleared from their modules. Only admins can delete forever."
      />
      <ModuleBreadcrumbs />
      <RecycleBinPanel
        tenantId={tenantId}
        audience="admin"
        title="Administration recycle bin"
        canPurgeForever
      />
    </AppShell>
  );
}

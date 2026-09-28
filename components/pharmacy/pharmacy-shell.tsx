"use client";

import { useEffect, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { getStoredTenantId } from "@/lib/auth/session";
import { pullPharmacyFromSupabase } from "@/modules/pharmacy/services/pharmacy.store";

/** Shared chrome for Alif Pharmacy pages — responsive AppShell + breadcrumbs + DB pull. */
export function PharmacyShell({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  children
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  children?: ReactNode;
}) {
  useEffect(() => {
    const tenantId = getStoredTenantId() ?? "alpha";
    void pullPharmacyFromSupabase(tenantId);
  }, []);

  return (
    <AppShell activeModule="pharmacy">
      <div className="bs-page mx-auto w-full max-w-6xl min-w-0">
        <ModuleBreadcrumbs />
        <PageHeader
          title={title}
          description={description}
          actionLabel={actionLabel}
          actionHref={actionHref}
          onAction={onAction}
        />
        {children}
      </div>
    </AppShell>
  );
}

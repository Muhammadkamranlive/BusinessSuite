"use client";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { SubscriptionCheckout } from "@/components/billing/subscription-checkout";
import { Panel } from "@/components/ui";
import { getStoredTenantId, getStoredUserEmail } from "@/lib/auth/session";
import { listAdminTenants } from "@/modules/admin/services/admin.store";

export default function BillingPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const email = getStoredUserEmail() ?? "billing@example.com";
  const tenant = listAdminTenants().find((t) => t.id === tenantId);

  return (
    <AppShell activeModule="settings">
      <PageHeader title="Billing" description="Choose or update your BusinessSuite subscription with Stripe Elements." />
      <ModuleBreadcrumbs />
      <Panel>
        <SubscriptionCheckout
          tenantId={tenantId}
          companyName={tenant?.name ?? "Company"}
          billingEmail={email}
        />
      </Panel>
    </AppShell>
  );
}

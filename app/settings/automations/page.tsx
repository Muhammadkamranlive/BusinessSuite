"use client";

import { AppShell } from "@/components/app-shell";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { AutomationsConsole } from "@/components/automation/automations-console";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { canMenu } from "@/modules/admin/services/acl.store";

const MENU_ID = "settings.automations";

export default function SettingsAutomationsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const actor = getSessionProfile();
  const allowed = canMenu(actor.role, actor.email, MENU_ID, "view");

  if (!allowed) {
    return (
      <AppShell activeModule="settings">
        <ModuleBreadcrumbs />
        <PageHeader title="Automations" description="You do not have access to automation settings." />
        <AdminSubnav active="/settings/automations" />
      </AppShell>
    );
  }

  return (
    <AppShell activeModule="settings">
      <ModuleBreadcrumbs />
      <PageHeader
        title="Rule Engine"
        description="Platform automation hub: when→then rules, schedules, approval chains, event log, and channels. Rules sync to your database — define tasks and emails per your needs."
      />
      <AdminSubnav active="/settings/automations" />
      <AutomationsConsole tenantId={tenantId} />
    </AppShell>
  );
}

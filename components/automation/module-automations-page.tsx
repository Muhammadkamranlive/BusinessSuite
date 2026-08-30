"use client";

import { AppShell } from "@/components/app-shell";
import { AutomationsConsole } from "@/components/automation/automations-console";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { Button, Panel } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { canMenu } from "@/modules/admin/services/acl.store";
import { moduleLabels, type ModuleKey } from "@/lib/permissions";

export function ModuleAutomationsPage({ module }: { module: ModuleKey }) {
  const tenantId = getStoredTenantId() ?? "alpha";
  const actor = getSessionProfile();
  const menuId = `${module}.automations`;
  const allowed = canMenu(actor.role, actor.email, menuId, "view");

  if (!allowed) {
    return (
      <AppShell activeModule={module}>
        <ModuleBreadcrumbs />
        <PageHeader title="Rule Engine" description="You do not have access to automations in this module." />
      </AppShell>
    );
  }

  return (
    <AppShell activeModule={module}>
      <ModuleBreadcrumbs />
      <PageHeader
        title={`${moduleLabels[module]} Rule Engine`}
        description={`When→then rules, schedules, and approvals for ${moduleLabels[module]}. Email templates, custom recipients, and event log — shared platform engine.`}
        actionLabel="Company-wide hub"
        actionHref="/settings/automations"
      />
      <Panel className="mb-4 p-4 text-sm text-slate-600">
        Tip: emit a <strong>test event</strong> from the Rules tab to see the notification bell and email outbox fire. Wire real module screens later with{" "}
        <code className="rounded bg-cloud px-1 text-xs">emitBusinessEvent()</code>.
        {module !== "settings" ? (
          <span className="mt-2 block">
            <Button href="/settings/automations" variant="secondary" className="!min-h-9 !text-xs">
              Open full automation hub
            </Button>
          </span>
        ) : null}
      </Panel>
      <AutomationsConsole tenantId={tenantId} moduleFilter={module} embedded />
    </AppShell>
  );
}

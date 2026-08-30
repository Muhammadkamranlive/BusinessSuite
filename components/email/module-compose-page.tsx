"use client";

import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { EmailComposer } from "@/components/email/email-composer";
import { useComposeEmailOptional } from "@/components/email/compose-email-context";
import { Panel } from "@/components/ui";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { canMenu } from "@/modules/admin/services/acl.store";
import { moduleLabels, type ModuleKey } from "@/lib/permissions";

export function ModuleComposePage({ module }: { module: ModuleKey }) {
  const actor = getSessionProfile();
  const menuId = `${module}.compose_email`;
  const allowed = canMenu(actor.role, actor.email, menuId, "view");
  const compose = useComposeEmailOptional();

  if (!allowed) {
    return (
      <AppShell activeModule={module}>
        <ModuleBreadcrumbs />
        <PageHeader title="Compose email" description="You do not have access to compose email in this module." />
      </AppShell>
    );
  }

  return (
    <AppShell activeModule={module}>
      <ModuleBreadcrumbs />
      <PageHeader
        title="Compose email"
        description={`Outlook / Gmail-style composer for ${moduleLabels[module]}. Use templates, edit details, attach files, and send — sourced as ${moduleLabels[module]} communication.`}
        actionLabel={compose ? "Open floating window" : undefined}
        onAction={compose ? () => compose.openCompose({ sourceModule: module }) : undefined}
      />
      <Panel className="overflow-hidden p-0">
        <EmailComposer mode="page" sourceModule={module} />
      </Panel>
      <p className="mt-3 text-xs text-slate-500">
        Allowed attachments: PDF, images (PNG/JPG/GIF/WebP), Word (DOC/DOCX), Excel (XLS/XLSX), CSV — up to 8
        files, 7MB each.
      </p>
    </AppShell>
  );
}

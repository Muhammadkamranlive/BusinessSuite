"use client";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { DocumentManager, type DocumentManagerTab } from "@/components/documents/document-manager";

export function DocumentsWorkspace({ tab }: { tab: DocumentManagerTab }) {
  return (
    <AppShell activeModule="documents">
      <ModuleBreadcrumbs />
      <PageHeader
        title="Document Management"
        description="Collect employee uploads, assign HR files, verify documents, and manage recycle bin — multi-tenant and Supabase-ready."
      />
      <DocumentManager initialTab={tab} key={tab} />
    </AppShell>
  );
}

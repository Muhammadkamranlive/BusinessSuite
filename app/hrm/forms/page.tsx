"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge, Button, Panel } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { listCustomForms } from "@/modules/forms/services/forms.store";
import { listFormAssignments } from "@/modules/forms/services/forms.store";

export default function CustomFormsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const [tick, setTick] = useState(0);
  const forms = useMemo(() => listCustomForms(tenantId), [tenantId, tick]);
  const assignments = useMemo(() => listFormAssignments(tenantId), [tenantId, tick]);

  return (
    <AppShell activeModule="hrm">
      <PageHeader
        title="Custom forms"
        description="Build branded forms, send them to employees, collect answers and document uploads."
        actionLabel="New form"
        actionHref="/hrm/forms/new"
      />
      <ModuleBreadcrumbs />

      <Panel className="mb-5 border-teal/30 bg-cloud/60">
        <p className="text-sm text-slate-600">
          Each company sets its <Link href="/hrm/company" className="font-semibold text-teal hover:underline">letterhead</Link>
          {" "}on Company. Publish a form → send to employees → they fill it under{" "}
          <Link href="/hrm/my-forms" className="font-semibold text-teal hover:underline">My forms</Link>
          {" "}→ HR reviews responses here.
        </p>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Form", "Fields", "Status", "Sent / submitted", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold text-slate-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {forms.map((form) => {
              const sent = assignments.filter((a) => a.form_id === form.id);
              const submitted = sent.filter((a) => a.status === "submitted" || a.status === "reviewed").length;
              return (
                <tr key={form.id} className="border-b border-line">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{form.title}</p>
                    <p className="text-xs text-slate-500">{form.description || "No description"}</p>
                  </td>
                  <td className="px-4 py-3">{form.fields.length}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={form.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="info">{sent.length} sent</Badge>{" "}
                    <Badge tone="success">{submitted} submitted</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Button href={`/hrm/forms/${form.id}`} variant="secondary" className="!min-h-8 !px-2 !text-xs">
                        Edit / send
                      </Button>
                      <Button href={`/hrm/forms/${form.id}/responses`} className="!min-h-8 !px-2 !text-xs">
                        Responses
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {forms.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No forms yet. Create one to request data or documents from employees.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Panel>
      <button type="button" className="sr-only" onClick={() => setTick((n) => n + 1)} aria-hidden>
        refresh
      </button>
    </AppShell>
  );
}

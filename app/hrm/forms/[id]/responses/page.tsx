"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { Badge, Button, Panel } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import {
  getCustomForm,
  getResponseForAssignment,
  listFormAssignments,
  markAssignmentReviewed
} from "@/modules/forms/services/forms.store";
import { getEmployeeName } from "@/modules/hrm/services/hrm.store";

export default function FormResponsesPage() {
  const params = useParams();
  const formId = String(params.id || "");
  const tenantId = getStoredTenantId() ?? "alpha";
  const [tick, setTick] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const form = useMemo(() => getCustomForm(formId), [formId, tick]);
  const assignments = useMemo(
    () =>
      listFormAssignments(tenantId)
        .filter((a) => a.form_id === formId)
        .sort((a, b) => ((a.updated_at ?? "") < (b.updated_at ?? "") ? 1 : -1)),
    [tenantId, formId, tick]
  );
  const selected = assignments.find((a) => a.id === selectedId) ?? assignments.find((a) => a.status !== "pending") ?? null;
  const response = selected ? getResponseForAssignment(selected.id) : undefined;

  if (!form) {
    return (
      <AppShell activeModule="hrm">
        <PageHeader title="Form not found" />
        <ModuleBreadcrumbs trail={[{ label: "Custom forms", href: "/hrm/forms" }]} />
      </AppShell>
    );
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader title={`Responses — ${form.title}`} description="Data and files submitted by employees for this form." />
      <ModuleBreadcrumbs
        trail={[
          { label: "Custom forms", href: "/hrm/forms" },
          { label: form.title, href: `/hrm/forms/${formId}` },
          { label: "Responses" }
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <Panel className="h-fit space-y-2 p-3">
          {assignments.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelectedId(a.id)}
              className={`flex w-full items-center justify-between rounded-[var(--bs-radius)] px-3 py-2 text-left text-sm ${
                selected?.id === a.id ? "bg-[color:var(--bs-teal)] text-white" : "hover:bg-cloud"
              }`}
            >
              <span className="font-semibold">{getEmployeeName(a.employee_id)}</span>
              <Badge tone={a.status === "pending" ? "warning" : "success"}>{a.status}</Badge>
            </button>
          ))}
          {assignments.length === 0 ? <p className="p-2 text-sm text-slate-500">No assignments yet.</p> : null}
        </Panel>

        <Panel>
          {!selected ? (
            <p className="text-sm text-slate-500">Select an employee assignment.</p>
          ) : selected.status === "pending" ? (
            <p className="text-sm text-slate-500">{getEmployeeName(selected.employee_id)} has not submitted yet.</p>
          ) : !response ? (
            <p className="text-sm text-slate-500">No response payload found.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-ink">{getEmployeeName(selected.employee_id)}</p>
                  <p className="text-xs text-slate-500">
                    Submitted {selected.submitted_at ? new Date(selected.submitted_at).toLocaleString() : "—"}
                  </p>
                </div>
                {selected.status === "submitted" ? (
                  <Button
                    type="button"
                    onClick={() => {
                      markAssignmentReviewed(selected.id);
                      setTick((n) => n + 1);
                    }}
                  >
                    Mark reviewed
                  </Button>
                ) : (
                  <Badge tone="info">Reviewed</Badge>
                )}
              </div>

              {form.fields.map((field) => {
                const raw = response.answers[field.id];
                const fileName = response.file_names?.[field.id];
                return (
                  <div key={field.id} className="rounded-[var(--bs-radius)] border border-line p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{field.label}</p>
                    {field.type === "file" && typeof raw === "string" && raw ? (
                      <div className="mt-2">
                        <a href={raw} target="_blank" rel="noreferrer" className="text-sm font-semibold text-teal hover:underline">
                          {fileName || "Open uploaded file"}
                        </a>
                      </div>
                    ) : field.type === "checkbox" ? (
                      <p className="mt-1 text-sm font-semibold text-ink">{raw === true ? "Yes" : "No"}</p>
                    ) : (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{raw == null || raw === "" ? "—" : String(raw)}</p>
                    )}
                  </div>
                );
              })}

              <Link href={`/hrm/forms/${formId}`} className="inline-block text-sm font-semibold text-teal hover:underline">
                ← Back to form
              </Link>
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

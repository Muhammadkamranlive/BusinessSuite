"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { Badge, Button, Field, Panel, SelectInput } from "@/components/ui";
import { getStoredTenantId, getStoredUserEmail } from "@/lib/auth/session";
import { getSelfServiceContext } from "@/lib/auth/current-employee";
import { getCustomForm, listAssignmentsForEmployee } from "@/modules/forms/services/forms.store";
import { listEmployees } from "@/modules/hrm/services/hrm.store";

function resolveEmployeeId(tenantId: string, overrideId: string) {
  const employees = listEmployees(tenantId);
  if (overrideId) return overrideId;
  const email = getStoredUserEmail()?.toLowerCase();
  if (email) {
    const match = employees.find((e) => e.email.toLowerCase() === email);
    if (match) return match.id;
  }
  return employees[0]?.id ?? "";
}

export default function MyFormsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { selfService, employee } = getSelfServiceContext(tenantId);
  const employees = useMemo(() => listEmployees(tenantId), [tenantId]);
  const [employeeId, setEmployeeId] = useState(() => employee?.id ?? resolveEmployeeId(tenantId, ""));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (selfService && employee) setEmployeeId(employee.id);
  }, [selfService, employee]);

  const assignments = useMemo(
    () => (employeeId ? listAssignmentsForEmployee(tenantId, employeeId) : []),
    [tenantId, employeeId, tick]
  );

  return (
    <AppShell activeModule="hrm">
      <PageHeader
        title="My forms"
        description="Forms your company sent you — fill them out and upload any requested documents."
      />
      <ModuleBreadcrumbs />

      {selfService ? null : (
      <Panel className="mb-5">
        <Field label="Viewing as employee" hint="Demo: pick an employee roster identity to fill forms.">
          <SelectInput
            value={employeeId}
            onChange={(e) => {
              setEmployeeId(e.target.value);
              setTick((n) => n + 1);
            }}
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name} ({emp.email})
              </option>
            ))}
          </SelectInput>
        </Field>
      </Panel>
      )}

      <div className="grid gap-3">
        {assignments.map((a) => {
          const form = getCustomForm(a.form_id);
          return (
            <Panel key={a.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-ink">{form?.title ?? "Form"}</p>
                  <p className="mt-1 text-sm text-slate-500">{form?.description || "Complete this form for HR."}</p>
                  {a.due_date ? <p className="mt-1 text-xs text-slate-400">Due {a.due_date}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={a.status === "pending" ? "warning" : a.status === "reviewed" ? "info" : "success"}>
                    {a.status}
                  </Badge>
                  {a.status === "pending" ? (
                    <Link href={`/hrm/my-forms/${a.id}?employeeId=${employeeId}`}>
                      <Button type="button" className="!min-h-8 !px-3 !text-xs">
                        Fill form
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/hrm/my-forms/${a.id}?employeeId=${employeeId}`}>
                      <Button type="button" variant="secondary" className="!min-h-8 !px-3 !text-xs">
                        View
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </Panel>
          );
        })}
        {assignments.length === 0 ? (
          <Panel>
            <p className="text-sm text-slate-500">No forms assigned to this employee yet.</p>
          </Panel>
        ) : null}
      </div>
    </AppShell>
  );
}

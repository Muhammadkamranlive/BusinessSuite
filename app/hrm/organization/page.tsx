"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Panel } from "@/components/ui";
import { getSelfServiceContext } from "@/lib/auth/current-employee";
import { getStoredTenantId } from "@/lib/auth/session";
import { getDepartmentName, getDesignationName, listDirectReports, listEmployees, listOrgRoots } from "@/modules/hrm/services/hrm.store";
import type { Employee } from "@/modules/hrm/model";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function OrgCard({ employee, selfId }: { employee: Employee; selfId?: string | null }) {
  const reports = listDirectReports(employee.id).filter((e) => e.status !== "terminated" && e.status !== "inactive");
  return (
    <Link
      href={`/hrm/employees/${employee.id}`}
      className={`bs-org-card ${selfId === employee.id ? "is-self" : ""}`}
    >
      <div className="flex items-start gap-3">
        <span className="bs-chat-avatar">{initials(employee.full_name)}</span>
        <div className="min-w-0">
          <p className="truncate font-bold text-ink">{employee.full_name}</p>
          <p className="truncate text-xs text-slate-500">
            {employee.business_title || getDesignationName(employee.designation_id)}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{getDepartmentName(employee.department_id)}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <StatusBadge status={employee.status} />
        <span className="text-xs font-semibold text-teal">
          {reports.length} report{reports.length === 1 ? "" : "s"}
        </span>
      </div>
    </Link>
  );
}

function OrgBranch({ employee, selfId }: { employee: Employee; selfId?: string | null }) {
  const reports = listDirectReports(employee.id).filter((e) => e.status !== "terminated" && e.status !== "inactive");
  return (
    <div className="bs-org-node">
      <OrgCard employee={employee} selfId={selfId} />
      {reports.length > 0 ? (
        <div className="bs-org-children">
          {reports.map((child) => (
            <OrgBranch key={child.id} employee={child} selfId={selfId} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function OrganizationPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { employee: me } = getSelfServiceContext(tenantId);
  const [showInactive, setShowInactive] = useState(false);

  const roots = useMemo(() => listOrgRoots(tenantId, showInactive), [tenantId, showInactive]);
  const headcount = useMemo(
    () => listEmployees(tenantId).filter((e) => e.status === "active" || e.status === "onboarding").length,
    [tenantId]
  );

  return (
    <AppShell activeModule="hrm">
      <PageHeader
        title="Organization"
        description="Company org chart — every signed-in user can open this tree. Your card is highlighted when you are on the roster."
      />
      <ModuleBreadcrumbs />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{headcount} workers in the active org. Click a card to open the worker profile.</p>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-ink">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Include inactive
        </label>
      </div>

      <Panel className="overflow-x-auto">
        {roots.length === 0 ? (
          <p className="text-sm text-slate-500">No organization tree yet. Add employees and set a manager on each worker.</p>
        ) : (
          <div className="bs-org-tree flex flex-col items-stretch gap-10 lg:items-center">
            {roots.map((root) => (
              <OrgBranch key={root.id} employee={root} selfId={me?.id} />
            ))}
          </div>
        )}
      </Panel>
    </AppShell>
  );
}

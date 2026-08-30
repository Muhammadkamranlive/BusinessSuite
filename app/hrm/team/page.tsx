"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Panel } from "@/components/ui";
import { getSelfServiceContext } from "@/lib/auth/current-employee";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { findCompanyHrEmail } from "@/modules/admin/services/admin.store";
import {
  listDirectReports,
  listEmployees,
  listLeaveRequests,
  getDepartmentName,
  getEmployeeName
} from "@/modules/hrm/services/hrm.store";
import {
  expiringIdentityDocs,
  getWorkerProfile,
  listInbox,
  submitPersonalDataRequest
} from "@/modules/hrm/services/workday.store";
import { useConfirm } from "@/components/common/use-confirm";
import { Field, TextInput } from "@/components/ui";

export default function TeamPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const profile = getSessionProfile();
  const { employee } = getSelfServiceContext(tenantId);
  const { askSave, dialog } = useConfirm();
  const [scope, setScope] = useState<"team" | "company">("team");
  const [extraJson, setExtraJson] = useState("");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [address, setAddress] = useState(employee?.address ?? "");

  const me = employee;
  const reports = me ? listDirectReports(me.id) : [];
  const isPeopleOps = profile.role === "hr_manager" || profile.role === "super_admin" || profile.role === "company_admin";
  const teamPeople = me ? [me, ...reports] : [];
  const people = scope === "company" && isPeopleOps ? listEmployees(tenantId).filter((e) => e.status === "active") : teamPeople;
  const teamIds = new Set(people.map((p) => p.id));
  const leaves = listLeaveRequests(tenantId).filter((l) => teamIds.has(l.employee_id) && l.status !== "rejected" && l.status !== "cancelled");
  const expiring = expiringIdentityDocs(tenantId).filter((d) => teamIds.has(d.employee_id));
  const myInbox = listInbox(tenantId, profile.email).filter((t) => t.status === "pending");

  const calendar = useMemo(() => {
    const days: Array<{ date: string; names: string[] }> = [];
    const start = new Date();
    for (let i = 0; i < 14; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const names = leaves
        .filter((l) => l.start_date <= iso && l.end_date >= iso && (l.status === "approved" || l.status === "pending"))
        .map((l) => people.find((p) => p.id === l.employee_id)?.full_name ?? "Worker");
      days.push({ date: iso, names });
    }
    return days;
  }, [leaves, people]);

  return (
    <AppShell activeModule="hrm">
      <PageHeader title="Team" description="Manager self-service: reports, time-off calendar, identity expiry, and personal-data requests." />
      <ModuleBreadcrumbs />
      {isPeopleOps ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button type="button" variant={scope === "team" ? "primary" : "secondary"} onClick={() => setScope("team")}>My org</Button>
          <Button type="button" variant={scope === "company" ? "primary" : "secondary"} onClick={() => setScope("company")}>Company</Button>
        </div>
      ) : null}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Panel><p className="text-xs text-slate-500">Direct reports</p><p className="text-2xl font-bold">{reports.length}</p></Panel>
        <Panel><p className="text-xs text-slate-500">Inbox waiting</p><p className="text-2xl font-bold">{myInbox.length}</p></Panel>
        <Panel><p className="text-xs text-slate-500">IDs expiring (90d)</p><p className="text-2xl font-bold">{expiring.length}</p></Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel>
          <h2 className="mb-3 text-lg font-bold text-ink">My team</h2>
          <div className="space-y-2">
            {people.map((p) => {
              const wp = getWorkerProfile(p.id);
              return (
                <Link key={p.id} href={`/hrm/employees/${p.id}`} className="flex items-center justify-between rounded-[var(--bs-radius)] border border-line px-3 py-2">
                  <span>
                    <span className="block text-sm font-semibold text-ink">{p.full_name}</span>
                    <span className="text-xs text-slate-500">{getDepartmentName(p.department_id)}{wp?.overtime_eligible === false ? " · OT ineligible" : " · OT eligible"}</span>
                  </span>
                  <StatusBadge status={p.status} />
                </Link>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button href="/hrm/job-changes" variant="secondary">Initiate job change</Button>
            <Button href="/hrm/inbox" variant="ghost">Inbox</Button>
          </div>
        </Panel>
        <Panel>
          <h2 className="mb-3 text-lg font-bold text-ink">Time-off calendar (14 days)</h2>
          <div className="space-y-1 text-sm">
            {calendar.map((d) => (
              <div key={d.date} className="flex justify-between gap-2 border-b border-line py-1">
                <span className="text-slate-500">{d.date}</span>
                <span className="font-medium text-ink">{d.names.length ? d.names.join(", ") : "—"}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <h2 className="mb-3 text-lg font-bold text-ink">Identity expiring (90 days)</h2>
          <ul className="space-y-1 text-sm">
            {expiring.map((d) => (
              <li key={d.id}>
                {getEmployeeName(d.employee_id)} · {d.kind.replace("_", " ")} · {d.expiry}
              </li>
            ))}
            {expiring.length === 0 ? <li className="text-slate-500">None in this team.</li> : null}
          </ul>
        </Panel>
        {me ? (
          <Panel>
            <h2 className="mb-3 text-lg font-bold text-ink">Request personal data change</h2>
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                askSave({
                  editing: false,
                  entityLabel: "personal data request",
                  onConfirm: () => {
                    submitPersonalDataRequest(
                      tenantId,
                      { employee_id: me.id, phone, address, requested_by: profile.email },
                      findCompanyHrEmail(tenantId, profile.email)
                    );
                  }
                });
              }}
            >
              <Field label="Phone"><TextInput value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
              <Field label="Address"><TextInput value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
              <ExtraFieldsBlock formKey="hrm.inbox" valueJson={extraJson} onChange={setExtraJson} />
              <Button type="submit">Submit to HR inbox</Button>
            </form>
          </Panel>
        ) : null}
      </div>
      {dialog}
    </AppShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Clock3, DollarSign, IdCard, Inbox, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { ModuleStartGuide } from "@/components/guides/module-start-guide";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge, Panel, SectionHeader, StatTile } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { EmployeeHome } from "@/components/employee/employee-home";
import { isSelfServiceRole } from "@/lib/employee-menus";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { money } from "@/lib/utils";
import { getEmployee, hrmStats, listCandidates, listLeaveRequests } from "@/modules/hrm/services/hrm.store";
import {
  expiringIdentityDocs,
  listInbox,
  listPositions,
  listRequisitions
} from "@/modules/hrm/services/workday.store";
import type { HrmStats } from "@/modules/hrm/model";

export default function HrmOverviewPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const profile = getSessionProfile();
  const [stats, setStats] = useState<HrmStats | null>(null);
  const [pendingLeaves, setPendingLeaves] = useState<ReturnType<typeof listLeaveRequests>>([]);
  const [openCandidates, setOpenCandidates] = useState<ReturnType<typeof listCandidates>>([]);

  const [inboxPending, setInboxPending] = useState(0);
  const [expiringIds, setExpiringIds] = useState<ReturnType<typeof expiringIdentityDocs>>([]);
  const [vacant, setVacant] = useState(0);
  const [openReqs, setOpenReqs] = useState(0);

  useEffect(() => {
    setStats(hrmStats(tenantId));
    setPendingLeaves(listLeaveRequests(tenantId).filter((l) => l.status === "pending").slice(0, 5));
    setOpenCandidates(listCandidates(tenantId).filter((c) => c.stage !== "hired" && c.stage !== "rejected").slice(0, 5));
    setInboxPending(listInbox(tenantId).filter((t) => t.status === "pending").length);
    setExpiringIds(expiringIdentityDocs(tenantId).slice(0, 6));
    setVacant(listPositions(tenantId).filter((p) => p.status === "open").length);
    setOpenReqs(listRequisitions(tenantId).filter((r) => r.status === "open" || r.status === "draft").length);
  }, [tenantId]);

  if (isSelfServiceRole(profile.role)) {
    return (
      <AppShell activeModule="hrm">
        <ModuleBreadcrumbs />
        <EmployeeHome tenantId={tenantId} />
      </AppShell>
    );
  }

  return (
    <AppShell activeModule="hrm">
      <ModuleBreadcrumbs />
      <ModuleStartGuide module="hrm" />

      <div className="grid gap-4 md:grid-cols-4">
        <StatTile
          label="Employees"
          value={String(stats?.employees ?? 0)}
          detail={`${stats?.activeEmployees ?? 0} active`}
          icon={Users}
          tone="teal"
        />
        <StatTile
          label="Inbox"
          value={String(inboxPending)}
          detail={`${vacant} vacant seats · ${openReqs} requisitions`}
          icon={Inbox}
          tone="amber"
        />
        <StatTile
          label="Pending leaves"
          value={String(stats?.pendingLeaves ?? 0)}
          detail="Awaiting approval"
          icon={Clock3}
          tone="amber"
        />
        <StatTile
          label="IDs expiring"
          value={String(expiringIds.length)}
          detail="Passport / visa / labour card (90d)"
          icon={IdCard}
          tone="coral"
        />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <StatTile
          label="Attendance today"
          value={`${stats?.attendanceTodayPct ?? 0}%`}
          detail="Of active employees"
          icon={CalendarCheck}
          tone="mint"
        />
        <StatTile
          label="Payroll (last run)"
          value={money(stats?.payrollTotal ?? 0)}
          detail={`${stats?.pendingTimesheets ?? 0} timesheets pending`}
          icon={DollarSign}
          tone="coral"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel>
          <SectionHeader
            title="Pending leave requests"
            eyebrow="Leaves"
            action={<Link href="/hrm/leaves" className="text-sm font-semibold text-teal hover:underline">View all</Link>}
          />
          <div className="space-y-2">
            {pendingLeaves.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-[var(--bs-radius)] border border-line px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-ink">{getEmployee(l.employee_id)?.full_name ?? "—"}</p>
                  <p className="text-xs text-slate-500 capitalize">{l.leave_type} · {l.start_date} → {l.end_date}</p>
                </div>
                <StatusBadge status={l.status} />
              </div>
            ))}
            {pendingLeaves.length === 0 ? <p className="text-sm text-slate-400">No pending leave requests.</p> : null}
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            title="Open candidates"
            eyebrow="Recruitment"
            action={<Link href="/hrm/recruitment" className="text-sm font-semibold text-teal hover:underline">View all</Link>}
          />
          <div className="space-y-2">
            {openCandidates.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-[var(--bs-radius)] border border-line px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-ink">{c.full_name}</p>
                  <p className="text-xs text-slate-500">{c.position}</p>
                </div>
                <Badge tone="info">{c.stage}</Badge>
              </div>
            ))}
            {openCandidates.length === 0 ? <p className="text-sm text-slate-400">No open candidates.</p> : null}
          </div>
        </Panel>
        <Panel>
          <SectionHeader
            title="Identity expiry"
            eyebrow="Compliance"
            action={<Link href="/hrm/inbox" className="text-sm font-semibold text-teal hover:underline">Inbox</Link>}
          />
          <div className="space-y-2">
            {expiringIds.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-[var(--bs-radius)] border border-line px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-ink">{getEmployee(d.employee_id)?.full_name ?? "Worker"}</p>
                  <p className="text-xs text-slate-500 capitalize">{d.kind.replace("_", " ")} · {d.number} · {d.expiry}</p>
                </div>
              </div>
            ))}
            {expiringIds.length === 0 ? <p className="text-sm text-slate-400">No documents expiring in 90 days.</p> : null}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

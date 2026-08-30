"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, ClipboardList, FileUp, ListChecks, LogIn, LogOut } from "lucide-react";
import { Badge, Button, Panel, StatTile } from "@/components/ui";
import { getSelfServiceContext, matchesOwnedBy } from "@/lib/auth/current-employee";
import { listDocumentAssignments } from "@/modules/documents/services/documents.store";
import { getCustomForm, listAssignmentsForEmployee } from "@/modules/forms/services/forms.store";
import {
  checkInEmployee,
  checkOutEmployee,
  listAttendanceForEmployee,
  listTimesheetsForEmployee
} from "@/modules/hrm/services/hrm.store";
import { listInbox, listLeaveBalances } from "@/modules/hrm/services/workday.store";
import { listProjectTasks } from "@/modules/projects/services/projects.store";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function EmployeeHome({ tenantId }: { tenantId: string }) {
  const [tick, setTick] = useState(0);
  const { profile, employee } = getSelfServiceContext(tenantId);

  const data = useMemo(() => {
    if (!employee) return null;
    const today = todayIso();
    const attendance = listAttendanceForEmployee(employee.id);
    const todayRow = attendance.find((r) => r.attendance_date === today);
    const timesheets = listTimesheetsForEmployee(tenantId, employee.id);
    const pendingTimesheets = timesheets.filter((t) => t.status === "draft" || t.status === "submitted");
    const pendingDocs = listDocumentAssignments(tenantId, { employeeId: employee.id, status: "pending" });
    const pendingForms = listAssignmentsForEmployee(tenantId, employee.id).filter((a) => a.status === "pending");
    const myTasks = listProjectTasks(tenantId).filter((t) => matchesOwnedBy(t.owner, employee, profile.name) && t.status !== "done");
    const pendingInbox = listInbox(tenantId, profile.email).filter((t) => t.status === "pending");
    const leaveLeft = listLeaveBalances(tenantId, employee.id).reduce((sum, b) => sum + (b.entitled - b.used - b.pending), 0);
    return { today, todayRow, pendingTimesheets, pendingDocs, pendingForms, myTasks, pendingInbox, leaveLeft };
  }, [employee, tenantId, profile.name, profile.email, tick]);

  if (!employee) {
    return (
      <Panel className="p-6">
        <h2 className="text-xl font-bold text-ink">Your employee profile is not linked yet</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          You are signed in as <strong>{profile.email}</strong>, but HR has not created a matching employee record
          with that email. Ask HR to add you on Employees — then you can log timesheets, attendance, tasks, and documents.
        </p>
      </Panel>
    );
  }

  const { today, todayRow, pendingTimesheets, pendingDocs, pendingForms, myTasks, pendingInbox, leaveLeft } = data!;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-teal">My workspace</p>
        <h2 className="mt-1 text-2xl font-bold text-ink">Welcome, {employee.full_name}</h2>
        <p className="mt-1 text-sm text-slate-500">Timesheets, attendance, tasks, and documents assigned to you.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Attendance today" value={todayRow ? todayRow.status.replace("_", " ") : "Not checked in"} detail={today} icon={CalendarCheck} tone={todayRow ? "mint" : "amber"} />
        <StatTile label="Open timesheets" value={String(pendingTimesheets.length)} detail="Draft or waiting on HR" icon={ClipboardList} tone="teal" />
        <StatTile label="Leave remaining" value={String(leaveLeft)} detail="All types this year" icon={ListChecks} tone="mint" />
        <StatTile label="Inbox" value={String(pendingInbox.length)} detail="Approvals assigned to you" icon={FileUp} tone="coral" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="p-5">
          <h3 className="font-bold text-ink">Check in / out</h3>
          <p className="mt-1 text-sm text-slate-500">Record today’s attendance with one tap.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => { checkInEmployee(tenantId, employee.id); setTick((n) => n + 1); }}>
              <LogIn className="size-4" />
              Check in
            </Button>
            <Button type="button" variant="secondary" onClick={() => { checkOutEmployee(tenantId, employee.id); setTick((n) => n + 1); }}>
              <LogOut className="size-4" />
              Check out
            </Button>
            <Button href="/hrm/attendance" variant="ghost">
              Attendance history
            </Button>
          </div>
        </Panel>

        <Panel className="p-5">
          <h3 className="font-bold text-ink">Assigned to you</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {pendingDocs.slice(0, 4).map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2 rounded-[var(--bs-radius)] border border-line px-3 py-2">
                <span>
                  <span className="font-semibold text-ink">{row.requirement_title}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">From {row.assigned_by_name}</span>
                </span>
                <Badge tone="warning">Upload</Badge>
              </li>
            ))}
            {pendingForms.slice(0, 3).map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2 rounded-[var(--bs-radius)] border border-line px-3 py-2">
                <span className="font-semibold text-ink">{getCustomForm(row.form_id)?.title ?? "HR form"}</span>
                <Badge tone="info">Form</Badge>
              </li>
            ))}
            {myTasks.slice(0, 3).map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2 rounded-[var(--bs-radius)] border border-line px-3 py-2">
                <span className="font-semibold text-ink">{row.title}</span>
                <Badge tone="neutral">{row.status}</Badge>
              </li>
            ))}
            {pendingDocs.length + pendingForms.length + myTasks.length === 0 ? (
              <li className="text-slate-500">Nothing waiting — you’re caught up.</li>
            ) : null}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button href="/hrm/my-pay">My Pay</Button>
            <Button href="/hrm/inbox" variant="secondary">Inbox</Button>
            <Button href="/hrm/team" variant="ghost">Team</Button>
            <Button href="/hrm/organization" variant="ghost">Organization</Button>
            <Button href={`/hrm/employees/${employee.id}`} variant="ghost">Worker profile</Button>
            <Button href="/documents">Upload documents</Button>
            <Button href="/hrm/timesheets" variant="secondary">Log hours</Button>
            <Button href="/projects/tasks" variant="ghost">My tasks</Button>
            <Button href="/hrm/my-forms" variant="ghost">My forms</Button>
            <Button href="/profile" variant="ghost">My profile</Button>
            <Button href="/hrm/benefits" variant="ghost">Benefits</Button>
            <Button href="/hrm/talent" variant="ghost">Talent</Button>
            <Button href="/hrm/leaves" variant="ghost">Leave</Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

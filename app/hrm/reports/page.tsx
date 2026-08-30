"use client";

import { useMemo } from "react";
import { Award, CalendarCheck, ClipboardList, DollarSign, UserPlus, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { DataTable, Panel, SectionHeader, StatTile } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { money } from "@/lib/utils";
import {
  getDepartmentName,
  hrmStats,
  listAssets,
  listAttendance,
  listCandidates,
  listEmployees,
  listLeaveRequests,
  listPayrollRuns
} from "@/modules/hrm/services/hrm.store";

const colors = ["#1877f2", "#e85d75", "#b7791f", "#3b5998", "#4267b2", "#7c3aed"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function HrmReportsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";

  const stats = useMemo(() => hrmStats(tenantId), [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  const employees = useMemo(() => listEmployees(tenantId), [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  const attendance = useMemo(() => listAttendance(tenantId), [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  const leaveRequests = useMemo(() => listLeaveRequests(tenantId), [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  const payrollRuns = useMemo(() => listPayrollRuns(tenantId), [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  const candidates = useMemo(() => listCandidates(tenantId), [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  const assets = useMemo(() => listAssets(tenantId), [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const headcountByDept = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of employees) {
      const label = getDepartmentName(e.department_id);
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [employees]);

  const todaysAttendance = useMemo(() => attendance.filter((a) => a.attendance_date === today()), [attendance]);
  const attendanceBreakdown = useMemo(() => {
    const buckets: Record<string, number> = { present: 0, late: 0, absent: 0, half_day: 0, leave: 0 };
    for (const a of todaysAttendance) buckets[a.status] = (buckets[a.status] ?? 0) + 1;
    return Object.entries(buckets)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));
  }, [todaysAttendance]);

  const pendingLeaves = useMemo(() => leaveRequests.filter((l) => l.status === "pending"), [leaveRequests]);

  const payrollTrend = useMemo(
    () =>
      [...payrollRuns]
        .sort((a, b) => (a.period < b.period ? -1 : 1))
        .map((r) => ({ period: r.period, gross: r.total_gross, net: r.total_net })),
    [payrollRuns]
  );
  const payrollTotalNet = payrollRuns.reduce((sum, r) => sum + r.total_net, 0);

  const funnelStages: Array<{ stage: string; count: number }> = useMemo(() => {
    const order = ["applied", "screening", "interview", "offer", "hired", "rejected"];
    const map = new Map<string, number>();
    for (const c of candidates) map.set(c.stage, (map.get(c.stage) ?? 0) + 1);
    return order.map((stage) => ({ stage, count: map.get(stage) ?? 0 }));
  }, [candidates]);

  const assetStats = useMemo(() => {
    const total = assets.length;
    const assigned = assets.filter((a) => a.status === "assigned").length;
    const available = assets.filter((a) => a.status === "available").length;
    const retired = assets.filter((a) => a.status === "retired").length;
    const utilizationPct = total > 0 ? Math.round((assigned / total) * 100) : 0;
    return { total, assigned, available, retired, utilizationPct };
  }, [assets]);

  return (
    <AppShell activeModule="hrm">
      <PageHeader title="HR Reports" description="Company-wide analytics across people, time, pay, and assets." />
      <ModuleBreadcrumbs />

      <div className="grid gap-4 md:grid-cols-4">
        <StatTile label="Headcount" value={String(stats.employees)} detail={`${stats.activeEmployees} active`} icon={Users} tone="teal" />
        <StatTile label="Attendance today" value={`${stats.attendanceTodayPct}%`} detail={`${todaysAttendance.length} records`} icon={CalendarCheck} tone="mint" />
        <StatTile label="Pending leave" value={String(stats.pendingLeaves)} detail="Awaiting approval" icon={ClipboardList} tone="amber" />
        <StatTile label="Payroll total" value={money(stats.payrollTotal)} detail="All finalized runs" icon={DollarSign} tone="coral" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <SectionHeader title="Headcount by department" eyebrow="People" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={headcountByDept}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9e1ec" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#1877f2" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Attendance summary" eyebrow="Today" />
          {attendanceBreakdown.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie data={attendanceBreakdown} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                    {attendanceBreakdown.map((entry, index) => (
                      <Cell key={entry.name} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-slate-400">No attendance recorded today.</p>
          )}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <SectionHeader title="Pending leave requests" eyebrow={`${pendingLeaves.length} pending`} />
          <DataTable
            columns={["Employee", "Type", "Dates", "Days"]}
            rows={pendingLeaves.map((l) => [
              employees.find((e) => e.id === l.employee_id)?.full_name ?? "—",
              l.leave_type,
              `${l.start_date} → ${l.end_date}`,
              l.total_days
            ])}
          />
          {pendingLeaves.length === 0 ? <p className="mt-3 text-center text-sm text-slate-400">No pending leave requests.</p> : null}
        </Panel>

        <Panel>
          <SectionHeader title="Payroll totals" eyebrow={`Net paid ${money(payrollTotalNet)}`} />
          {payrollTrend.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payrollTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d9e1ec" />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => money(Number(value))} />
                  <Bar dataKey="gross" fill="#3b5998" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="net" fill="#1877f2" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-slate-400">No payroll runs yet.</p>
          )}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel>
          <SectionHeader title="Recruitment funnel" eyebrow="Candidate pipeline" action={<UserPlus className="size-5 text-slate-400" aria-hidden="true" />} />
          <DataTable
            columns={["Stage", "Candidates"]}
            rows={funnelStages.map((f) => [<span key={f.stage} className="capitalize">{f.stage}</span>, f.count])}
          />
        </Panel>

        <Panel>
          <SectionHeader title="Asset utilization" eyebrow={`${assetStats.utilizationPct}% assigned`} action={<Award className="size-5 text-slate-400" aria-hidden="true" />} />
          <DataTable
            columns={["Status", "Count"]}
            rows={[
              ["Assigned", assetStats.assigned],
              ["Available", assetStats.available],
              ["Retired", assetStats.retired],
              ["Total", assetStats.total]
            ]}
          />
        </Panel>
      </div>
    </AppShell>
  );
}

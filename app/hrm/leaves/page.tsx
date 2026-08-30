"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, CalendarDays, CheckCircle2, ListChecks, Tag, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { StatusBadge } from "@/components/common/status-badge";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Badge, Button, Field, Panel, SelectInput, StatTile, TextArea, TextInput } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSelfServiceContext } from "@/lib/auth/current-employee";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  approveLeave,
  cancelLeave,
  createLeaveRequest,
  createLeaveType,
  getEmployeeName,
  getLeaveRequest,
  listEmployees,
  listLeaveRequests,
  listLeaveRequestsForEmployee,
  listLeaveTypes,
  rejectLeave
} from "@/modules/hrm/services/hrm.store";
import { consumeLeaveBalance, listLeaveBalances, markLeavePending, releaseLeavePending } from "@/modules/hrm/services/workday.store";
import type { LeaveRequest } from "@/modules/hrm/model";

type Tab = "requests" | "types";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptyTypeForm() {
  return { name: "", code: "", days_per_year: "14", paid: true };
}

function emptyRequestForm() {
  return { employee_id: "", leave_type_id: "", start_date: todayIso(), end_date: todayIso(), reason: "" };
}

function daysBetween(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) return 0;
  return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export default function LeavesPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { selfService, employee } = getSelfServiceContext(tenantId);
  const { askSave, ask, dialog } = useConfirm();
  const [tab, setTab] = useState<Tab>("requests");
  const [refreshKey, setRefreshKey] = useState(0);
  const [typeForm, setTypeForm] = useState(emptyTypeForm);
  const [requestForm, setRequestForm] = useState(emptyRequestForm);
  const [extraRequestJson, setExtraRequestJson] = useState("");
  const [extraTypeJson, setExtraTypeJson] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("start_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const employees = useMemo(() => listEmployees(tenantId), [tenantId]);
  const leaveTypes = useMemo(() => listLeaveTypes(tenantId), [tenantId, refreshKey]);
  const leaveRequests = useMemo(
    () => (selfService && employee ? listLeaveRequestsForEmployee(employee.id) : listLeaveRequests(tenantId)),
    [tenantId, refreshKey, selfService, employee]
  );

  useEffect(() => {
    if (selfService && employee) {
      setRequestForm((prev) => ({ ...prev, employee_id: employee.id }));
      setTab("requests");
    }
  }, [selfService, employee]);

  const enrichedRequests = useMemo(
    () => leaveRequests.map((r) => ({ ...r, employee_name: getEmployeeName(r.employee_id) })),
    [leaveRequests]
  );

  const sortedRequests = useMemo(
    () =>
      filterAndSort(enrichedRequests as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["employee_name", "leave_type", "reason", "status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as Array<LeaveRequest & { employee_name: string }>,
    [enrichedRequests, search, statusFilter, sortField, sortDir]
  );

  const pendingCount = leaveRequests.filter((l) => l.status === "pending").length;
  const approvedCount = leaveRequests.filter((l) => l.status === "approved").length;
  const rejectedCount = leaveRequests.filter((l) => l.status === "rejected").length;
  const balances = useMemo(
    () => listLeaveBalances(tenantId, selfService ? employee?.id : undefined),
    [tenantId, refreshKey, selfService, employee]
  );

  function refresh() {
    setRefreshKey((n) => n + 1);
  }

  function doCreateType() {
    setError("");
    setNotice("");
    if (!typeForm.name.trim() || !typeForm.code.trim()) {
      setError("Leave type name and code are required.");
      return;
    }
    const days = Number(typeForm.days_per_year);
    if (!Number.isFinite(days) || days < 0) {
      setError("Enter a valid number of days per year.");
      return;
    }
    const row = createLeaveType(tenantId, {
      name: typeForm.name.trim(),
      code: typeForm.code.trim().toUpperCase(),
      days_per_year: days,
      paid: typeForm.paid
    });
    persistExtraFields(tenantId, "hrm.leave_type", row.id, extraTypeJson);
    setExtraTypeJson("");
    setTypeForm(emptyTypeForm());
    setNotice("Leave type created.");
    refresh();
  }

  function submitTypeForm(e: React.FormEvent) {
    e.preventDefault();
    askSave({ editing: false, entityLabel: "leave type", onConfirm: doCreateType });
  }

  function doCreateRequest() {
    setError("");
    setNotice("");
    if (!requestForm.employee_id) {
      setError("Select an employee.");
      return;
    }
    if (!requestForm.reason.trim()) {
      setError("Provide a reason for the leave request.");
      return;
    }
    const totalDays = daysBetween(requestForm.start_date, requestForm.end_date);
    if (totalDays <= 0) {
      setError("End date must be on or after the start date.");
      return;
    }
    const selectedType = leaveTypes.find((t) => t.id === requestForm.leave_type_id);
    try {
      const row = createLeaveRequest(tenantId, {
        employee_id: requestForm.employee_id,
        leave_type_id: requestForm.leave_type_id || null,
        leave_type: selectedType?.name ?? "Other",
        start_date: requestForm.start_date,
        end_date: requestForm.end_date,
        total_days: 0,
        reason: requestForm.reason.trim()
      });
      persistExtraFields(tenantId, "hrm.leave_request", row.id, extraRequestJson);
      setExtraRequestJson("");
      if (row.leave_type_id) markLeavePending(row.employee_id, row.leave_type_id, row.total_days);
      setRequestForm({ ...emptyRequestForm(), employee_id: selfService && employee ? employee.id : "" });
      setNotice(`Leave request submitted (${row.total_days} working day(s)).`);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit leave.");
    }
  }

  function submitRequestForm(e: React.FormEvent) {
    e.preventDefault();
    askSave({ editing: false, entityLabel: "leave request", onConfirm: doCreateRequest });
  }

  function handleApprove(id: string, approver: "manager" | "hr") {
    ask({
      title: `Approve leave (${approver})?`,
      message: "Confirm approving this leave request.",
      confirmLabel: "Approve",
      onConfirm: () => {
        const before = getLeaveRequest(id);
        const after = approveLeave(id, approver);
        if (after?.status === "approved" && before?.status !== "approved") {
          consumeLeaveBalance(after.employee_id, after.leave_type_id, after.total_days);
        }
        refresh();
      }
    });
  }

  function handleReject(id: string, approver: "manager" | "hr") {
    ask({
      title: `Reject leave (${approver})?`,
      message: "Confirm rejecting this leave request.",
      confirmLabel: "Reject",
      tone: "danger",
      onConfirm: () => {
        const before = getLeaveRequest(id);
        rejectLeave(id, approver);
        if (before?.leave_type_id) releaseLeavePending(before.employee_id, before.leave_type_id, before.total_days);
        refresh();
      }
    });
  }

  function handleCancel(r: LeaveRequest) {
    ask({
      title: "Cancel leave request?",
      message: `Cancel the ${r.leave_type} request for ${getEmployeeName(r.employee_id)}?`,
      confirmLabel: "Cancel request",
      tone: "danger",
      onConfirm: () => {
        cancelLeave(r.id);
        if (r.status === "pending" && r.leave_type_id) releaseLeavePending(r.employee_id, r.leave_type_id, r.total_days);
        refresh();
      }
    });
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader
        title="Leave Management"
        description={selfService ? "Request leave and track approval status." : "Configure leave types and manage employee leave requests."}
      />
      <ModuleBreadcrumbs />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Pending requests" value={String(pendingCount)} detail="Awaiting approval" icon={ListChecks} tone="amber" />
        <StatTile label="Approved" value={String(approvedCount)} detail="Fully approved" icon={CheckCircle2} tone="mint" />
        <StatTile label="Rejected" value={String(rejectedCount)} detail="Declined requests" icon={XCircle} tone="coral" />
        <StatTile label="Leave types" value={String(leaveTypes.length)} detail="Configured policies" icon={Tag} tone="teal" />
      </div>

      {error ? <p className="mb-4 text-sm font-semibold text-[color:var(--bs-coral)]">{error}</p> : null}
      {notice ? <p className="mb-4 text-sm font-semibold text-emerald-600">{notice}</p> : null}

      <Panel className="mb-5">
        <h2 className="mb-3 text-lg font-bold text-ink">Leave balances (accrual)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                {["Worker", "Type", "Entitled", "Used", "Pending", "Remaining"].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {balances.slice(0, 24).map((b) => {
                const type = leaveTypes.find((t) => t.id === b.leave_type_id);
                return (
                  <tr key={b.id} className="border-b border-line">
                    <td className="px-3 py-2">{getEmployeeName(b.employee_id)}</td>
                    <td className="px-3 py-2">{type?.name ?? "—"}</td>
                    <td className="px-3 py-2">{b.entitled}</td>
                    <td className="px-3 py-2">{b.used}</td>
                    <td className="px-3 py-2">{b.pending}</td>
                    <td className="px-3 py-2 font-semibold">{b.entitled - b.used - b.pending}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {selfService ? null : (
      <div className="mb-6 flex gap-2 border-b border-line">
        {([
          { key: "requests", label: "Leave Requests" },
          { key: "types", label: "Leave Types" }
        ] as { key: Tab; label: string }[]).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition",
              tab === item.key ? "border-ink text-ink" : "border-transparent text-slate-500 hover:text-ink"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      )}

      {tab === "requests" ? (
        <>
          <Panel className="mb-6">
            <h2 className="mb-4 text-lg font-bold text-ink">Apply for leave</h2>
            <form onSubmit={submitRequestForm} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Employee" className="lg:col-span-2">
                {selfService ? (
                  <TextInput readOnly value={employee?.full_name ?? "Not linked"} className="bg-cloud" />
                ) : (
                <SelectInput required value={requestForm.employee_id} onChange={(e) => setRequestForm({ ...requestForm, employee_id: e.target.value })}>
                  <option value="">Select employee…</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_no} — {emp.full_name}
                    </option>
                  ))}
                </SelectInput>
                )}
              </Field>
              <Field label="Leave type">
                <SelectInput value={requestForm.leave_type_id} onChange={(e) => setRequestForm({ ...requestForm, leave_type_id: e.target.value })}>
                  <option value="">Other / unspecified</option>
                  {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name} ({lt.days_per_year} days/yr)
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Total days">
                <TextInput readOnly value={daysBetween(requestForm.start_date, requestForm.end_date)} className="bg-cloud" />
              </Field>
              <Field label="Start date">
                <TextInput required type="date" value={requestForm.start_date} onChange={(e) => setRequestForm({ ...requestForm, start_date: e.target.value })} />
              </Field>
              <Field label="End date">
                <TextInput
                  required
                  type="date"
                  min={requestForm.start_date}
                  value={requestForm.end_date}
                  onChange={(e) => setRequestForm({ ...requestForm, end_date: e.target.value })}
                />
              </Field>
              <Field label="Reason" className="sm:col-span-2 lg:col-span-2">
                <TextArea rows={1} required value={requestForm.reason} onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })} />
              </Field>
              <ExtraFieldsBlock formKey="hrm.leave_request" valueJson={extraRequestJson} onChange={setExtraRequestJson} />
              <div className="sm:col-span-2 lg:col-span-4">
                <Button type="submit">Submit request</Button>
              </div>
            </form>
          </Panel>

          <Panel className="overflow-hidden p-0">
            <div className="p-4">
              <DataListToolbar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search employee, type, reason…"
                filterLabel="statuses"
                filterValue={statusFilter}
                filterOptions={[
                  { value: "pending", label: "pending" },
                  { value: "approved", label: "approved" },
                  { value: "rejected", label: "rejected" },
                  { value: "cancelled", label: "cancelled" }
                ]}
                onFilterChange={setStatusFilter}
                sortValue={sortField}
                sortOptions={[
                  { value: "start_date", label: "Start date" },
                  { value: "employee_name", label: "Employee" },
                  { value: "status", label: "Status" }
                ]}
                onSortChange={setSortField}
                sortDir={sortDir}
                onSortDirChange={setSortDir}
                onExportCsv={() =>
                  exportListCsv({
                    tenantId,
                    module: "hrm",
                    filename: "leave-requests",
                    rows: sortedRequests.map((r) => ({
                      Employee: r.employee_name,
                      Type: r.leave_type,
                      Start: r.start_date,
                      End: r.end_date,
                      Days: r.total_days,
                      Status: r.status
                    }))
                  })
                }
                onExportPdf={() =>
                  exportListPdf({
                    tenantId,
                    module: "hrm",
                    title: "Leave Requests",
                    filename: "leave-requests",
                    columns: ["Employee", "Type", "Dates", "Status"],
                    rows: sortedRequests.map((r) => [r.employee_name, r.leave_type, `${r.start_date} → ${r.end_date}`, r.status])
                  })
                }
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-cloud">
                    {["Employee", "Type", "Dates", "Days", "Reason", "Manager", "HR", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 font-semibold text-slate-600">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRequests.map((r) => (
                    <tr key={r.id} className="border-b border-line align-top">
                      <td className="px-4 py-3 font-medium text-ink">{r.employee_name}</td>
                      <td className="px-4 py-3">{r.leave_type}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.start_date} → {r.end_date}
                      </td>
                      <td className="px-4 py-3">{r.total_days}</td>
                      <td className="px-4 py-3 max-w-[220px] text-slate-500">
                        {r.reason}
                        <ExtraFieldsReadout tenantId={tenantId} formKey="hrm.leave_request" recordId={r.id} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={r.manager_status === "approved" ? "success" : r.manager_status === "rejected" ? "danger" : "warning"}>
                          {r.manager_status ?? "pending"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={r.hr_status === "approved" ? "success" : r.hr_status === "rejected" ? "danger" : "warning"}>
                          {r.hr_status ?? "pending"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3">
                        {r.status === "pending" ? (
                          <div className="flex flex-col gap-1">
                            {selfService ? null : (
                            <>
                            <div className="flex gap-1">
                              {r.manager_status !== "approved" && r.manager_status !== "rejected" ? (
                                <>
                                  <Button className="!min-h-8 !px-2 !text-xs" onClick={() => handleApprove(r.id, "manager")}>
                                    Mgr ✓
                                  </Button>
                                  <Button variant="secondary" className="!min-h-8 !px-2 !text-xs" onClick={() => handleReject(r.id, "manager")}>
                                    Mgr ✕
                                  </Button>
                                </>
                              ) : null}
                            </div>
                            <div className="flex gap-1">
                              {r.hr_status !== "approved" && r.hr_status !== "rejected" ? (
                                <>
                                  <Button className="!min-h-8 !px-2 !text-xs" onClick={() => handleApprove(r.id, "hr")}>
                                    HR ✓
                                  </Button>
                                  <Button variant="secondary" className="!min-h-8 !px-2 !text-xs" onClick={() => handleReject(r.id, "hr")}>
                                    HR ✕
                                  </Button>
                                </>
                              ) : null}
                            </div>
                            </>
                            )}
                            <Button variant="ghost" className="!min-h-8 !px-2 !text-xs" onClick={() => handleCancel(r)}>
                              <Ban className="size-3.5" aria-hidden="true" />
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No actions</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {sortedRequests.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                        No leave requests yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : (
        <>
          <Panel className="mb-6">
            <h2 className="mb-4 text-lg font-bold text-ink">Add leave type</h2>
            <form onSubmit={submitTypeForm} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Name">
                <TextInput required value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} placeholder="e.g. Maternity" />
              </Field>
              <Field label="Code">
                <TextInput required value={typeForm.code} onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })} placeholder="e.g. MAT" />
              </Field>
              <Field label="Days per year">
                <TextInput required type="number" min="0" value={typeForm.days_per_year} onChange={(e) => setTypeForm({ ...typeForm, days_per_year: e.target.value })} />
              </Field>
              <Field label="Paid">
                <SelectInput value={typeForm.paid ? "yes" : "no"} onChange={(e) => setTypeForm({ ...typeForm, paid: e.target.value === "yes" })}>
                  <option value="yes">Paid</option>
                  <option value="no">Unpaid</option>
                </SelectInput>
              </Field>
              <ExtraFieldsBlock formKey="hrm.leave_type" valueJson={extraTypeJson} onChange={setExtraTypeJson} />
              <div className="sm:col-span-2 lg:col-span-4">
                <Button type="submit">Add leave type</Button>
              </div>
            </form>
          </Panel>

          <Panel className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-cloud">
                    {["Name", "Code", "Days / Year", "Paid"].map((h) => (
                      <th key={h} className="px-4 py-3 font-semibold text-slate-600">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaveTypes.map((lt) => (
                    <tr key={lt.id} className="border-b border-line">
                      <td className="px-4 py-3 font-medium text-ink">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="size-4 text-slate-400" aria-hidden="true" />
                          {lt.name}
                        </span>
                        <ExtraFieldsReadout tenantId={tenantId} formKey="hrm.leave_type" recordId={lt.id} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="neutral">{lt.code}</Badge>
                      </td>
                      <td className="px-4 py-3">{lt.days_per_year}</td>
                      <td className="px-4 py-3">
                        <Badge tone={lt.paid ? "success" : "warning"}>{lt.paid ? "Paid" : "Unpaid"}</Badge>
                      </td>
                    </tr>
                  ))}
                  {leaveTypes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                        No leave types configured yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      {dialog}
    </AppShell>
  );
}

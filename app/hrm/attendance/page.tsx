"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CircleCheck, CircleX, Clock3, LogIn, LogOut } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { StatusBadge } from "@/components/common/status-badge";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Button, Field, Panel, SelectInput, StatTile, TextArea, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSelfServiceContext } from "@/lib/auth/current-employee";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  checkInEmployee,
  checkOutEmployee,
  getEmployeeName,
  listAttendance,
  listAttendanceForEmployee,
  listEmployees,
  markAttendance
} from "@/modules/hrm/services/hrm.store";
import type { AttendanceRecord } from "@/modules/hrm/model";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const statusOptions: AttendanceRecord["status"][] = ["present", "absent", "late", "half_day", "leave"];

function emptyForm() {
  return {
    employee_id: "",
    attendance_date: todayIso(),
    status: "present" as AttendanceRecord["status"],
    check_in: "",
    check_out: "",
    notes: ""
  };
}

export default function AttendancePage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { selfService, employee } = getSelfServiceContext(tenantId);
  const { askSave, dialog } = useConfirm();
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [extraJson, setExtraJson] = useState("");
  const [quickEmployeeId, setQuickEmployeeId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("attendance_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const employees = useMemo(() => listEmployees(tenantId), [tenantId]);
  const records = useMemo(
    () => (selfService && employee ? listAttendanceForEmployee(employee.id) : listAttendance(tenantId)),
    [tenantId, refreshKey, selfService, employee]
  );

  useEffect(() => {
    if (selfService && employee) {
      setQuickEmployeeId(employee.id);
      setForm((prev) => ({ ...prev, employee_id: employee.id }));
    }
  }, [selfService, employee]);

  const enriched = useMemo(
    () => records.map((r) => ({ ...r, employee_name: getEmployeeName(r.employee_id) })),
    [records]
  );

  const sortedRecords = useMemo(
    () =>
      filterAndSort(enriched as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["employee_name", "status", "notes"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as Array<AttendanceRecord & { employee_name: string }>,
    [enriched, search, statusFilter, sortField, sortDir]
  );

  const today = todayIso();
  const todaysRecords = useMemo(() => records.filter((r) => r.attendance_date === today), [records, today]);
  const presentToday = todaysRecords.filter((r) => r.status === "present" || r.status === "late" || r.status === "half_day").length;
  const absentToday = todaysRecords.filter((r) => r.status === "absent").length;
  const lateToday = todaysRecords.filter((r) => r.status === "late").length;

  function refresh() {
    setRefreshKey((n) => n + 1);
  }

  function doMark() {
    setError("");
    setNotice("");
    if (!form.employee_id) {
      setError("Select an employee.");
      return;
    }
    const row = markAttendance(tenantId, {
      employee_id: form.employee_id,
      attendance_date: form.attendance_date,
      check_in: form.check_in ? new Date(form.check_in).toISOString() : null,
      check_out: form.check_out ? new Date(form.check_out).toISOString() : null,
      status: form.status,
      notes: form.notes.trim() || null
    });
    persistExtraFields(tenantId, "hrm.attendance", row.id, extraJson);
    setExtraJson("");
    setForm(emptyForm());
    setNotice("Attendance recorded.");
    refresh();
  }

  function submitMark(e: React.FormEvent) {
    e.preventDefault();
    askSave({ editing: false, entityLabel: "attendance record", onConfirm: doMark });
  }

  function handleQuickCheckIn() {
    setError("");
    setNotice("");
    if (!quickEmployeeId) {
      setError("Select an employee to check in.");
      return;
    }
    checkInEmployee(tenantId, quickEmployeeId);
    setNotice(`${getEmployeeName(quickEmployeeId)} checked in for today.`);
    refresh();
  }

  function handleQuickCheckOut() {
    setError("");
    setNotice("");
    if (!quickEmployeeId) {
      setError("Select an employee to check out.");
      return;
    }
    const result = checkOutEmployee(tenantId, quickEmployeeId);
    if (!result) {
      setError("No check-in found for today. Check in first.");
      return;
    }
    setNotice(`${getEmployeeName(quickEmployeeId)} checked out for today.`);
    refresh();
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader
        title="Attendance"
        description={
          selfService
            ? "Check in and out for your shift, and review your attendance history."
            : "Track daily check-ins, check-outs, and attendance status across the workforce."
        }
      />
      <ModuleBreadcrumbs />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Present today" value={String(presentToday)} detail="Checked in or on shift" icon={CircleCheck} tone="mint" />
        <StatTile label="Late today" value={String(lateToday)} detail="Arrived after grace period" icon={Clock3} tone="amber" />
        <StatTile label="Absent today" value={String(absentToday)} detail="No attendance recorded" icon={CircleX} tone="coral" />
        <StatTile label="Total records" value={String(records.length)} detail="All-time attendance entries" icon={CalendarClock} tone="teal" />
      </div>

      {error ? <p className="mb-4 text-sm font-semibold text-[color:var(--bs-coral)]">{error}</p> : null}
      {notice ? <p className="mb-4 text-sm font-semibold text-emerald-600">{notice}</p> : null}

      <div className={`mb-6 grid gap-5 ${selfService ? "" : "lg:grid-cols-[1fr_1.5fr]"}`}>
        <Panel>
          <h2 className="mb-4 text-lg font-bold text-ink">Quick check-in / check-out</h2>
          <div className="space-y-4">
            <Field label="Employee">
              {selfService ? (
                <TextInput readOnly value={employee?.full_name ?? "Not linked"} className="bg-cloud" />
              ) : (
              <SelectInput value={quickEmployeeId} onChange={(e) => setQuickEmployeeId(e.target.value)}>
                <option value="">Select employee…</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employee_no} — {emp.full_name}
                  </option>
                ))}
              </SelectInput>
              )}
            </Field>
            <div className="flex gap-2">
              <Button type="button" onClick={handleQuickCheckIn} className="flex-1">
                <LogIn className="size-4" aria-hidden="true" />
                Check In
              </Button>
              <Button type="button" variant="secondary" onClick={handleQuickCheckOut} className="flex-1">
                <LogOut className="size-4" aria-hidden="true" />
                Check Out
              </Button>
            </div>
            <p className="text-xs text-slate-500">Uses the current time for today ({today}).</p>
          </div>
        </Panel>

        {selfService ? null : (
        <Panel>
          <h2 className="mb-4 text-lg font-bold text-ink">Mark attendance</h2>
          <form onSubmit={submitMark} className="grid gap-4 sm:grid-cols-2">
            <Field label="Employee">
              <SelectInput required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
                <option value="">Select employee…</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employee_no} — {emp.full_name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Date">
              <TextInput required type="date" value={form.attendance_date} onChange={(e) => setForm({ ...form, attendance_date: e.target.value })} />
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AttendanceRecord["status"] })}>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Check in" hint="Optional">
              <TextInput type="datetime-local" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} />
            </Field>
            <Field label="Check out" hint="Optional" className="sm:col-span-2">
              <TextInput type="datetime-local" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <TextArea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional remarks" />
            </Field>
            <ExtraFieldsBlock formKey="hrm.attendance" valueJson={extraJson} onChange={setExtraJson} />
            <div className="sm:col-span-2">
              <Button type="submit">Save attendance</Button>
            </div>
          </form>
        </Panel>
        )}
      </div>

      <Panel className="overflow-hidden p-0">
        <div className="p-4">
          <DataListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search employee, notes…"
            filterLabel="statuses"
            filterValue={statusFilter}
            filterOptions={statusOptions.map((s) => ({ value: s, label: s.replace("_", " ") }))}
            onFilterChange={setStatusFilter}
            sortValue={sortField}
            sortOptions={[
              { value: "attendance_date", label: "Date" },
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
                filename: "attendance",
                rows: sortedRecords.map((r) => ({
                  Date: r.attendance_date,
                  Employee: r.employee_name,
                  Status: r.status,
                  Hours: r.working_hours ?? ""
                }))
              })
            }
            onExportPdf={() =>
              exportListPdf({
                tenantId,
                module: "hrm",
                title: "Attendance",
                filename: "attendance",
                columns: ["Date", "Employee", "Status", "Hours"],
                rows: sortedRecords.map((r) => [r.attendance_date, r.employee_name, r.status, r.working_hours ? `${r.working_hours}h` : "—"])
              })
            }
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                {["Date", "Employee", "Check In", "Check Out", "Status", "Hours", "Notes"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-slate-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRecords.map((r) => (
                <tr key={r.id} className="border-b border-line">
                  <td className="px-4 py-3 font-medium text-ink">{r.attendance_date}</td>
                  <td className="px-4 py-3">{r.employee_name}</td>
                  <td className="px-4 py-3">
                    {r.check_in ? new Date(r.check_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {r.check_out ? new Date(r.check_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3">{r.working_hours ? `${r.working_hours}h` : "—"}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {r.notes ?? "—"}
                    <ExtraFieldsReadout tenantId={tenantId} formKey="hrm.attendance" recordId={r.id} />
                  </td>
                </tr>
              ))}
              {sortedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    No attendance records yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
      {dialog}
    </AppShell>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Hourglass, Send, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
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
  approveTimesheet,
  createTimesheet,
  deleteTimesheet,
  getEmployeeName,
  listEmployees,
  listTimesheets,
  listTimesheetsForEmployee,
  rejectTimesheet,
  submitTimesheet
} from "@/modules/hrm/services/hrm.store";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm() {
  return {
    employee_id: "",
    work_date: todayIso(),
    hours: "8",
    project: "",
    notes: ""
  };
}

export default function TimesheetsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { selfService, employee } = getSelfServiceContext(tenantId);
  const { askSave, askTrash, dialog } = useConfirm();
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [extraJson, setExtraJson] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("work_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const employees = useMemo(() => listEmployees(tenantId), [tenantId]);
  const timesheets = useMemo(
    () => (selfService && employee ? listTimesheetsForEmployee(tenantId, employee.id) : listTimesheets(tenantId)),
    [tenantId, refreshKey, selfService, employee]
  );

  useEffect(() => {
    if (selfService && employee) {
      setForm((prev) => ({ ...prev, employee_id: employee.id }));
    }
  }, [selfService, employee]);

  const enriched = useMemo(
    () => timesheets.map((t) => ({ ...t, employee_name: getEmployeeName(t.employee_id) })),
    [timesheets]
  );

  const sorted = useMemo(
    () =>
      filterAndSort(enriched as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["employee_name", "project", "notes", "status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as Array<(typeof enriched)[number]>,
    [enriched, search, statusFilter, sortField, sortDir]
  );

  const draftCount = timesheets.filter((t) => t.status === "draft").length;
  const submittedCount = timesheets.filter((t) => t.status === "submitted").length;
  const approvedCount = timesheets.filter((t) => t.status === "approved").length;
  const totalHours = timesheets.reduce((sum, t) => sum + t.hours, 0);

  function refresh() {
    setRefreshKey((n) => n + 1);
  }

  function doCreate() {
    setError("");
    setNotice("");
    const hours = Number(form.hours);
    if (!form.employee_id) {
      setError("Select an employee.");
      return;
    }
    if (selfService && employee && form.employee_id !== employee.id) {
      setError("You can only log hours for your own account.");
      return;
    }
    if (!form.work_date) {
      setError("Select a work date.");
      return;
    }
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      setError("Enter valid hours between 0 and 24.");
      return;
    }
    const row = createTimesheet(tenantId, {
      employee_id: form.employee_id,
      work_date: form.work_date,
      hours,
      project: form.project.trim() || null,
      notes: form.notes.trim() || null,
      status: "draft"
    });
    persistExtraFields(tenantId, "hrm.timesheet", row.id, extraJson);
    setExtraJson("");
    setForm({ ...emptyForm(), employee_id: selfService && employee ? employee.id : "" });
    setNotice("Timesheet created as draft.");
    refresh();
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    askSave({ editing: false, entityLabel: "timesheet", onConfirm: doCreate });
  }

  function handleSubmit(id: string) {
    submitTimesheet(id);
    refresh();
  }

  function handleApprove(id: string) {
    approveTimesheet(id);
    refresh();
  }

  function handleReject(id: string) {
    rejectTimesheet(id);
    refresh();
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader
        title="Timesheets"
        description={
          selfService
            ? "Log your hours and submit them to HR for approval."
            : "Log hours worked, submit for approval, and review team timesheets."
        }
      />
      <ModuleBreadcrumbs />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Drafts" value={String(draftCount)} detail="Not yet submitted" icon={ClipboardList} tone="teal" />
        <StatTile label="Pending approval" value={String(submittedCount)} detail="Awaiting manager review" icon={Hourglass} tone="amber" />
        <StatTile label="Approved" value={String(approvedCount)} detail="Confirmed for payroll" icon={CheckCircle2} tone="mint" />
        <StatTile label="Total hours logged" value={totalHours.toFixed(1)} detail="Across all timesheets" icon={ClipboardList} tone="coral" />
      </div>

      {error ? <p className="mb-4 text-sm font-semibold text-[color:var(--bs-coral)]">{error}</p> : null}
      {notice ? <p className="mb-4 text-sm font-semibold text-emerald-600">{notice}</p> : null}

      <Panel className="mb-6">
        <h2 className="mb-4 text-lg font-bold text-ink">Create timesheet</h2>
        <form onSubmit={submitForm} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Employee" className="lg:col-span-2">
            {selfService ? (
              <TextInput readOnly value={employee?.full_name ?? "Not linked"} className="bg-cloud" />
            ) : (
            <SelectInput required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
              <option value="">Select employee…</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employee_no} — {emp.full_name}
                </option>
              ))}
            </SelectInput>
            )}
          </Field>
          <Field label="Work date">
            <TextInput required type="date" value={form.work_date} onChange={(e) => setForm({ ...form, work_date: e.target.value })} />
          </Field>
          <Field label="Hours">
            <TextInput required type="number" min="0" max="24" step="0.5" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
          </Field>
          <Field label="Project" className="lg:col-span-2">
            <TextInput value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="Optional" />
          </Field>
          <Field label="Notes" className="lg:col-span-2">
            <TextArea rows={1} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
          </Field>
          <ExtraFieldsBlock formKey="hrm.timesheet" valueJson={extraJson} onChange={setExtraJson} />
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit">Save timesheet</Button>
          </div>
        </form>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="p-4">
          <DataListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search employee, project…"
            filterLabel="statuses"
            filterValue={statusFilter}
            filterOptions={[
              { value: "draft", label: "draft" },
              { value: "submitted", label: "submitted" },
              { value: "approved", label: "approved" },
              { value: "rejected", label: "rejected" }
            ]}
            onFilterChange={setStatusFilter}
            sortValue={sortField}
            sortOptions={[
              { value: "work_date", label: "Date" },
              { value: "employee_name", label: "Employee" },
              { value: "hours", label: "Hours" },
              { value: "status", label: "Status" }
            ]}
            onSortChange={setSortField}
            sortDir={sortDir}
            onSortDirChange={setSortDir}
            onExportCsv={() =>
              exportListCsv({
                tenantId,
                module: "hrm",
                filename: "timesheets",
                rows: sorted.map((t) => ({
                  Date: t.work_date,
                  Employee: t.employee_name,
                  Project: t.project ?? "",
                  Hours: t.hours,
                  Status: t.status
                }))
              })
            }
            onExportPdf={() =>
              exportListPdf({
                tenantId,
                module: "hrm",
                title: "Timesheets",
                filename: "timesheets",
                columns: ["Date", "Employee", "Hours", "Status"],
                rows: sorted.map((t) => [t.work_date, t.employee_name, String(t.hours), t.status])
              })
            }
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                {["Date", "Employee", "Project", "Hours", "Notes", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-slate-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t.id} className="border-b border-line">
                  <td className="px-4 py-3 font-medium text-ink">{t.work_date}</td>
                  <td className="px-4 py-3">{t.employee_name}</td>
                  <td className="px-4 py-3">{t.project ?? "—"}</td>
                  <td className="px-4 py-3">{t.hours}h</td>
                  <td className="px-4 py-3 text-slate-500">
                    {t.notes ?? "—"}
                    <ExtraFieldsReadout tenantId={tenantId} formKey="hrm.timesheet" recordId={t.id} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {t.status === "draft" ? (
                        <Button className="!min-h-8 !px-2 !text-xs" onClick={() => handleSubmit(t.id)}>
                          <Send className="size-3.5" aria-hidden="true" />
                          Submit
                        </Button>
                      ) : null}
                      {t.status === "submitted" && !selfService ? (
                        <>
                          <Button className="!min-h-8 !px-2 !text-xs" onClick={() => handleApprove(t.id)}>
                            <CheckCircle2 className="size-3.5" aria-hidden="true" />
                            Approve
                          </Button>
                          <Button variant="secondary" className="!min-h-8 !px-2 !text-xs" onClick={() => handleReject(t.id)}>
                            <XCircle className="size-3.5" aria-hidden="true" />
                            Reject
                          </Button>
                        </>
                      ) : null}
                      {selfService ? null : (
                      <RecordRowActions
                        onTrash={() =>
                          askTrash({
                            entityLabel: "timesheet",
                            name: `${t.employee_name} · ${t.work_date}`,
                            onConfirm: () => {
                              deleteTimesheet(t.id);
                              refresh();
                            }
                          })
                        }
                      />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    No timesheets logged yet.
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

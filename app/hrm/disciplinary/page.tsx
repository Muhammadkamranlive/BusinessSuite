"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Badge, Button, Field, Panel, SelectInput, TextArea, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import type { DisciplinarySeverity } from "@/modules/hrm/model";
import {
  createDisciplinaryAction,
  deleteDisciplinaryAction,
  getEmployeeName,
  listDisciplinaryActions,
  listEmployees
} from "@/modules/hrm/services/hrm.store";

const severityTone: Record<DisciplinarySeverity, "warning" | "danger" | "neutral"> = {
  warning: "warning",
  written: "neutral",
  suspension: "danger"
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function DisciplinaryPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  const employees = useMemo(() => listEmployees(tenantId), [tenantId, tick]);
  const actions = useMemo(() => listDisciplinaryActions(tenantId), [tenantId, tick]);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [sortField, setSortField] = useState("action_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [showForm, setShowForm] = useState(false);
  const [extraJson, setExtraJson] = useState("");
  const [form, setForm] = useState({
    employee_id: "",
    action_date: today(),
    reason: "",
    severity: "warning" as DisciplinarySeverity
  });

  const enriched = useMemo(
    () =>
      actions.map((a) => ({
        ...a,
        employee_name: getEmployeeName(a.employee_id)
      })),
    [actions]
  );

  const filtered = useMemo(
    () =>
      filterAndSort(enriched as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["employee_name", "reason", "severity"],
        statusField: "severity",
        statusValue: severityFilter,
        sortField,
        sortDir
      }) as unknown as typeof enriched,
    [enriched, search, severityFilter, sortField, sortDir]
  );

  function doSave() {
    if (!form.employee_id || !form.reason.trim()) return;
    const row = createDisciplinaryAction(tenantId, {
      employee_id: form.employee_id,
      action_date: form.action_date,
      reason: form.reason.trim(),
      severity: form.severity
    });
    persistExtraFields(tenantId, "hrm.disciplinary", row.id, extraJson);
    setExtraJson("");
    setForm({ employee_id: "", action_date: today(), reason: "", severity: "warning" });
    setShowForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: false,
      entityLabel: "disciplinary action",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader
        title="Disciplinary Actions"
        description="Record and track employee disciplinary actions."
        actionLabel={showForm ? undefined : "New action"}
        onAction={() => { setExtraJson(""); setShowForm(true); }}
      />
      <ModuleBreadcrumbs />

      {showForm ? (
        <Panel className="mb-5">
          <h2 className="mb-4 text-lg font-bold text-ink">New disciplinary action</h2>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <Field label="Employee">
              <SelectInput required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
                <option value="">Select employee…</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Action date">
              <TextInput type="date" required value={form.action_date} onChange={(e) => setForm({ ...form, action_date: e.target.value })} />
            </Field>
            <Field label="Severity">
              <SelectInput value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as DisciplinarySeverity })}>
                <option value="warning">Warning</option>
                <option value="written">Written</option>
                <option value="suspension">Suspension</option>
              </SelectInput>
            </Field>
            <Field label="Reason" className="md:col-span-2">
              <TextArea required rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </Field>
            <ExtraFieldsBlock formKey="hrm.disciplinary" valueJson={extraJson} onChange={setExtraJson} />
            <div className="flex items-end gap-2 md:col-span-2">
              <Button type="submit">Save action</Button>
              <Button type="button" variant="secondary" onClick={() => { setExtraJson(""); setShowForm(false); }}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel>
        <DataListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search employee, reason…"
          filterLabel="severities"
          filterValue={severityFilter}
          filterOptions={[
            { value: "warning", label: "warning" },
            { value: "written", label: "written" },
            { value: "suspension", label: "suspension" }
          ]}
          onFilterChange={setSeverityFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "action_date", label: "Date" },
            { value: "severity", label: "Severity" },
            { value: "employee_name", label: "Employee" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "hrm",
              filename: "disciplinary",
              rows: filtered.map((a) => ({
                Date: a.action_date,
                Employee: a.employee_name,
                Severity: a.severity,
                Reason: a.reason
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "hrm",
              title: "Disciplinary Actions",
              filename: "disciplinary",
              columns: ["Date", "Employee", "Severity", "Reason"],
              rows: filtered.map((a) => [a.action_date, a.employee_name, a.severity, a.reason])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Date", "Employee", "Severity", "Reason", ""].map((h) => (
                <th key={h || "a"} className="px-3 py-3 font-semibold text-slate-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-b border-line">
                <td className="px-3 py-3">{a.action_date}</td>
                <td className="px-3 py-3">{a.employee_name}</td>
                <td className="px-3 py-3">
                  <Badge tone={severityTone[a.severity]}>{a.severity}</Badge>
                </td>
                <td className="px-3 py-3">
                  {a.reason}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="hrm.disciplinary" recordId={a.id} />
                </td>
                <td className="px-3 py-3">
                  <RecordRowActions
                    onTrash={() =>
                      askTrash({
                        entityLabel: "disciplinary action",
                        name: a.employee_name,
                        onConfirm: () => {
                          deleteDisciplinaryAction(a.id);
                          refresh();
                        }
                      })
                    }
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                  No disciplinary actions recorded.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Panel>
      {dialog}
    </AppShell>
  );
}

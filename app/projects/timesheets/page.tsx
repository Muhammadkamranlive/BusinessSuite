"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSelfServiceContext, matchesOwnedBy } from "@/lib/auth/current-employee";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  approveProjectTimesheet,
  createProjectTimesheet,
  listProjects,
  listProjectTimesheets,
  submitProjectTimesheet,
  trashProjectTimesheet,
  updateProjectTimesheet,
  type ProjectTimesheet
} from "@/modules/projects/services/projects.store";

function currentWeek() {
  const d = new Date();
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

const empty = { person: "", project_id: "", hours: "", week: currentWeek() };

export default function ProjectTimesheetsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { selfService, employee, profile } = getSelfServiceContext(tenantId);
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<ProjectTimesheet[]>([]);
  const [projects, setProjects] = useState(listProjects(tenantId));
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("week");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<ProjectTimesheet | null>(null);
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listProjectTimesheets(tenantId));
    setProjects(listProjects(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () => {
      const scoped = selfService
        ? rows.filter((r) => matchesOwnedBy(r.person, employee, profile.name))
        : rows;
      return filterAndSort(scoped as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["person", "project_name", "week"],
        sortField,
        sortDir
      }) as unknown as ProjectTimesheet[];
    },
    [rows, search, sortField, sortDir, selfService, employee, profile.name]
  );

  function openCreate() {
    setEditing(null);
    setForm({
      ...empty,
      week: currentWeek(),
      person: selfService ? (employee?.full_name ?? profile.name) : ""
    });
    setExtraJson("");
    setOpenForm(true);
  }

  function openEdit(row: ProjectTimesheet) {
    setEditing(row);
    setForm({
      person: row.person,
      project_id: row.project_id ?? "",
      hours: String(row.hours),
      week: row.week
    });
    setExtraJson(getExtraFieldValues(tenantId, "projects.timesheet", row.id));
    setOpenForm(true);
  }

  function doSave() {
    const person = selfService ? (employee?.full_name ?? profile.name) : form.person.trim();
    if (!person) return;
    const project = projects.find((p) => p.id === form.project_id);
    const payload = {
      person,
      project_id: form.project_id || null,
      project_name: project?.name ?? "—",
      hours: Number(form.hours) || 0,
      week: form.week || currentWeek(),
      status: "draft" as const,
      billable: true
    };
    if (editing) {
      updateProjectTimesheet(editing.id, payload);
      persistExtraFields(tenantId, "projects.timesheet", editing.id, extraJson);
    } else {
      const row = createProjectTimesheet(tenantId, payload);
      persistExtraFields(tenantId, "projects.timesheet", row.id, extraJson);
    }
    setExtraJson("");
    setForm({ ...empty, week: currentWeek() });
    setEditing(null);
    setOpenForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "timesheet",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="projects">
      <PageHeader
        title="Project Timesheets"
        description={selfService ? "Log your hours against the projects you work on." : "Hours logged against tenant projects."}
        actionLabel="Add timesheet"
        onAction={openCreate}
      />
      <ModuleBreadcrumbs />
      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            <Field label="Person">
              {selfService ? (
                <TextInput readOnly value={form.person || employee?.full_name || profile.name} className="bg-cloud" />
              ) : (
              <TextInput value={form.person} onChange={(e) => setForm({ ...form, person: e.target.value })} required />
              )}
            </Field>
            <Field label="Project">
              <SelectInput value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                <option value="">Select…</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Hours">
              <TextInput type="number" min={0} value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
            </Field>
            <Field label="Week">
              <TextInput value={form.week} onChange={(e) => setForm({ ...form, week: e.target.value })} placeholder="2026-W28" />
            </Field>
            <ExtraFieldsBlock formKey="projects.timesheet" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">{editing ? "Update" : "Save"}</Button>
              <Button type="button" variant="secondary" onClick={() => { setExtraJson(""); setEditing(null); setOpenForm(false); }}>Cancel</Button>
            </div>
          </form>
        </Panel>
      ) : null}
      <Panel>
        <DataListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search person, project…"
          sortValue={sortField}
          sortOptions={[
            { value: "week", label: "Week" },
            { value: "person", label: "Person" },
            { value: "hours", label: "Hours" },
            { value: "project_name", label: "Project" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "projects",
              filename: "project-timesheets",
              rows: filtered.map((r) => ({
                Person: r.person,
                Project: r.project_name,
                Hours: r.hours,
                Week: r.week
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "projects",
              title: "Project Timesheets",
              filename: "project-timesheets",
              columns: ["Person", "Project", "Hours", "Week"],
              rows: filtered.map((r) => [r.person, r.project_name, String(r.hours), r.week])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Person", "Project", "Hours", "Week", "Status", ""].map((h) => (
                <th key={h || "a"} className="px-3 py-3 font-semibold text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-line">
                <td className="px-3 py-3 font-medium">
                  {r.person}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="projects.timesheet" recordId={r.id} />
                </td>
                <td className="px-3 py-3">{r.project_name}</td>
                <td className="px-3 py-3">{r.hours}</td>
                <td className="px-3 py-3">{r.week}</td>
                <td className="px-3 py-3">{r.status ?? "draft"}</td>
                <td className="px-3 py-3">
                  {r.status !== "approved" && r.status !== "submitted" ? (
                    <Button type="button" variant="secondary" className="mb-1 !min-h-8 !px-3 !text-xs" onClick={() => { submitProjectTimesheet(r.id); refresh(); }}>Submit</Button>
                  ) : null}
                  {!selfService && r.status === "submitted" ? (
                    <Button type="button" variant="secondary" className="mb-1 !min-h-8 !px-3 !text-xs" onClick={() => { approveProjectTimesheet(r.id); refresh(); }}>Approve</Button>
                  ) : null}
                  <RecordRowActions
                    onEdit={() => openEdit(r)}
                    onTrash={
                      selfService
                        ? undefined
                        : () =>
                      askTrash({
                        entityLabel: "timesheet",
                        name: `${r.person} · ${r.week}`,
                        onConfirm: () => {
                          trashProjectTimesheet(r.id);
                          refresh();
                        }
                      })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      {dialog}
    </AppShell>
  );
}

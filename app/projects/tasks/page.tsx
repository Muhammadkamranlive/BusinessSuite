"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
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
  createProjectTask,
  listProjects,
  listProjectTasks,
  trashProjectTask,
  updateProjectTask,
  updateProjectTaskStatus,
  type ProjectTask
} from "@/modules/projects/services/projects.store";

const empty = { title: "", status: "todo" as ProjectTask["status"], owner: "", due: "", project_id: "" };

export default function ProjectTasksPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { selfService, employee, profile } = getSelfServiceContext(tenantId);
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<ProjectTask[]>([]);
  const [projects, setProjects] = useState(listProjects(tenantId));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("title");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<ProjectTask | null>(null);
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listProjectTasks(tenantId));
    setProjects(listProjects(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () => {
      const scoped = selfService
        ? rows.filter((r) => matchesOwnedBy(r.owner, employee, profile.name))
        : rows;
      return filterAndSort(scoped as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["title", "owner", "status", "due"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as ProjectTask[];
    },
    [rows, search, statusFilter, sortField, sortDir, selfService, employee, profile.name]
  );

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setExtraJson("");
    setOpenForm(true);
  }

  function openEdit(row: ProjectTask) {
    setEditing(row);
    setForm({
      title: row.title,
      status: row.status,
      owner: row.owner,
      due: row.due === "—" ? "" : row.due,
      project_id: row.project_id ?? ""
    });
    setExtraJson(getExtraFieldValues(tenantId, "projects.task", row.id));
    setOpenForm(true);
  }

  function doSave() {
    if (!form.title.trim()) return;
    const payload = {
      title: form.title.trim(),
      status: form.status,
      owner: form.owner.trim() || "—",
      due: form.due || "—",
      project_id: form.project_id || null
    };
    if (editing) {
      updateProjectTask(editing.id, payload);
      persistExtraFields(tenantId, "projects.task", editing.id, extraJson);
    } else {
      const row = createProjectTask(tenantId, payload);
      persistExtraFields(tenantId, "projects.task", row.id, extraJson);
    }
    setExtraJson("");
    setForm(empty);
    setEditing(null);
    setOpenForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "task",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="projects">
      <PageHeader
        title="Tasks"
        description={selfService ? "Work assigned to you — mark tasks done as you finish them." : "Project task board — persisted per company."}
        actionLabel={selfService ? undefined : "Add task"}
        onAction={selfService ? undefined : openCreate}
      />
      <ModuleBreadcrumbs />
      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            <Field label="Title" className="md:col-span-2">
              <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </Field>
            <Field label="Project">
              <SelectInput value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                <option value="">Unassigned</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Owner">
              <TextInput value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
            </Field>
            <Field label="Due">
              <TextInput type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectTask["status"] })}>
                {["todo", "in_progress", "review", "done"].map((s) => <option key={s} value={s}>{s}</option>)}
              </SelectInput>
            </Field>
            <ExtraFieldsBlock formKey="projects.task" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">{editing ? "Update task" : "Save task"}</Button>
              <Button type="button" variant="secondary" onClick={() => { setExtraJson(""); setEditing(null); setOpenForm(false); }}>Cancel</Button>
            </div>
          </form>
        </Panel>
      ) : null}
      <Panel>
        <DataListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search tasks…"
          filterLabel="statuses"
          filterValue={statusFilter}
          filterOptions={[
            { value: "todo", label: "todo" },
            { value: "in_progress", label: "in_progress" },
            { value: "review", label: "review" },
            { value: "done", label: "done" }
          ]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "title", label: "Title" },
            { value: "status", label: "Status" },
            { value: "owner", label: "Owner" },
            { value: "due", label: "Due" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "projects",
              filename: "project-tasks",
              rows: filtered.map((r) => ({
                Title: r.title,
                Project: projects.find((p) => p.id === r.project_id)?.name ?? "",
                Status: r.status,
                Owner: r.owner,
                Due: r.due
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "projects",
              title: "Project Tasks",
              filename: "project-tasks",
              columns: ["Title", "Status", "Owner", "Due"],
              rows: filtered.map((r) => [r.title, r.status, r.owner, r.due])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Task", "Project", "Status", "Owner", "Due", ""].map((h) => (
                <th key={h || "a"} className="px-3 py-3 font-semibold text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-line">
                <td className="px-3 py-3 font-medium">
                  {r.title}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="projects.task" recordId={r.id} />
                </td>
                <td className="px-3 py-3">{projects.find((p) => p.id === r.project_id)?.name ?? "—"}</td>
                <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-3">{r.owner}</td>
                <td className="px-3 py-3">{r.due}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    {r.status !== "done" ? (
                      <Button variant="secondary" className="!min-h-8 !px-3 !text-xs" onClick={() => { updateProjectTaskStatus(tenantId, r.id, "done"); refresh(); }}>
                        Mark done
                      </Button>
                    ) : null}
                    {selfService ? null : (
                    <RecordRowActions
                      onEdit={() => openEdit(r)}
                      onTrash={() =>
                        askTrash({
                          entityLabel: "task",
                          name: r.title,
                          onConfirm: () => {
                            trashProjectTask(r.id);
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
          </tbody>
        </table>
      </Panel>
      {dialog}
    </AppShell>
  );
}

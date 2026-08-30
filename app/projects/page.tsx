"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Clock, KanbanSquare, Network } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { ModuleStartGuide } from "@/components/guides/module-start-guide";
import { PageHeader } from "@/components/common/page-header";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Badge, Button, Field, Panel, SectionHeader, SelectInput, StatTile, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSelfServiceContext } from "@/lib/auth/current-employee";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { money } from "@/lib/utils";
import { listCustomers } from "@/modules/crm/services/crm.store";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createProject,
  listProjects,
  listProjectTasks,
  projectStats,
  trashProject,
  updateProject,
  type Project
} from "@/modules/projects/services/projects.store";

const empty = {
  name: "",
  customer_name: "",
  status: "planned" as Project["status"],
  budget: "",
  progress: "0"
};

export default function ProjectsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const router = useRouter();
  const { selfService } = getSelfServiceContext(tenantId);
  const { askSave, askTrash, dialog } = useConfirm();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState(projectStats(tenantId));
  const [tasks, setTasks] = useState(listProjectTasks(tenantId));
  const [customers, setCustomers] = useState(listCustomers(tenantId));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setProjects(listProjects(tenantId));
    setStats(projectStats(tenantId));
    setTasks(listProjectTasks(tenantId));
    setCustomers(listCustomers(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  useEffect(() => {
    if (selfService) router.replace("/projects/tasks");
  }, [selfService, router]);

  const filtered = useMemo(
    () =>
      filterAndSort(projects as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["name", "customer_name", "project_no", "status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as Project[],
    [projects, search, statusFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(project: Project) {
    setEditing(project);
    setForm({
      name: project.name,
      customer_name: project.customer_name,
      status: project.status,
      budget: String(project.budget),
      progress: String(project.progress)
    });
    setExtraJson(getExtraFieldValues(tenantId, "projects.project", project.id));
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    setError("");
    if (!form.name.trim()) {
      setError("Project name is required.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      customer_name: form.customer_name.trim() || "—",
      status: form.status,
      budget: Number(form.budget) || 0,
      progress: Math.min(100, Math.max(0, Number(form.progress) || 0))
    };
    if (editing) {
      updateProject(editing.id, payload);
      persistExtraFields(tenantId, "projects.project", editing.id, extraJson);
    } else {
      const row = createProject(tenantId, payload);
      persistExtraFields(tenantId, "projects.project", row.id, extraJson);
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
      entityLabel: "project",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="projects">
      <PageHeader title="Projects" description="Tenant delivery portfolio — live store, not demo tiles." actionLabel="New project" onAction={openCreate} />
      <ModuleBreadcrumbs />
      <ModuleStartGuide module="projects" />
      <div className="grid gap-4 md:grid-cols-4">
        <StatTile label="Projects" value={String(stats.projects)} detail={`${stats.active} active`} icon={Network} tone="teal" />
        <StatTile label="Tasks" value={String(stats.tasks)} detail="Open + completed" icon={KanbanSquare} tone="coral" />
        <StatTile label="Timesheets" value={`${stats.hours}h`} detail="Logged hours" icon={Clock} tone="amber" />
        <StatTile label="Budget" value={money(stats.budget)} detail="Across portfolio" icon={ClipboardCheck} tone="mint" />
      </div>

      {openForm ? (
        <Panel className="mt-5">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <Field label="Name" className="md:col-span-2">
              <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Customer">
              <SelectInput value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })}>
                <option value="">Select or type…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Or type customer">
              <TextInput value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Project["status"] })}>
                {["planned", "active", "review", "done"].map((s) => <option key={s} value={s}>{s}</option>)}
              </SelectInput>
            </Field>
            <Field label="Budget">
              <TextInput type="number" min={0} value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            </Field>
            <Field label="Progress %">
              <TextInput type="number" min={0} max={100} value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} />
            </Field>
            <ExtraFieldsBlock formKey="projects.project" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">{editing ? "Update project" : "Save project"}</Button>
              <Button type="button" variant="secondary" onClick={() => { setExtraJson(""); setEditing(null); setOpenForm(false); }}>Cancel</Button>
            </div>
          </form>
        </Panel>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel>
          <SectionHeader title="Project portfolio" eyebrow="Delivery" />
          <DataListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search projects…"
            filterLabel="statuses"
            filterValue={statusFilter}
            filterOptions={[
              { value: "planned", label: "planned" },
              { value: "active", label: "active" },
              { value: "review", label: "review" },
              { value: "done", label: "done" }
            ]}
            onFilterChange={setStatusFilter}
            sortValue={sortField}
            sortOptions={[
              { value: "name", label: "Name" },
              { value: "status", label: "Status" },
              { value: "budget", label: "Budget" },
              { value: "progress", label: "Progress" }
            ]}
            onSortChange={setSortField}
            sortDir={sortDir}
            onSortDirChange={setSortDir}
            onExportCsv={() =>
              exportListCsv({
                tenantId,
                module: "projects",
                filename: "projects",
                rows: filtered.map((p) => ({
                  No: p.project_no,
                  Name: p.name,
                  Customer: p.customer_name,
                  Status: p.status,
                  Budget: p.budget,
                  Progress: p.progress
                }))
              })
            }
            onExportPdf={() =>
              exportListPdf({
                tenantId,
                module: "projects",
                title: "Projects",
                filename: "projects",
                columns: ["No", "Name", "Status", "Progress"],
                rows: filtered.map((p) => [p.project_no, p.name, p.status, `${p.progress}%`])
              })
            }
          />
          <div className="grid gap-3">
            {filtered.length === 0 ? <p className="text-sm text-slate-500">No projects yet.</p> : null}
            {filtered.map((project) => (
              <div key={project.id} className="rounded-md border border-line bg-cloud p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-bold text-ink">{project.name}</p>
                    <p className="text-sm text-slate-500">{project.project_no} · {project.customer_name}</p>
                  </div>
                  <Badge tone={project.status === "active" ? "success" : project.status === "review" ? "warning" : "neutral"}>{project.status}</Badge>
                </div>
                <div className="mt-4 h-2 rounded-full bg-white">
                  <div className="h-2 rounded-full bg-teal" style={{ width: `${project.progress}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-sm text-slate-600">
                  <span>{money(project.budget)} budget</span>
                  <span>{project.progress}% complete</span>
                </div>
                <ExtraFieldsReadout tenantId={tenantId} formKey="projects.project" recordId={project.id} />
                <div className="mt-3">
                  <RecordRowActions
                    onEdit={() => openEdit(project)}
                    onTrash={() =>
                      askTrash({
                        entityLabel: "project",
                        name: project.name,
                        onConfirm: () => {
                          trashProject(project.id);
                          refresh();
                        }
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Recent tasks" eyebrow="Project operations" />
          <ul className="space-y-2 text-sm">
            {tasks.slice(0, 8).map((t) => (
              <li key={t.id} className="flex justify-between gap-2 rounded-md border border-line bg-cloud px-3 py-2">
                <span className="font-medium text-ink">{t.title}</span>
                <span className="capitalize text-slate-500">{t.status} · {t.owner}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      {dialog}
    </AppShell>
  );
}

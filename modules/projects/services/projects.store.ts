import type { TenantEntity, UUID } from "@/modules/core/types";
import { generateDocumentNumber } from "@/modules/core/services/numbering.service";
import { bindTrashRestore, trashEntityInCollection, updateEntityInCollection } from "@/modules/core/services/entity-crud";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";
import { queueOpsRemoteSync, registerOpsModule } from "@/modules/ops/services/ops-remote";

function now() { return new Date().toISOString(); }
function id() { return crypto.randomUUID(); }

const STORAGE_KEY = "businesssuite:projects:v3";
const STORAGE_VERSION = 3;

let projects: Project[] = [];
let tasks: ProjectTask[] = [];
let timesheets: ProjectTimesheet[] = [];

let hydrated = false;

function persist() {
  savePersisted(STORAGE_KEY, { version: STORAGE_VERSION, projects, tasks, timesheets });
  queueOpsRemoteSync();
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  const snap = loadPersisted<{ version: number; projects: Project[]; tasks: ProjectTask[]; timesheets: ProjectTimesheet[] }>(STORAGE_KEY);
  if (snap?.version === STORAGE_VERSION && Array.isArray(snap.projects)) {
    projects = snap.projects;
    tasks = snap.tasks ?? [];
    timesheets = snap.timesheets ?? [];
  }
}

export interface Project extends TenantEntity {
  project_no: string;
  name: string;
  customer_name: string;
  status: "planned" | "active" | "review" | "done";
  budget: number;
  progress: number;
}

export interface ProjectTask extends TenantEntity {
  project_id?: UUID | null;
  title: string;
  status: "todo" | "in_progress" | "review" | "done";
  owner: string;
  due: string;
}

export interface ProjectTimesheet extends TenantEntity {
  person: string;
  project_id?: UUID | null;
  project_name: string;
  hours: number;
  week: string;
  status?: "draft" | "submitted" | "approved" | "rejected";
  billable?: boolean;
  rate?: number;
}

export function listProjects(tenantId: UUID) {
  ensureHydrated();
  return projects.filter((p) => p.tenant_id === tenantId && p.is_active !== false);
}

export function createProject(tenantId: UUID, data: Omit<Project, "id" | "tenant_id" | "project_no" | "created_at" | "updated_at">) {
  ensureHydrated();
  const row: Project = {
    ...data,
    id: id(),
    tenant_id: tenantId,
    project_no: generateDocumentNumber(tenantId, "project"),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  projects.unshift(row);
  persist();
  return row;
}

export function listProjectTasks(tenantId: UUID) {
  ensureHydrated();
  return tasks.filter((t) => t.tenant_id === tenantId && t.is_active !== false);
}

export function createProjectTask(tenantId: UUID, data: Omit<ProjectTask, "id" | "tenant_id" | "created_at" | "updated_at">) {
  ensureHydrated();
  const row: ProjectTask = { ...data, id: id(), tenant_id: tenantId, created_at: now(), updated_at: now(), is_active: true };
  tasks.unshift(row);
  persist();
  return row;
}

export function updateProjectTaskStatus(tenantId: UUID, taskId: UUID, status: ProjectTask["status"]) {
  ensureHydrated();
  const task = tasks.find((t) => t.id === taskId && t.tenant_id === tenantId);
  if (!task) return null;
  task.status = status;
  task.updated_at = now();
  persist();
  return task;
}

export function listProjectTimesheets(tenantId: UUID) {
  ensureHydrated();
  return timesheets.filter((t) => t.tenant_id === tenantId && t.is_active !== false);
}

export function createProjectTimesheet(tenantId: UUID, data: Omit<ProjectTimesheet, "id" | "tenant_id" | "created_at" | "updated_at">) {
  ensureHydrated();
  const row: ProjectTimesheet = { ...data, id: id(), tenant_id: tenantId, created_at: now(), updated_at: now(), is_active: true };
  timesheets.unshift(row);
  persist();
  return row;
}

export function submitProjectTimesheet(id: UUID) {
  ensureHydrated();
  const row = timesheets.find((t) => t.id === id);
  if (!row) return null;
  row.status = "submitted";
  row.updated_at = now();
  persist();
  return row;
}

export function approveProjectTimesheet(id: UUID) {
  ensureHydrated();
  const row = timesheets.find((t) => t.id === id);
  if (!row) return null;
  row.status = "approved";
  row.updated_at = now();
  persist();
  return row;
}

export function projectStats(tenantId: UUID) {
  const list = listProjects(tenantId);
  const taskList = listProjectTasks(tenantId);
  const sheets = listProjectTimesheets(tenantId);
  return {
    projects: list.length,
    active: list.filter((p) => p.status === "active").length,
    tasks: taskList.length,
    hours: sheets.reduce((s, t) => s + t.hours, 0),
    budget: list.reduce((s, p) => s + p.budget, 0)
  };
}


const projectRef = { get: () => projects, set: (rows: Project[]) => { projects = rows; }, persist, module: "projects", entityName: "project", labelOf: (row: Project) => `${row.project_no} · ${row.name}` };
const taskRef = { get: () => tasks, set: (rows: ProjectTask[]) => { tasks = rows; }, persist, module: "projects", entityName: "task", labelOf: (row: ProjectTask) => row.title };
const timesheetRef = { get: () => timesheets, set: (rows: ProjectTimesheet[]) => { timesheets = rows; }, persist, module: "projects", entityName: "timesheet", labelOf: (row: ProjectTimesheet) => `${row.person} · ${row.project_name}` };

bindTrashRestore(projectRef);
bindTrashRestore(taskRef);
bindTrashRestore(timesheetRef);

export function updateProject(id: UUID, data: Partial<Project>) { ensureHydrated(); return updateEntityInCollection(projectRef, id, data); }
export function trashProject(id: UUID) { ensureHydrated(); return trashEntityInCollection(projectRef, id); }
export function updateProjectTask(id: UUID, data: Partial<ProjectTask>) { ensureHydrated(); return updateEntityInCollection(taskRef, id, data); }
export function trashProjectTask(id: UUID) { ensureHydrated(); return trashEntityInCollection(taskRef, id); }
export function updateProjectTimesheet(id: UUID, data: Partial<ProjectTimesheet>) { ensureHydrated(); return updateEntityInCollection(timesheetRef, id, data); }
export function trashProjectTimesheet(id: UUID) { ensureHydrated(); return trashEntityInCollection(timesheetRef, id); }

registerOpsModule({
  build: () => ({
    projects: projects as unknown as Record<string, unknown>[],
    projectTasks: tasks as unknown as Record<string, unknown>[],
    projectTimesheets: timesheets as unknown as Record<string, unknown>[]
  }),
  apply: (snapshot) => {
    if (snapshot.projects) projects = snapshot.projects as unknown as Project[];
    if (snapshot.projectTasks) tasks = snapshot.projectTasks as unknown as ProjectTask[];
    if (snapshot.projectTimesheets) timesheets = snapshot.projectTimesheets as unknown as ProjectTimesheet[];
    savePersisted(STORAGE_KEY, { version: STORAGE_VERSION, projects, tasks, timesheets });
  }
});

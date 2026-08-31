import type { UUID } from "@/modules/core/types";
import {
  allowedDocumentExtensions,
  hrTeamDocumentRequirementId,
  type AssignedScope,
  type DocumentAssignment,
  type DocumentAssignmentStatus,
  type DocumentCategory,
  type DocumentChangeEvent,
  type DocumentHistoryAction,
  type DocumentRequirement,
  type DocumentReviewStatus,
  type ManagedDocument
} from "@/modules/documents/model";
import { deleteDocumentBlob, uploadDocumentFile } from "@/modules/documents/services/document-storage";
import { createHrNotification, listEmployees } from "@/modules/hrm/services/hrm.store";
import { tenants as demoTenants } from "@/lib/demo-data";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";

const STORAGE_KEY = "businesssuite:documents:v1";
const DEMO_TENANT_SLUGS = demoTenants.map((t) => t.id);

type Snapshot = {
  version: 1 | 2;
  requirements: DocumentRequirement[];
  documents: ManagedDocument[];
  assignments?: DocumentAssignment[];
  history?: DocumentChangeEvent[];
};

function now() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID();
}

function seedRequirements(tenantId: UUID): DocumentRequirement[] {
  const base = (partial: Omit<DocumentRequirement, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active">) =>
    ({
      ...partial,
      id: id(),
      tenant_id: tenantId,
      created_at: now(),
      updated_at: now(),
      is_active: true
    }) as DocumentRequirement;

  return [
    base({
      title: "CNIC / National ID",
      description: "Clear scan of front and back of national identity card.",
      category: "identity",
      employment_types: [],
      allowed_extensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
      required: true,
      source: "system"
    }),
    base({
      title: "Signed employment contract",
      description: "Signed offer / employment agreement PDF.",
      category: "employment",
      employment_types: ["full_time", "part_time", "contract"],
      allowed_extensions: [".pdf", ".doc", ".docx"],
      required: true,
      source: "system"
    }),
    base({
      title: "Educational certificates",
      description: "Degrees, diplomas, or professional certifications.",
      category: "employment",
      employment_types: [],
      allowed_extensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
      required: false,
      source: "system"
    }),
    base({
      title: "Bank account details",
      description: "Cancelled cheque or bank letter for salary disbursement.",
      category: "payroll",
      employment_types: [],
      allowed_extensions: [".pdf", ".jpg", ".jpeg", ".png"],
      required: true,
      source: "system"
    }),
    base({
      title: "Tax / NTN certificate",
      description: "Optional tax registration or NTN proof.",
      category: "compliance",
      employment_types: ["full_time"],
      allowed_extensions: [".pdf", ".jpg", ".jpeg", ".png"],
      required: false,
      source: "system"
    }),
    base({
      title: "Policy acknowledgement",
      description: "Signed employee handbook / code of conduct acknowledgement.",
      category: "policy",
      employment_types: [],
      allowed_extensions: [".pdf", ".doc", ".docx"],
      required: true,
      source: "system"
    })
  ];
}

let requirements: DocumentRequirement[] = [];
let documents: ManagedDocument[] = [];
let assignments: DocumentAssignment[] = [];
let history: DocumentChangeEvent[] = [];
let hydrated = false;

function ensureSeeded() {
  for (const tenant of DEMO_TENANT_SLUGS) {
    if (!requirements.some((r) => r.tenant_id === tenant && r.source === "system")) {
      requirements.push(...seedRequirements(tenant));
    }
  }
}

function seedDemoDocumentsIfEmpty(tenantId: UUID) {
  if (documents.some((d) => d.tenant_id === tenantId && !d.deleted)) return;
  const employees = listEmployees(tenantId).filter((e) => e.status === "active" || e.status === "onboarding");
  const reqs = requirements.filter((r) => r.tenant_id === tenantId && r.is_active !== false);
  const employee = employees[0];
  const requirement = reqs.find((r) => r.required) ?? reqs[0];
  if (!employee || !requirement) return;

  const demoPath = `tenants/${tenantId}/employees/${employee.id}/documents/demo-seed.pdf`;
  documents.unshift({
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    employee_id: employee.id,
    employee_name: employee.full_name,
    employee_email: employee.email,
    requirement_id: requirement.id,
    requirement_title: requirement.title,
    category: requirement.category,
    file_name: "demo-id-scan.pdf",
    file_type: "application/pdf",
    file_size: 245_760,
    extension: ".pdf",
    storage_path: demoPath,
    download_url: "#demo-seed",
    status: "verified",
    deleted: false,
    source: "employee",
    uploaded_at: now()
  });
  persist();
}

function persist() {
  if (typeof window === "undefined") return;
  const snap: Snapshot = { version: 2, requirements, documents, assignments, history };
  savePersisted(STORAGE_KEY, snap);
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  ensureSeeded();
  if (typeof window === "undefined") return;
  try {
    const raw = loadPersisted<Snapshot>(STORAGE_KEY);
    if (!raw) {
      persist();
      return;
    }
    const snap = raw;
    if (snap.requirements?.length) requirements = snap.requirements;
    if (snap.documents?.length) documents = snap.documents;
    if (snap.assignments?.length) assignments = snap.assignments;
    if (snap.history?.length) history = snap.history;
    ensureSeeded();
    for (const tenant of DEMO_TENANT_SLUGS) {
      seedDemoDocumentsIfEmpty(tenant);
    }
  } catch {
    persist();
  }
}

export function listDocumentRequirements(tenantId: UUID) {
  ensureHydrated();
  return requirements.filter((r) => r.tenant_id === tenantId && r.is_active !== false);
}

export function listActiveRequirements(tenantId: UUID) {
  return listDocumentRequirements(tenantId);
}

export function createDocumentRequirement(
  tenantId: UUID,
  data: Omit<DocumentRequirement, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active" | "source">
) {
  ensureHydrated();
  const row: DocumentRequirement = {
    ...data,
    id: id(),
    tenant_id: tenantId,
    source: "admin",
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  requirements.unshift(row);
  persist();
  return row;
}

export function archiveDocumentRequirement(requirementId: UUID) {
  ensureHydrated();
  const row = requirements.find((r) => r.id === requirementId);
  if (!row || row.source !== "admin") return null;
  row.is_active = false;
  row.updated_at = now();
  persist();
  return row;
}

function pushHistory(input: Omit<DocumentChangeEvent, "id" | "created_at">) {
  const event: DocumentChangeEvent = {
    ...input,
    id: id(),
    created_at: now()
  };
  history.unshift(event);
  return event;
}

export function listDocumentAssignments(
  tenantId: UUID,
  opts?: { employeeId?: string; status?: DocumentAssignmentStatus }
) {
  ensureHydrated();
  return assignments.filter((row) => {
    if (row.tenant_id !== tenantId || row.is_active === false) return false;
    if (opts?.employeeId && row.employee_id !== opts.employeeId) return false;
    if (opts?.status && row.status !== opts.status) return false;
    return true;
  });
}

export function listDocumentHistory(
  tenantId: UUID,
  opts?: { employeeId?: string; assignmentId?: string; requirementId?: string }
) {
  ensureHydrated();
  return history.filter((row) => {
    if (row.tenant_id !== tenantId) return false;
    if (opts?.employeeId && row.employee_id !== opts.employeeId) return false;
    if (opts?.assignmentId && row.assignment_id !== opts.assignmentId) return false;
    if (opts?.requirementId && row.requirement_id !== opts.requirementId) return false;
    return true;
  });
}

export function getDocumentRequirement(tenantId: UUID, requirementId: string) {
  return listActiveRequirements(tenantId).find((r) => r.id === requirementId) ?? null;
}

export async function assignDocumentType(input: {
  tenantId: UUID;
  actorEmail: string;
  actorName: string;
  requirementId: string;
  note?: string;
  scope: AssignedScope;
  employeeId?: string;
  departmentId?: string;
  templateFile?: File | null;
  onProgress?: (pct: number) => void;
}) {
  ensureHydrated();
  const requirement = getDocumentRequirement(input.tenantId, input.requirementId);
  if (!requirement) throw new Error("Select a document type first.");

  let targets = listEmployees(input.tenantId).filter((e) => e.status === "active" || e.status === "onboarding");
  if (input.scope === "single") {
    targets = targets.filter((e) => e.id === input.employeeId);
  } else if (input.scope === "department") {
    targets = targets.filter((e) => e.department_id === input.departmentId);
  }
  if (!targets.length) throw new Error("No employees match the assignment target.");

  let templateFileName: string | null = null;
  let templateUrl: string | null = null;
  if (input.templateFile) {
    const uploaded = await uploadDocumentFile({
      tenantId: input.tenantId,
      ownerKey: `hr-team/${input.actorEmail.replace(/[^a-z0-9]/gi, "-")}`,
      file: input.templateFile,
      prefix: "templates",
      onProgress: input.onProgress
    });
    templateFileName = uploaded.fileName;
    templateUrl = uploaded.downloadURL;
  }

  const rows: DocumentAssignment[] = targets.map((employee) => ({
    id: id(),
    tenant_id: input.tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    requirement_id: requirement.id,
    requirement_title: requirement.title,
    category: requirement.category,
    employee_id: employee.id,
    employee_name: employee.full_name,
    employee_email: employee.email,
    assigned_by: input.actorEmail,
    assigned_by_name: input.actorName,
    assigned_scope: input.scope,
    assigned_department_id: input.departmentId ?? null,
    team_note: input.note?.trim() || null,
    status: "pending",
    document_id: null,
    template_file_name: templateFileName,
    template_download_url: templateUrl
  }));

  assignments.unshift(...rows);
  for (const row of rows) {
    pushHistory({
      tenant_id: input.tenantId,
      assignment_id: row.id,
      employee_id: row.employee_id,
      requirement_id: requirement.id,
      action: "assigned",
      actor_email: input.actorEmail,
      actor_name: input.actorName,
      from_label: input.actorName,
      to_label: row.employee_name,
      message: input.note?.trim()
        ? `${input.actorName} assigned “${requirement.title}” to ${row.employee_name}. Note: ${input.note.trim()}`
        : `${input.actorName} assigned “${requirement.title}” to ${row.employee_name}.`
    });
  }
  persist();
  try {
    createHrNotification(input.tenantId, {
      title: "Document type assigned",
      body: `“${requirement.title}” assigned to ${rows.length} employee${rows.length === 1 ? "" : "s"}.`,
      read: false
    });
  } catch {
    /* optional */
  }
  return rows;
}

export function listManagedDocuments(tenantId: UUID, opts?: { includeDeleted?: boolean; employeeId?: string }) {
  ensureHydrated();
  seedDemoDocumentsIfEmpty(tenantId);
  return documents.filter((d) => {
    if (d.tenant_id !== tenantId) return false;
    if (!opts?.includeDeleted && d.deleted) return false;
    if (opts?.employeeId && d.employee_id !== opts.employeeId) return false;
    return d.is_active !== false;
  });
}

export function listDeletedDocuments(tenantId: UUID) {
  ensureHydrated();
  return documents.filter((d) => d.tenant_id === tenantId && d.deleted);
}

export function documentStats(tenantId: UUID) {
  const reqs = listActiveRequirements(tenantId);
  const docs = listManagedDocuments(tenantId);
  const deleted = listDeletedDocuments(tenantId);
  return {
    requirements: reqs.length,
    requiredCount: reqs.filter((r) => r.required).length,
    uploaded: docs.length,
    needsReview: docs.filter((d) => d.status === "needs-review" || d.status === "uploaded").length,
    verified: docs.filter((d) => d.status === "verified").length,
    pendingAssignments: listDocumentAssignments(tenantId, { status: "pending" }).length,
    inBin: deleted.length
  };
}

export async function saveEmployeeDocument(input: {
  tenantId: UUID;
  employeeId: UUID;
  requirementId: string;
  file: File;
  assignmentId?: string;
  actorEmail?: string;
  actorName?: string;
  onProgress?: (pct: number) => void;
}) {
  ensureHydrated();
  const employee = listEmployees(input.tenantId).find((e) => e.id === input.employeeId);
  if (!employee) throw new Error("Employee not found.");
  const requirement = listActiveRequirements(input.tenantId).find((r) => r.id === input.requirementId);
  if (!requirement) throw new Error("Document type not found.");

  const assignment = input.assignmentId
    ? assignments.find((row) => row.id === input.assignmentId)
    : assignments.find(
        (row) =>
          row.tenant_id === input.tenantId &&
          row.employee_id === input.employeeId &&
          row.requirement_id === input.requirementId &&
          row.status === "pending"
      );

  const extension = input.file.name.includes(".") ? input.file.name.slice(input.file.name.lastIndexOf(".")).toLowerCase() : "";
  if (!requirement.allowed_extensions.includes(extension)) {
    throw new Error(`This type accepts ${requirement.allowed_extensions.join(", ")} only.`);
  }

  const uploaded = await uploadDocumentFile({
    tenantId: input.tenantId,
    ownerKey: `employees/${employee.id}`,
    file: input.file,
    onProgress: input.onProgress
  });

  const row: ManagedDocument = {
    id: id(),
    tenant_id: input.tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    employee_id: employee.id,
    employee_name: employee.full_name,
    employee_email: employee.email,
    requirement_id: requirement.id,
    requirement_title: requirement.title,
    category: requirement.category,
    file_name: uploaded.fileName,
    file_type: uploaded.fileType,
    file_size: uploaded.fileSize,
    extension: uploaded.extension,
    storage_path: uploaded.storagePath,
    download_url: uploaded.downloadURL,
    status: "uploaded",
    deleted: false,
    deleted_at: null,
    source: "employee",
    assigned_by: assignment?.assigned_by ?? null,
    assigned_scope: assignment?.assigned_scope ?? null,
    assigned_department_id: assignment?.assigned_department_id ?? null,
    team_note: assignment?.team_note ?? null,
    uploaded_at: now(),
    assignment_id: assignment?.id ?? null
  };
  documents.unshift(row);

  if (assignment) {
    assignment.status = "uploaded";
    assignment.document_id = row.id;
    assignment.updated_at = now();
    const actorName = input.actorName || employee.full_name;
    pushHistory({
      tenant_id: input.tenantId,
      assignment_id: assignment.id,
      employee_id: employee.id,
      requirement_id: requirement.id,
      action: "uploaded",
      actor_email: input.actorEmail || employee.email,
      actor_name: actorName,
      from_label: assignment.assigned_by_name,
      to_label: employee.full_name,
      message: `${actorName} uploaded “${uploaded.fileName}” for “${requirement.title}”.`
    });
  }

  persist();
  try {
    createHrNotification(input.tenantId, {
      title: "Document uploaded",
      body: `${employee.full_name} uploaded “${requirement.title}”.`,
      read: false
    });
  } catch {
    // optional
  }
  return row;
}

export async function assignHrDocument(input: {
  tenantId: UUID;
  actorEmail: string;
  title: string;
  note?: string;
  file: File;
  scope: AssignedScope;
  employeeId?: string;
  departmentId?: string;
  onProgress?: (pct: number) => void;
}) {
  ensureHydrated();
  let targets = listEmployees(input.tenantId).filter((e) => e.status === "active" || e.status === "onboarding");
  if (input.scope === "single") {
    targets = targets.filter((e) => e.id === input.employeeId);
  } else if (input.scope === "department") {
    targets = targets.filter((e) => e.department_id === input.departmentId);
  }
  if (!targets.length) throw new Error("No employees match the assignment target.");

  const uploaded = await uploadDocumentFile({
    tenantId: input.tenantId,
    ownerKey: `hr-team/${input.actorEmail.replace(/[^a-z0-9]/gi, "-")}`,
    file: input.file,
    prefix: "assigned",
    onProgress: input.onProgress
  });

  const rows: ManagedDocument[] = targets.map((employee) => ({
    id: id(),
    tenant_id: input.tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    employee_id: employee.id,
    employee_name: employee.full_name,
    employee_email: employee.email,
    requirement_id: hrTeamDocumentRequirementId,
    requirement_title: input.title.trim() || uploaded.fileName,
    category: "other" as DocumentCategory,
    file_name: uploaded.fileName,
    file_type: uploaded.fileType,
    file_size: uploaded.fileSize,
    extension: uploaded.extension,
    storage_path: uploaded.storagePath,
    download_url: uploaded.downloadURL,
    status: "verified" as DocumentReviewStatus,
    deleted: false,
    deleted_at: null,
    source: "hr-team" as const,
    assigned_by: input.actorEmail,
    assigned_scope: input.scope,
    assigned_department_id: input.departmentId ?? null,
    team_note: input.note?.trim() || null,
    uploaded_at: now()
  }));

  documents.unshift(...rows);
  persist();
  try {
    createHrNotification(input.tenantId, {
      title: "HR document assigned",
      body: `“${input.title || uploaded.fileName}” sent to ${rows.length} employee${rows.length === 1 ? "" : "s"}.`,
      read: false
    });
  } catch {
    // optional
  }
  return rows;
}

export function updateManagedDocument(
  documentId: UUID,
  patch: Partial<Pick<ManagedDocument, "requirement_title" | "category" | "status">>,
  actor?: { email: string; name: string }
) {
  ensureHydrated();
  const row = documents.find((d) => d.id === documentId);
  if (!row) return null;
  const prev = row.status;
  Object.assign(row, patch, { updated_at: now() });
  if (patch.status && patch.status !== prev && row.assignment_id) {
    const assignment = assignments.find((a) => a.id === row.assignment_id);
    if (assignment) {
      const nextStatus: DocumentAssignmentStatus =
        patch.status === "verified" ? "verified" : patch.status === "rejected" ? "rejected" : "uploaded";
      assignment.status = nextStatus;
      assignment.updated_at = now();
      const action: DocumentHistoryAction =
        patch.status === "verified" ? "verified" : patch.status === "rejected" ? "rejected" : "note";
      pushHistory({
        tenant_id: row.tenant_id,
        assignment_id: assignment.id,
        employee_id: row.employee_id,
        requirement_id: row.requirement_id,
        action,
        actor_email: actor?.email || "hr",
        actor_name: actor?.name || "HR",
        from_label: row.employee_name,
        to_label: actor?.name || "HR",
        message:
          patch.status === "verified"
            ? `${actor?.name || "HR"} verified “${row.requirement_title}” from ${row.employee_name}.`
            : patch.status === "rejected"
              ? `${actor?.name || "HR"} rejected “${row.requirement_title}” from ${row.employee_name}.`
              : `${actor?.name || "HR"} updated “${row.requirement_title}”.`
      });
    }
  }
  persist();
  return row;
}

export function softDeleteManagedDocument(documentId: UUID) {
  ensureHydrated();
  const row = documents.find((d) => d.id === documentId);
  if (!row) return null;
  row.deleted = true;
  row.deleted_at = now();
  row.updated_at = now();
  persist();
  return row;
}

export function restoreManagedDocument(documentId: UUID) {
  ensureHydrated();
  const row = documents.find((d) => d.id === documentId);
  if (!row) return null;
  row.deleted = false;
  row.deleted_at = null;
  row.updated_at = now();
  persist();
  return row;
}

export async function permanentlyDeleteManagedDocument(documentId: UUID) {
  ensureHydrated();
  const index = documents.findIndex((d) => d.id === documentId);
  if (index < 0) return false;
  const row = documents[index];
  const shared = documents.some((d) => d.id !== row.id && d.storage_path === row.storage_path);
  if (!shared) await deleteDocumentBlob(row.storage_path);
  documents.splice(index, 1);
  persist();
  return true;
}

export async function emptyDocumentBin(tenantId: UUID) {
  const deleted = listDeletedDocuments(tenantId);
  for (const row of deleted) {
    await permanentlyDeleteManagedDocument(row.id);
  }
}

export { allowedDocumentExtensions };

import type { UUID } from "@/modules/core/types";
import type {
  CustomForm,
  FormAssignment,
  FormAssignScope,
  FormField,
  FormResponse
} from "@/modules/forms/model";
import { notifySurveyAssigned } from "@/lib/email/triggers";
import { createHrNotification, listEmployees } from "@/modules/hrm/services/hrm.store";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";

const STORAGE_KEY = "businesssuite:hrm-forms:v1";
const STORAGE_VERSION = 1;

type Snapshot = {
  version: number;
  forms: CustomForm[];
  assignments: FormAssignment[];
  responses: FormResponse[];
};

function now() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID();
}

function field(partial: Omit<FormField, "id"> & { id?: string }): FormField {
  return { id: partial.id ?? id(), ...partial };
}

const forms: CustomForm[] = [];
const assignments: FormAssignment[] = [];
const responses: FormResponse[] = [];

let hydrated = false;

function buildSnapshot(): Snapshot {
  return { version: STORAGE_VERSION, forms, assignments, responses };
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    savePersisted(STORAGE_KEY, buildSnapshot());
  } catch {
    /* ignore */
  }
}

function seedAlpha() {
  if (forms.some((f) => f.tenant_id === "alpha")) return;

  const onboarding = {
    id: id(),
    tenant_id: "alpha",
    created_at: now(),
    updated_at: now(),
    is_active: true,
    title: "New hire information form",
    description: "Please complete your personal and emergency details, and upload your ID document.",
    status: "published" as const,
    show_letterhead: true,
    fields: [
      field({ label: "Full legal name", type: "text", required: true, placeholder: "As on ID" }),
      field({ label: "Personal email", type: "text", required: true, placeholder: "you@email.com" }),
      field({ label: "Emergency contact name", type: "text", required: true }),
      field({ label: "Emergency contact phone", type: "text", required: true }),
      field({
        label: "Blood group",
        type: "select",
        required: false,
        options: "A+,A-,B+,B-,AB+,AB-,O+,O-,Unknown"
      }),
      field({
        label: "Upload national ID / passport",
        type: "file",
        required: true,
        help_text: "PDF or image, max ~5MB for demo storage"
      }),
      field({
        label: "I confirm the information is accurate",
        type: "checkbox",
        required: true
      })
    ]
  } as CustomForm;

  const feedback = {
    id: id(),
    tenant_id: "alpha",
    created_at: now(),
    updated_at: now(),
    is_active: true,
    title: "Quarterly employee pulse check",
    description: "Short anonymous-style feedback for HR (your name is still linked for follow-up).",
    status: "published" as const,
    show_letterhead: true,
    fields: [
      field({
        label: "Overall satisfaction (1–5)",
        type: "select",
        required: true,
        options: "1,2,3,4,5"
      }),
      field({ label: "What should HR improve?", type: "textarea", required: false }),
      field({ label: "Any supporting document?", type: "file", required: false })
    ]
  } as CustomForm;

  forms.push(onboarding, feedback);
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === "undefined") {
    seedAlpha();
    return;
  }
  try {
    const snap = loadPersisted<Partial<Snapshot>>(STORAGE_KEY);
    if (snap) {
      if (snap.version === STORAGE_VERSION) {
        forms.length = 0;
        assignments.length = 0;
        responses.length = 0;
        forms.push(...(snap.forms ?? []));
        assignments.push(...(snap.assignments ?? []));
        responses.push(...(snap.responses ?? []));
        if (!forms.length) {
          seedAlpha();
          persist();
        }
        return;
      }
    }
  } catch {
    /* reseeding */
  }
  forms.length = 0;
  assignments.length = 0;
  responses.length = 0;
  seedAlpha();
  persist();
}

export function listCustomForms(tenantId: UUID): CustomForm[] {
  ensureHydrated();
  return forms.filter((f) => f.tenant_id === tenantId && f.is_active !== false);
}

export function getCustomForm(formId: UUID): CustomForm | undefined {
  ensureHydrated();
  return forms.find((f) => f.id === formId);
}

export function createCustomForm(
  tenantId: UUID,
  data: Pick<CustomForm, "title" | "description" | "show_letterhead" | "fields" | "status">
): CustomForm {
  ensureHydrated();
  const row: CustomForm = {
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    title: data.title,
    description: data.description ?? null,
    show_letterhead: data.show_letterhead,
    fields: data.fields,
    status: data.status
  };
  forms.unshift(row);
  persist();
  return row;
}

export function updateCustomForm(formId: UUID, patch: Partial<CustomForm>): CustomForm | null {
  ensureHydrated();
  const idx = forms.findIndex((f) => f.id === formId);
  if (idx < 0) return null;
  forms[idx] = { ...forms[idx], ...patch, id: forms[idx].id, tenant_id: forms[idx].tenant_id, updated_at: now() };
  persist();
  return forms[idx];
}

export function archiveCustomForm(formId: UUID): CustomForm | null {
  return updateCustomForm(formId, { status: "archived", is_active: false });
}

export function listFormAssignments(tenantId: UUID): FormAssignment[] {
  ensureHydrated();
  return assignments.filter((a) => a.tenant_id === tenantId && a.is_active !== false);
}

export function listAssignmentsForEmployee(tenantId: UUID, employeeId: UUID): FormAssignment[] {
  return listFormAssignments(tenantId).filter((a) => a.employee_id === employeeId);
}

export function getFormAssignment(assignmentId: UUID): FormAssignment | undefined {
  ensureHydrated();
  return assignments.find((a) => a.id === assignmentId);
}

export function getResponseForAssignment(assignmentId: UUID): FormResponse | undefined {
  ensureHydrated();
  return responses.find((r) => r.assignment_id === assignmentId && r.is_active !== false);
}

export function listResponsesForForm(tenantId: UUID, formId: UUID): FormResponse[] {
  ensureHydrated();
  return responses.filter((r) => r.tenant_id === tenantId && r.form_id === formId && r.is_active !== false);
}

/**
 * Send a published form to one employee, a department, or all active employees.
 */
export function sendFormToEmployees(
  tenantId: UUID,
  formId: UUID,
  opts: {
    scope: FormAssignScope;
    employeeId?: UUID | null;
    departmentId?: UUID | null;
    dueDate?: string | null;
    assignedBy?: string | null;
  }
): FormAssignment[] {
  ensureHydrated();
  const form = getCustomForm(formId);
  if (!form || form.tenant_id !== tenantId) throw new Error("Form not found.");
  if (form.status !== "published") throw new Error("Publish the form before sending it to employees.");

  let targets = listEmployees(tenantId).filter((e) => e.status === "active" || e.status === "onboarding");
  if (opts.scope === "single") {
    if (!opts.employeeId) throw new Error("Select an employee.");
    targets = targets.filter((e) => e.id === opts.employeeId);
  } else if (opts.scope === "department") {
    if (!opts.departmentId) throw new Error("Select a department.");
    targets = targets.filter((e) => e.department_id === opts.departmentId);
  }
  if (!targets.length) throw new Error("No matching employees to send this form to.");

  const created: FormAssignment[] = [];
  for (const emp of targets) {
    const existingPending = assignments.find(
      (a) =>
        a.tenant_id === tenantId &&
        a.form_id === formId &&
        a.employee_id === emp.id &&
        a.status === "pending" &&
        a.is_active !== false
    );
    if (existingPending) {
      created.push(existingPending);
      continue;
    }
    const row: FormAssignment = {
      id: id(),
      tenant_id: tenantId,
      created_at: now(),
      updated_at: now(),
      is_active: true,
      form_id: formId,
      employee_id: emp.id,
      status: "pending",
      due_date: opts.dueDate ?? null,
      assigned_by: opts.assignedBy ?? null,
      submitted_at: null,
      reviewed_at: null,
      reviewer_note: null
    };
    assignments.unshift(row);
    created.push(row);
    createHrNotification(tenantId, {
      title: `Form assigned: ${form.title}`,
      body: `${emp.full_name} was asked to complete “${form.title}”.`,
      read: false
    });
    if (emp.email) {
      notifySurveyAssigned({
        to: emp.email,
        tenantId,
        employeeName: emp.full_name,
        formName: form.title,
        dueDate: opts.dueDate,
        message: form.description || null
      });
    }
  }
  persist();
  return created;
}

export function submitFormResponse(
  tenantId: UUID,
  assignmentId: UUID,
  answers: Record<string, string | boolean | null>,
  fileNames?: Record<string, string>
): FormResponse {
  ensureHydrated();
  const assignment = getFormAssignment(assignmentId);
  if (!assignment || assignment.tenant_id !== tenantId) throw new Error("Assignment not found.");
  if (assignment.status === "submitted" || assignment.status === "reviewed") {
    throw new Error("This form was already submitted.");
  }
  const form = getCustomForm(assignment.form_id);
  if (!form) throw new Error("Form not found.");

  for (const f of form.fields) {
    if (!f.required) continue;
    const v = answers[f.id];
    if (f.type === "checkbox") {
      if (v !== true) throw new Error(`Please check: ${f.label}`);
    } else if (v == null || String(v).trim() === "") {
      throw new Error(`Please fill: ${f.label}`);
    }
  }

  const existing = getResponseForAssignment(assignmentId);
  let response: FormResponse;
  if (existing) {
    existing.answers = answers;
    existing.file_names = fileNames ?? {};
    existing.updated_at = now();
    response = existing;
  } else {
    response = {
      id: id(),
      tenant_id: tenantId,
      created_at: now(),
      updated_at: now(),
      is_active: true,
      assignment_id: assignmentId,
      form_id: assignment.form_id,
      employee_id: assignment.employee_id,
      answers,
      file_names: fileNames ?? {}
    };
    responses.unshift(response);
  }

  const idx = assignments.findIndex((a) => a.id === assignmentId);
  if (idx >= 0) {
    assignments[idx] = {
      ...assignments[idx],
      status: "submitted",
      submitted_at: now(),
      updated_at: now()
    };
  }

  createHrNotification(tenantId, {
    title: `Form submitted: ${form.title}`,
    body: `An employee submitted “${form.title}”. Review responses in Custom forms.`,
    read: false
  });

  persist();
  return response;
}

export function markAssignmentReviewed(assignmentId: UUID, note?: string): FormAssignment | null {
  ensureHydrated();
  const idx = assignments.findIndex((a) => a.id === assignmentId);
  if (idx < 0) return null;
  assignments[idx] = {
    ...assignments[idx],
    status: "reviewed",
    reviewed_at: now(),
    reviewer_note: note?.trim() || null,
    updated_at: now()
  };
  persist();
  return assignments[idx];
}

export function newFieldId() {
  return id();
}

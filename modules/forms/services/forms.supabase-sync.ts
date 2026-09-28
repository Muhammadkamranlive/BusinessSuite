import { getSupabaseAdminClient, hasSecretKey } from "@/lib/supabase/server";
import { toDbTenantId, toUiTenantId } from "@/lib/tenants/ids";
import type { CustomForm, FormAssignment, FormResponse } from "@/modules/forms/model";

export type FormsRemoteSnapshot = {
  version: number;
  tenantId?: string;
  forms: CustomForm[];
  assignments: FormAssignment[];
  responses: FormResponse[];
};

export function isFormsSupabaseSyncEnabled() {
  return hasSecretKey() && process.env.NEXT_PUBLIC_FORMS_USE_SUPABASE !== "false";
}

function formToDb(f: CustomForm) {
  return {
    id: f.id,
    tenant_id: toDbTenantId(f.tenant_id),
    title: f.title,
    description: f.description ?? "",
    status: f.status,
    show_letterhead: f.show_letterhead,
    fields: f.fields ?? [],
    created_at: f.created_at,
    updated_at: f.updated_at ?? f.created_at,
    is_active: f.is_active !== false
  };
}

function formFromDb(row: Record<string, unknown>): CustomForm {
  return {
    id: String(row.id),
    tenant_id: toUiTenantId(String(row.tenant_id)),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
    is_active: row.is_active !== false,
    title: String(row.title),
    description: row.description == null ? "" : String(row.description),
    status: (String(row.status) as CustomForm["status"]) || "draft",
    show_letterhead: row.show_letterhead !== false,
    fields: Array.isArray(row.fields) ? (row.fields as CustomForm["fields"]) : []
  };
}

function assignmentToDb(a: FormAssignment) {
  return {
    id: a.id,
    tenant_id: toDbTenantId(a.tenant_id),
    form_id: a.form_id,
    employee_id: a.employee_id,
    status: a.status,
    due_date: a.due_date ?? null,
    assigned_by: a.assigned_by ?? null,
    submitted_at: a.submitted_at ?? null,
    reviewed_at: a.reviewed_at ?? null,
    reviewer_note: a.reviewer_note ?? null,
    created_at: a.created_at,
    updated_at: a.updated_at ?? a.created_at,
    is_active: a.is_active !== false
  };
}

function assignmentFromDb(row: Record<string, unknown>): FormAssignment {
  return {
    id: String(row.id),
    tenant_id: toUiTenantId(String(row.tenant_id)),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
    is_active: row.is_active !== false,
    form_id: String(row.form_id),
    employee_id: String(row.employee_id),
    status: (String(row.status) as FormAssignment["status"]) || "pending",
    due_date: row.due_date ? String(row.due_date) : null,
    assigned_by: row.assigned_by ? String(row.assigned_by) : null,
    submitted_at: row.submitted_at ? String(row.submitted_at) : null,
    reviewed_at: row.reviewed_at ? String(row.reviewed_at) : null,
    reviewer_note: row.reviewer_note ? String(row.reviewer_note) : null
  };
}

function responseToDb(r: FormResponse) {
  return {
    id: r.id,
    tenant_id: toDbTenantId(r.tenant_id),
    assignment_id: r.assignment_id,
    form_id: r.form_id,
    employee_id: r.employee_id,
    answers: r.answers ?? {},
    file_names: r.file_names ?? {},
    created_at: r.created_at,
    updated_at: r.updated_at ?? r.created_at,
    is_active: r.is_active !== false
  };
}

function responseFromDb(row: Record<string, unknown>): FormResponse {
  return {
    id: String(row.id),
    tenant_id: toUiTenantId(String(row.tenant_id)),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
    is_active: row.is_active !== false,
    assignment_id: String(row.assignment_id),
    form_id: String(row.form_id),
    employee_id: String(row.employee_id),
    answers: (row.answers as FormResponse["answers"]) ?? {},
    file_names: (row.file_names as FormResponse["file_names"]) ?? {}
  };
}

export async function pushFormsSnapshot(snapshot: FormsRemoteSnapshot) {
  if (!isFormsSupabaseSyncEnabled()) {
    return { ok: false as const, reason: "Supabase secret key missing or forms sync disabled" };
  }
  const admin = getSupabaseAdminClient();
  const errors: string[] = [];
  if (snapshot.forms?.length) {
    const { error } = await admin.from("hrm_custom_forms").upsert(snapshot.forms.map(formToDb), { onConflict: "id" });
    if (error) errors.push(`hrm_custom_forms: ${error.message}`);
  }
  if (snapshot.assignments?.length) {
    const { error } = await admin.from("hrm_form_assignments").upsert(snapshot.assignments.map(assignmentToDb), { onConflict: "id" });
    if (error) errors.push(`hrm_form_assignments: ${error.message}`);
  }
  if (snapshot.responses?.length) {
    const { error } = await admin.from("hrm_form_responses").upsert(snapshot.responses.map(responseToDb), { onConflict: "id" });
    if (error) errors.push(`hrm_form_responses: ${error.message}`);
  }
  return { ok: errors.length === 0, errors };
}

export async function pullFormsSnapshot(uiTenantId?: string): Promise<{
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  snapshot?: FormsRemoteSnapshot;
}> {
  if (!isFormsSupabaseSyncEnabled()) {
    return { ok: false, skipped: true, reason: "Forms Supabase sync is off. Set SUPABASE_SECRET_KEY." };
  }
  const admin = getSupabaseAdminClient();
  const dbTenantId = uiTenantId ? toDbTenantId(uiTenantId) : undefined;
  let f = admin.from("hrm_custom_forms").select("*");
  let a = admin.from("hrm_form_assignments").select("*");
  let r = admin.from("hrm_form_responses").select("*");
  if (dbTenantId) {
    f = f.eq("tenant_id", dbTenantId);
    a = a.eq("tenant_id", dbTenantId);
    r = r.eq("tenant_id", dbTenantId);
  }
  const [forms, assignments, responses] = await Promise.all([f, a, r]);
  if (forms.error) return { ok: false, reason: `hrm_custom_forms: ${forms.error.message}` };
  if (assignments.error) return { ok: false, reason: `hrm_form_assignments: ${assignments.error.message}` };
  if (responses.error) return { ok: false, reason: `hrm_form_responses: ${responses.error.message}` };
  return {
    ok: true,
    snapshot: {
      version: 1,
      tenantId: uiTenantId,
      forms: (forms.data ?? []).map((row) => formFromDb(row as Record<string, unknown>)),
      assignments: (assignments.data ?? []).map((row) => assignmentFromDb(row as Record<string, unknown>)),
      responses: (responses.data ?? []).map((row) => responseFromDb(row as Record<string, unknown>))
    }
  };
}

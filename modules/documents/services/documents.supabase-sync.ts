import { getSupabaseAdminClient, hasSecretKey } from "@/lib/supabase/server";
import { toDbTenantId, toUiTenantId } from "@/lib/tenants/ids";
import type { DocumentRequirement, ManagedDocument } from "@/modules/documents/model";

export type DocumentsRemoteSnapshot = {
  version: number;
  tenantId?: string;
  requirements: DocumentRequirement[];
  documents: ManagedDocument[];
};

export function isDocumentsSupabaseSyncEnabled() {
  return hasSecretKey() && process.env.NEXT_PUBLIC_DOCUMENTS_USE_SUPABASE !== "false";
}

function remap(row: Record<string, unknown>, toDb: boolean) {
  const next = { ...row };
  if (typeof next.tenant_id === "string") {
    next.tenant_id = toDb ? toDbTenantId(next.tenant_id) : toUiTenantId(next.tenant_id);
  }
  return next;
}

function str(v: unknown, d = "") {
  return v == null ? d : String(v);
}

function requirementToDb(r: DocumentRequirement) {
  return remap(
    {
      id: r.id,
      tenant_id: r.tenant_id,
      title: r.title,
      description: r.description ?? "",
      category: r.category,
      employment_types: r.employment_types ?? [],
      allowed_extensions: r.allowed_extensions ?? [],
      required: r.required,
      source: r.source,
      created_at: r.created_at,
      updated_at: r.updated_at ?? r.created_at,
      is_active: r.is_active !== false
    },
    true
  );
}

function requirementFromDb(row: Record<string, unknown>): DocumentRequirement {
  const r = remap(row, false);
  const types = Array.isArray(r.employment_types) ? r.employment_types.map(String) : [];
  const exts = Array.isArray(r.allowed_extensions) ? r.allowed_extensions.map(String) : [];
  return {
    id: str(r.id),
    tenant_id: str(r.tenant_id),
    created_at: str(r.created_at),
    updated_at: str(r.updated_at || r.created_at),
    is_active: r.is_active !== false,
    title: str(r.title),
    description: str(r.description),
    category: (str(r.category, "other") as DocumentRequirement["category"]) || "other",
    employment_types: types as DocumentRequirement["employment_types"],
    allowed_extensions: exts,
    required: Boolean(r.required),
    source: str(r.source, "admin") === "system" ? "system" : "admin"
  };
}

function documentToDb(d: ManagedDocument) {
  return remap(
    {
      id: d.id,
      tenant_id: d.tenant_id,
      employee_id: d.employee_id || null,
      employee_name: d.employee_name,
      employee_email: d.employee_email ?? "",
      requirement_id: d.requirement_id,
      requirement_title: d.requirement_title,
      category: d.category,
      file_name: d.file_name,
      file_type: d.file_type,
      file_size: d.file_size,
      extension: d.extension,
      storage_path: d.storage_path,
      download_url: d.download_url,
      status: d.status,
      deleted: d.deleted,
      deleted_at: d.deleted_at ?? null,
      source: d.source,
      assigned_by: d.assigned_by ?? null,
      assigned_scope: d.assigned_scope ?? null,
      assigned_department_id: d.assigned_department_id ?? null,
      team_note: d.team_note ?? null,
      uploaded_at: d.uploaded_at,
      created_at: d.created_at,
      updated_at: d.updated_at ?? d.created_at,
      is_active: d.is_active !== false
    },
    true
  );
}

function documentFromDb(row: Record<string, unknown>): ManagedDocument {
  const r = remap(row, false);
  return {
    id: str(r.id),
    tenant_id: str(r.tenant_id),
    created_at: str(r.created_at),
    updated_at: str(r.updated_at || r.created_at),
    is_active: r.is_active !== false,
    employee_id: str(r.employee_id),
    employee_name: str(r.employee_name),
    employee_email: str(r.employee_email),
    requirement_id: str(r.requirement_id),
    requirement_title: str(r.requirement_title),
    category: (str(r.category, "other") as ManagedDocument["category"]) || "other",
    file_name: str(r.file_name),
    file_type: str(r.file_type, "application/octet-stream"),
    file_size: Number(r.file_size) || 0,
    extension: str(r.extension),
    storage_path: str(r.storage_path),
    download_url: str(r.download_url),
    status: (str(r.status, "uploaded") as ManagedDocument["status"]) || "uploaded",
    deleted: Boolean(r.deleted),
    deleted_at: r.deleted_at ? str(r.deleted_at) : null,
    source: str(r.source, "employee") === "hr-team" ? "hr-team" : "employee",
    assigned_by: r.assigned_by ? str(r.assigned_by) : null,
    assigned_scope: (r.assigned_scope as ManagedDocument["assigned_scope"]) ?? null,
    assigned_department_id: r.assigned_department_id ? str(r.assigned_department_id) : null,
    team_note: r.team_note ? str(r.team_note) : null,
    uploaded_at: str(r.uploaded_at || r.created_at)
  };
}

export async function pushDocumentsSnapshot(snapshot: DocumentsRemoteSnapshot) {
  if (!isDocumentsSupabaseSyncEnabled()) {
    return { ok: false as const, reason: "Supabase secret key missing or documents sync disabled" };
  }
  const admin = getSupabaseAdminClient();
  const errors: string[] = [];
  if (snapshot.requirements?.length) {
    const { error } = await admin
      .from("hrm_document_requirements")
      .upsert(snapshot.requirements.map(requirementToDb), { onConflict: "id" });
    if (error) errors.push(`hrm_document_requirements: ${error.message}`);
  }
  if (snapshot.documents?.length) {
    const { error } = await admin
      .from("hrm_managed_documents")
      .upsert(snapshot.documents.map(documentToDb), { onConflict: "id" });
    if (error) errors.push(`hrm_managed_documents: ${error.message}`);
  }
  return { ok: errors.length === 0, errors };
}

export async function pullDocumentsSnapshot(uiTenantId?: string): Promise<{
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  snapshot?: DocumentsRemoteSnapshot;
}> {
  if (!isDocumentsSupabaseSyncEnabled()) {
    return { ok: false, skipped: true, reason: "Documents Supabase sync is off. Set SUPABASE_SECRET_KEY." };
  }
  const admin = getSupabaseAdminClient();
  const dbTenantId = uiTenantId ? toDbTenantId(uiTenantId) : undefined;
  let reqQ = admin.from("hrm_document_requirements").select("*");
  let docQ = admin.from("hrm_managed_documents").select("*");
  if (dbTenantId) {
    reqQ = reqQ.eq("tenant_id", dbTenantId);
    docQ = docQ.eq("tenant_id", dbTenantId);
  }
  const [reqs, docs] = await Promise.all([reqQ, docQ]);
  if (reqs.error) return { ok: false, reason: `hrm_document_requirements: ${reqs.error.message}` };
  if (docs.error) return { ok: false, reason: `hrm_managed_documents: ${docs.error.message}` };
  return {
    ok: true,
    snapshot: {
      version: 1,
      tenantId: uiTenantId,
      requirements: (reqs.data ?? []).map((r) => requirementFromDb(r as Record<string, unknown>)),
      documents: (docs.data ?? []).map((r) => documentFromDb(r as Record<string, unknown>))
    }
  };
}

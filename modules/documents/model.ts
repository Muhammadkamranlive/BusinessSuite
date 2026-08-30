import type { TenantEntity, UUID } from "@/modules/core/types";

export const allowedDocumentExtensions = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp"
] as const;

export const hrTeamDocumentRequirementId = "hr-team-shared";

export type DocumentCategory =
  | "identity"
  | "employment"
  | "payroll"
  | "compliance"
  | "policy"
  | "other";

export type DocumentReviewStatus = "uploaded" | "needs-review" | "verified" | "rejected";
export type DocumentSource = "employee" | "hr-team";
export type AssignedScope = "single" | "department" | "all";
export type DocumentAssignmentStatus = "pending" | "uploaded" | "verified" | "rejected";
export type DocumentHistoryAction = "assigned" | "uploaded" | "verified" | "rejected" | "note";

export type DocumentRequirement = TenantEntity & {
  title: string;
  description: string;
  category: DocumentCategory;
  /** Employment types that must see this requirement (empty = all) */
  employment_types: Array<"full_time" | "part_time" | "contract" | "intern">;
  allowed_extensions: string[];
  required: boolean;
  source: "system" | "admin";
};

export type ManagedDocument = TenantEntity & {
  employee_id: UUID;
  employee_name: string;
  employee_email: string;
  requirement_id: string;
  requirement_title: string;
  category: DocumentCategory;
  file_name: string;
  file_type: string;
  file_size: number;
  extension: string;
  storage_path: string;
  download_url: string;
  status: DocumentReviewStatus;
  deleted: boolean;
  deleted_at?: string | null;
  source: DocumentSource;
  assigned_by?: string | null;
  assigned_scope?: AssignedScope | null;
  assigned_department_id?: UUID | null;
  team_note?: string | null;
  uploaded_at: string;
  assignment_id?: UUID | null;
};

export type DocumentAssignment = TenantEntity & {
  requirement_id: string;
  requirement_title: string;
  category: DocumentCategory;
  employee_id: UUID;
  employee_name: string;
  employee_email: string;
  assigned_by: string;
  assigned_by_name: string;
  assigned_scope: AssignedScope;
  assigned_department_id?: UUID | null;
  team_note?: string | null;
  status: DocumentAssignmentStatus;
  document_id?: UUID | null;
  template_file_name?: string | null;
  template_download_url?: string | null;
};

export type DocumentChangeEvent = {
  id: UUID;
  tenant_id: UUID;
  assignment_id: UUID;
  employee_id: UUID;
  requirement_id: string;
  action: DocumentHistoryAction;
  actor_email: string;
  actor_name: string;
  from_label: string;
  to_label: string;
  message: string;
  created_at: string;
};

export const documentCategoryLabels: Record<DocumentCategory, string> = {
  identity: "Identity",
  employment: "Employment",
  payroll: "Payroll",
  compliance: "Compliance",
  policy: "Policy",
  other: "Other"
};

export const documentStatusLabels: Record<DocumentReviewStatus, string> = {
  uploaded: "Uploaded",
  "needs-review": "Needs review",
  verified: "Verified",
  rejected: "Rejected"
};

export const documentAssignmentLabels: Record<DocumentAssignmentStatus, string> = {
  pending: "Awaiting upload",
  uploaded: "Uploaded",
  verified: "Verified",
  rejected: "Rejected"
};

export const documentHistoryLabels: Record<DocumentHistoryAction, string> = {
  assigned: "Assigned",
  uploaded: "Uploaded",
  verified: "Verified",
  rejected: "Rejected",
  note: "Note"
};

export function fileExtension(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
}

export function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function sanitizeFileName(name: string) {
  return name.replace(/[^a-z0-9._-]/gi, "-").toLowerCase();
}

import type { TenantEntity, UUID } from "@/modules/core/types";

export type FormFieldType = "text" | "textarea" | "number" | "date" | "select" | "checkbox" | "file";

export type FormField = {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  help_text?: string;
  /** Comma-separated options for select fields */
  options?: string;
};

export type CustomFormStatus = "draft" | "published" | "archived";
export type FormAssignmentStatus = "pending" | "submitted" | "reviewed";
export type FormAssignScope = "single" | "department" | "all";

export interface CustomForm extends TenantEntity {
  title: string;
  description?: string | null;
  status: CustomFormStatus;
  /** Show company letterhead when employees fill the form */
  show_letterhead: boolean;
  fields: FormField[];
}

export interface FormAssignment extends TenantEntity {
  form_id: UUID;
  employee_id: UUID;
  status: FormAssignmentStatus;
  due_date?: string | null;
  assigned_by?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  reviewer_note?: string | null;
}

export type FormAnswerValue = string | boolean | null;

export interface FormResponse extends TenantEntity {
  assignment_id: UUID;
  form_id: UUID;
  employee_id: UUID;
  /** fieldId → answer (file fields store download URL / data URL) */
  answers: Record<string, FormAnswerValue>;
  /** fieldId → original file name for uploads */
  file_names?: Record<string, string>;
}

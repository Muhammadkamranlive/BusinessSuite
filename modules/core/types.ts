export type UUID = string;

export interface BaseEntity {
  id: UUID;
  created_at: string;
  updated_at?: string | null;
}

export interface TenantEntity extends BaseEntity {
  tenant_id: UUID;
  created_by?: UUID | null;
  updated_by?: UUID | null;
  is_active?: boolean;
}

export interface Tenant extends BaseEntity {
  name: string;
  legal_name?: string | null;
  industry?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  logo_url?: string | null;
  status: "active" | "inactive";
}

export interface UserProfile extends BaseEntity {
  auth_user_id?: UUID | null;
  tenant_id: UUID;
  full_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  job_title?: string | null;
  department_id?: UUID | null;
  status: "active" | "invited" | "blocked";
}

export interface Role extends BaseEntity {
  tenant_id?: UUID | null;
  name: string;
  description?: string | null;
  is_system_role: boolean;
}

export interface Permission {
  id: UUID;
  code: string;
  module: string;
  description?: string | null;
}

export type AuditAction = "create" | "update" | "delete" | "login" | "logout" | "export" | "approve" | "reject" | "post" | "cancel";

export interface AuditLogEntry extends BaseEntity {
  tenant_id?: UUID | null;
  user_profile_id?: UUID | null;
  module: string;
  action: AuditAction;
  entity_name?: string | null;
  entity_id?: UUID | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  ip_address?: string | null;
}

export interface NotificationEntry extends BaseEntity {
  tenant_id: UUID;
  user_profile_id?: UUID | null;
  /** Prefer filtering inbox by email when set */
  user_email?: string | null;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  is_read: boolean;
  target_module?: string | null;
  target_id?: UUID | null;
  href?: string | null;
  event?: string | null;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListFilters {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

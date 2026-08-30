import type { AuditAction, AuditLogEntry, UUID } from "@/modules/core/types";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";

const STORAGE_KEY = "businesssuite:audit-logs:v1";

let auditLogs: AuditLogEntry[] = [];
let hydrated = false;

function now() {
  return new Date().toISOString();
}

function newId() {
  return crypto.randomUUID();
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  auditLogs = loadPersisted<AuditLogEntry[]>(STORAGE_KEY) ?? [];
}

function persist() {
  savePersisted(STORAGE_KEY, auditLogs.slice(0, 5000));
}

export function logCreate(params: {
  tenantId?: UUID | null;
  userId?: UUID | null;
  module: string;
  entityName: string;
  entityId: UUID;
  newData: Record<string, unknown>;
}) {
  return logAction({ ...params, action: "create" });
}

export function logUpdate(params: {
  tenantId?: UUID | null;
  userId?: UUID | null;
  module: string;
  entityName: string;
  entityId: UUID;
  oldData: Record<string, unknown>;
  newData: Record<string, unknown>;
}) {
  return logAction({ ...params, action: "update" });
}

export function logDelete(params: {
  tenantId?: UUID | null;
  userId?: UUID | null;
  module: string;
  entityName: string;
  entityId: UUID;
  oldData: Record<string, unknown>;
}) {
  return logAction({ ...params, action: "delete" });
}

export function logAction(params: {
  tenantId?: UUID | null;
  userId?: UUID | null;
  module: string;
  action: AuditAction;
  entityName?: string;
  entityId?: UUID;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
}) {
  ensureHydrated();
  const entry: AuditLogEntry = {
    id: newId(),
    tenant_id: params.tenantId ?? null,
    user_profile_id: params.userId ?? null,
    module: params.module,
    action: params.action,
    entity_name: params.entityName ?? null,
    entity_id: params.entityId ?? null,
    old_data: params.oldData ?? null,
    new_data: params.newData ?? null,
    created_at: now()
  };
  auditLogs.unshift(entry);
  persist();
  return entry;
}

export function getAuditLogs(tenantId?: UUID | null) {
  ensureHydrated();
  if (!tenantId) return auditLogs;
  return auditLogs.filter((log) => log.tenant_id === tenantId);
}

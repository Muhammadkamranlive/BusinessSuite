import { CHANNEL_DEFAULTS } from "@/lib/automation/catalog";
import type {
  ApprovalChainDef,
  ApprovalInstance,
  AutomationRule,
  AutomationSchedule,
  AutomationTask,
  BusinessEvent,
  ChannelStatus
} from "@/lib/automation/types";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";
import type { ModuleKey } from "@/lib/permissions";
import { seedAutomationForTenant } from "@/lib/automation/seed";
import { normalizeRuleActions } from "@/lib/automation/normalize-actions";
import type { AutomationRemoteSnapshot } from "@/modules/automation/services/automation.supabase-sync";

const RULES_KEY = "businesssuite:automation:rules:v1";
const SCHEDULES_KEY = "businesssuite:automation:schedules:v1";
const CHAINS_KEY = "businesssuite:automation:approval-chains:v1";
const INSTANCES_KEY = "businesssuite:automation:approval-instances:v1";
const EVENTS_KEY = "businesssuite:automation:events:v1";
const TASKS_KEY = "businesssuite:automation:tasks:v1";
const CHANNELS_KEY = "businesssuite:automation:channels:v1";
const SEEDED_KEY = "businesssuite:automation:seeded:v1";
const SYSTEM_RULES_PATCH_KEY = "businesssuite:automation:system-rules:v2";
const REMOVED_RULE_IDS_KEY = "businesssuite:automation:removed-rule-ids:v1";
const REMOVED_SYSTEM_KEYS_KEY = "businesssuite:automation:removed-system-keys:v1";

const EVENT = "businesssuite:automation";

function now() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID();
}

function read<T>(key: string, fallback: T): T {
  return loadPersisted<T>(key) ?? fallback;
}

function write(key: string, value: unknown) {
  savePersisted(key, value);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT));
    queueAutomationRemoteSync();
  }
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

export function buildAutomationSnapshot(tenantId?: string): AutomationRemoteSnapshot {
  const rules = read<AutomationRule[]>(RULES_KEY, []);
  const schedules = read<AutomationSchedule[]>(SCHEDULES_KEY, []);
  const events = read<BusinessEvent[]>(EVENTS_KEY, []);
  const filterTenant = <T extends { tenant_id: string }>(rows: T[]) =>
    tenantId ? rows.filter((r) => r.tenant_id === tenantId) : rows;
  return {
    version: 1,
    tenantId,
    rules: filterTenant(rules),
    schedules: filterTenant(schedules),
    events: filterTenant(events).slice(0, 200)
  };
}

function removedRuleIds(tenantId: string) {
  return read<Record<string, string[]>>(REMOVED_RULE_IDS_KEY, {})[tenantId] ?? [];
}

function removedSystemKeys(tenantId: string) {
  return read<Record<string, string[]>>(REMOVED_SYSTEM_KEYS_KEY, {})[tenantId] ?? [];
}

function markRuleRemoved(rule: AutomationRule) {
  const byTenant = read<Record<string, string[]>>(REMOVED_RULE_IDS_KEY, {});
  byTenant[rule.tenant_id] = [...new Set([...(byTenant[rule.tenant_id] ?? []), rule.id])];
  writeQuiet(REMOVED_RULE_IDS_KEY, byTenant);

  if (rule.is_system) {
    const keys = read<Record<string, string[]>>(REMOVED_SYSTEM_KEYS_KEY, {});
    const key = `${rule.event_key}::${rule.name}`;
    keys[rule.tenant_id] = [...new Set([...(keys[rule.tenant_id] ?? []), key])];
    writeQuiet(REMOVED_SYSTEM_KEYS_KEY, keys);
  }
}

/** Persist without triggering debounced sync (caller syncs explicitly). */
function writeQuiet(key: string, value: unknown) {
  savePersisted(key, value);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT));
  }
}

function mergeTenantRows<T extends { tenant_id: string; id: string }>(
  key: string,
  incoming: T[],
  tenantId: string,
  opts?: { skipIds?: string[]; skipSystemKeys?: string[] }
) {
  const skipIds = new Set(opts?.skipIds ?? []);
  const skipKeys = new Set(opts?.skipSystemKeys ?? []);
  const filtered = incoming.filter((row) => {
    if (skipIds.has(row.id)) return false;
    const rule = row as unknown as AutomationRule;
    if (rule.is_system && rule.event_key && rule.name) {
      if (skipKeys.has(`${rule.event_key}::${rule.name}`)) return false;
    }
    return true;
  });
  const rows = read<T[]>(key, []);
  const kept = rows.filter((r) => r.tenant_id !== tenantId);
  writeQuiet(key, [...filtered, ...kept]);
}

export function queueAutomationRemoteSync(immediate = false) {
  if (typeof window === "undefined") return;
  if (process.env.NEXT_PUBLIC_AUTOMATION_USE_SUPABASE === "false") return;

  const push = () => {
    const snapshot = buildAutomationSnapshot();
    void fetch("/api/automation/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot)
    }).catch(() => {
      /* offline */
    });
  };

  if (immediate) {
    if (syncTimer) clearTimeout(syncTimer);
    push();
    return;
  }

  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(push, 900);
}

/** Pull automation rules from Supabase — DB wins over local cache for that tenant. */
export async function pullAutomationFromSupabase(tenantId: string) {
  if (typeof window === "undefined") return false;
  const qs = `?tenantId=${encodeURIComponent(tenantId)}`;
  try {
    const res = await fetch(`/api/automation/sync${qs}`);
    const json = (await res.json()) as {
      ok?: boolean;
      skipped?: boolean;
      snapshot?: AutomationRemoteSnapshot;
    };
    if (!json.ok || json.skipped || !json.snapshot) return false;
    mergeTenantRows(RULES_KEY, json.snapshot.rules, tenantId, {
      skipIds: removedRuleIds(tenantId),
      skipSystemKeys: removedSystemKeys(tenantId)
    });
    mergeTenantRows(SCHEDULES_KEY, json.snapshot.schedules, tenantId);
    mergeTenantRows(EVENTS_KEY, json.snapshot.events, tenantId);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT));
    }
    return true;
  } catch {
    return false;
  }
}

export async function pushAutomationToSupabase(tenantId?: string) {
  if (typeof window === "undefined") return false;
  const snapshot = buildAutomationSnapshot(tenantId);
  try {
    const res = await fetch("/api/automation/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...snapshot, tenantId: tenantId ?? snapshot.tenantId })
    });
    const json = (await res.json()) as { ok?: boolean };
    return Boolean(json.ok);
  } catch {
    return false;
  }
}

export function subscribeAutomation(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

export function ensureAutomationSeeded(tenantId: string) {
  if (typeof window === "undefined") return;
  const seeded = read<Record<string, boolean>>(SEEDED_KEY, {});
  if (!seeded[tenantId]) {
    const { rules, schedules, chains } = seedAutomationForTenant(tenantId);
    const existingRules = read<AutomationRule[]>(RULES_KEY, []).filter((r) => r.tenant_id === tenantId);
    const existingSchedules = read<AutomationSchedule[]>(SCHEDULES_KEY, []).filter((r) => r.tenant_id === tenantId);
    const existingChains = read<ApprovalChainDef[]>(CHAINS_KEY, []).filter((r) => r.tenant_id === tenantId);
    if (existingRules.length === 0) write(RULES_KEY, [...rules, ...read<AutomationRule[]>(RULES_KEY, [])]);
    if (existingSchedules.length === 0) {
      write(SCHEDULES_KEY, [...schedules, ...read<AutomationSchedule[]>(SCHEDULES_KEY, [])]);
    }
    if (existingChains.length === 0) {
      write(CHAINS_KEY, [...chains, ...read<ApprovalChainDef[]>(CHAINS_KEY, [])]);
    }
    write(SEEDED_KEY, { ...seeded, [tenantId]: true });
  }
  mergeMissingSystemRules(tenantId);
}

/** Add new built-in rules by event_key without overwriting tenant/custom rules. */
function mergeMissingSystemRules(tenantId: string) {
  if (typeof window === "undefined") return;
  const patchKey = `${SYSTEM_RULES_PATCH_KEY}:${tenantId}`;
  if (window.localStorage.getItem(patchKey)) return;

  const { rules: seeded } = seedAutomationForTenant(tenantId);
  const rows = read<AutomationRule[]>(RULES_KEY, []);
  const existingKeys = new Set(
    rows.filter((r) => r.tenant_id === tenantId && r.is_system).map((r) => `${r.event_key}::${r.name}`)
  );
  const toAdd = seeded.filter(
    (r) =>
      r.is_system &&
      r.tenant_id === tenantId &&
      !existingKeys.has(`${r.event_key}::${r.name}`) &&
      !removedSystemKeys(tenantId).includes(`${r.event_key}::${r.name}`)
  );
  if (toAdd.length) write(RULES_KEY, [...toAdd, ...rows]);
  window.localStorage.setItem(patchKey, "1");
}

/* ─── Rules ─── */

export function listRules(tenantId: string, module?: ModuleKey | "platform") {
  ensureAutomationSeeded(tenantId);
  const removed = new Set(removedRuleIds(tenantId));
  let rows = read<AutomationRule[]>(RULES_KEY, []).filter(
    (r) => r.tenant_id === tenantId && !removed.has(r.id)
  );
  if (module) rows = rows.filter((r) => r.module === module || r.module === "platform");
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export function getRule(id: string) {
  return read<AutomationRule[]>(RULES_KEY, []).find((r) => r.id === id) ?? null;
}

export function saveRule(input: Omit<AutomationRule, "id" | "created_at" | "updated_at"> & { id?: string }) {
  const rows = read<AutomationRule[]>(RULES_KEY, []);
  const ts = now();
  const normalizedInput = {
    ...input,
    actions: normalizeRuleActions(input.actions || [])
  };
  if (input.id) {
    const idx = rows.findIndex((r) => r.id === input.id);
    if (idx >= 0) {
      rows[idx] = { ...rows[idx], ...normalizedInput, id: input.id, updated_at: ts };
      write(RULES_KEY, rows);
      queueAutomationRemoteSync(true);
      return rows[idx];
    }
  }
  const row: AutomationRule = {
    ...normalizedInput,
    id: id(),
    created_at: ts,
    updated_at: ts
  };
  rows.unshift(row);
  write(RULES_KEY, rows);
  queueAutomationRemoteSync(true);
  return row;
}

export function deleteRule(ruleId: string) {
  const rows = read<AutomationRule[]>(RULES_KEY, []);
  const row = rows.find((r) => r.id === ruleId);
  if (!row) return false;

  markRuleRemoved(row);
  writeQuiet(
    RULES_KEY,
    rows.filter((r) => r.id !== ruleId)
  );
  queueAutomationRemoteSync(true);
  return true;
}

export function setRuleEnabled(ruleId: string, enabled: boolean) {
  const rows = read<AutomationRule[]>(RULES_KEY, []);
  const idx = rows.findIndex((r) => r.id === ruleId);
  if (idx < 0) return null;
  rows[idx] = { ...rows[idx], enabled, updated_at: now() };
  write(RULES_KEY, rows);
  queueAutomationRemoteSync(true);
  return rows[idx];
}

/* ─── Schedules ─── */

export function listSchedules(tenantId: string, module?: ModuleKey | "platform") {
  ensureAutomationSeeded(tenantId);
  let rows = read<AutomationSchedule[]>(SCHEDULES_KEY, []).filter((r) => r.tenant_id === tenantId);
  if (module) rows = rows.filter((r) => r.module === module || r.module === "platform");
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export function saveSchedule(
  input: Omit<AutomationSchedule, "id" | "created_at" | "updated_at"> & { id?: string }
) {
  const rows = read<AutomationSchedule[]>(SCHEDULES_KEY, []);
  const ts = now();
  if (input.id) {
    const idx = rows.findIndex((r) => r.id === input.id);
    if (idx >= 0) {
      rows[idx] = { ...rows[idx], ...input, id: input.id, updated_at: ts };
      write(SCHEDULES_KEY, rows);
      return rows[idx];
    }
  }
  const row: AutomationSchedule = { ...input, id: id(), created_at: ts, updated_at: ts };
  rows.unshift(row);
  write(SCHEDULES_KEY, rows);
  return row;
}

export function deleteSchedule(scheduleId: string) {
  const rows = read<AutomationSchedule[]>(SCHEDULES_KEY, []);
  const row = rows.find((r) => r.id === scheduleId);
  if (!row) return false;
  writeQuiet(
    SCHEDULES_KEY,
    rows.filter((r) => r.id !== scheduleId)
  );
  queueAutomationRemoteSync(true);
  return true;
}

export function setScheduleEnabled(scheduleId: string, enabled: boolean) {
  const rows = read<AutomationSchedule[]>(SCHEDULES_KEY, []);
  const idx = rows.findIndex((r) => r.id === scheduleId);
  if (idx < 0) return null;
  rows[idx] = { ...rows[idx], enabled, updated_at: now() };
  write(SCHEDULES_KEY, rows);
  return rows[idx];
}

export function touchScheduleRun(scheduleId: string, nextRunAt: string | null) {
  const rows = read<AutomationSchedule[]>(SCHEDULES_KEY, []);
  const idx = rows.findIndex((r) => r.id === scheduleId);
  if (idx < 0) return null;
  rows[idx] = {
    ...rows[idx],
    last_run_at: now(),
    next_run_at: nextRunAt,
    updated_at: now()
  };
  write(SCHEDULES_KEY, rows);
  return rows[idx];
}

/* ─── Approval chains ─── */

export function listApprovalChains(tenantId: string, module?: ModuleKey | "platform") {
  ensureAutomationSeeded(tenantId);
  let rows = read<ApprovalChainDef[]>(CHAINS_KEY, []).filter((r) => r.tenant_id === tenantId);
  if (module) rows = rows.filter((r) => r.module === module || r.module === "platform");
  return rows;
}

export function getApprovalChain(chainId: string) {
  return read<ApprovalChainDef[]>(CHAINS_KEY, []).find((c) => c.id === chainId) ?? null;
}

export function saveApprovalChain(
  input: Omit<ApprovalChainDef, "id" | "created_at" | "updated_at"> & { id?: string }
) {
  const rows = read<ApprovalChainDef[]>(CHAINS_KEY, []);
  const ts = now();
  if (input.id) {
    const idx = rows.findIndex((r) => r.id === input.id);
    if (idx >= 0) {
      rows[idx] = { ...rows[idx], ...input, id: input.id, updated_at: ts };
      write(CHAINS_KEY, rows);
      return rows[idx];
    }
  }
  const row: ApprovalChainDef = { ...input, id: id(), created_at: ts, updated_at: ts };
  rows.unshift(row);
  write(CHAINS_KEY, rows);
  return row;
}

export function deleteApprovalChain(chainId: string) {
  write(
    CHAINS_KEY,
    read<ApprovalChainDef[]>(CHAINS_KEY, []).filter((r) => r.id !== chainId)
  );
  return true;
}

export function listApprovalInstances(tenantId: string, opts?: { status?: ApprovalInstance["status"] }) {
  let rows = read<ApprovalInstance[]>(INSTANCES_KEY, []).filter((r) => r.tenant_id === tenantId);
  if (opts?.status) rows = rows.filter((r) => r.status === opts.status);
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getApprovalInstance(instanceId: string) {
  return read<ApprovalInstance[]>(INSTANCES_KEY, []).find((r) => r.id === instanceId) ?? null;
}

export function saveApprovalInstance(instance: ApprovalInstance) {
  const rows = read<ApprovalInstance[]>(INSTANCES_KEY, []);
  const idx = rows.findIndex((r) => r.id === instance.id);
  if (idx >= 0) rows[idx] = instance;
  else rows.unshift(instance);
  write(INSTANCES_KEY, rows.slice(0, 500));
  return instance;
}

/* ─── Events ─── */

export function appendBusinessEvent(event: Omit<BusinessEvent, "id" | "created_at" | "matched_rule_ids"> & {
  matched_rule_ids?: string[];
}) {
  const rows = read<BusinessEvent[]>(EVENTS_KEY, []);
  const row: BusinessEvent = {
    ...event,
    id: id(),
    matched_rule_ids: event.matched_rule_ids ?? [],
    created_at: now()
  };
  rows.unshift(row);
  write(EVENTS_KEY, rows.slice(0, 2000));
  return row;
}

export function updateEventMatches(
  eventId: string,
  ruleIds: string[],
  actionResults?: BusinessEvent["action_results"]
) {
  const rows = read<BusinessEvent[]>(EVENTS_KEY, []);
  const idx = rows.findIndex((r) => r.id === eventId);
  if (idx < 0) return null;
  rows[idx] = {
    ...rows[idx],
    matched_rule_ids: ruleIds,
    ...(actionResults ? { action_results: actionResults } : {})
  };
  write(EVENTS_KEY, rows);
  return rows[idx];
}

export function listBusinessEvents(
  tenantId: string,
  opts?: { module?: ModuleKey | "platform"; eventKey?: string; limit?: number }
) {
  let rows = read<BusinessEvent[]>(EVENTS_KEY, []).filter((r) => r.tenant_id === tenantId);
  if (opts?.module) rows = rows.filter((r) => r.module === opts.module || r.module === "platform");
  if (opts?.eventKey) rows = rows.filter((r) => r.event_key === opts.eventKey);
  return rows.slice(0, opts?.limit ?? 200);
}

/* ─── Tasks ─── */

export function listAutomationTasks(tenantId: string) {
  return read<AutomationTask[]>(TASKS_KEY, [])
    .filter((t) => t.tenant_id === tenantId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function createAutomationTask(input: Omit<AutomationTask, "id" | "created_at" | "updated_at" | "status"> & {
  status?: AutomationTask["status"];
}) {
  const rows = read<AutomationTask[]>(TASKS_KEY, []);
  const ts = now();
  const row: AutomationTask = {
    ...input,
    id: id(),
    status: input.status ?? "open",
    created_at: ts,
    updated_at: ts
  };
  rows.unshift(row);
  write(TASKS_KEY, rows.slice(0, 500));
  return row;
}

export function completeAutomationTask(taskId: string) {
  const rows = read<AutomationTask[]>(TASKS_KEY, []);
  const idx = rows.findIndex((t) => t.id === taskId);
  if (idx < 0) return null;
  rows[idx] = { ...rows[idx], status: "done", updated_at: now() };
  write(TASKS_KEY, rows);
  return rows[idx];
}

/* ─── Channels ─── */

export function getChannelSettings(tenantId: string): ChannelStatus[] {
  const stored = read<Record<string, Partial<ChannelStatus>>>(CHANNELS_KEY, {});
  const tenantMap = (stored[tenantId] as unknown as Record<string, Partial<ChannelStatus>>) || stored;
  // Support both shapes: flat overrides by channel key
  return CHANNEL_DEFAULTS.map((c) => {
    const override =
      (stored as Record<string, Partial<ChannelStatus>>)[`${tenantId}:${c.channel}`] ||
      (tenantMap as Record<string, Partial<ChannelStatus>>)?.[c.channel];
    return {
      ...c,
      enabled: override?.enabled ?? c.enabled
    };
  });
}

export function setChannelEnabled(tenantId: string, channel: ChannelStatus["channel"], enabled: boolean) {
  const stored = read<Record<string, Partial<ChannelStatus>>>(CHANNELS_KEY, {});
  stored[`${tenantId}:${channel}`] = { channel, enabled };
  write(CHANNELS_KEY, stored);
  return getChannelSettings(tenantId);
}

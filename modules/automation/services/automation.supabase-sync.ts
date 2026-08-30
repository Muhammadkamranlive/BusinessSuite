import type {
  AutomationRule,
  AutomationSchedule,
  BusinessEvent
} from "@/lib/automation/types";
import { getSupabaseAdminClient, hasSecretKey } from "@/lib/supabase/server";
import { toDbTenantId, toUiTenantId } from "@/lib/tenants/ids";

export type AutomationRemoteSnapshot = {
  version: number;
  /** When set, reconcile DB deletes for this tenant (rules/schedules not in snapshot are removed). */
  tenantId?: string;
  rules: AutomationRule[];
  schedules: AutomationSchedule[];
  events: BusinessEvent[];
};

function remapRuleRow(row: Record<string, unknown>, toDb: boolean): Record<string, unknown> {
  const next = { ...row };
  if (typeof next.tenant_id === "string") {
    next.tenant_id = toDb ? toDbTenantId(next.tenant_id) : toUiTenantId(next.tenant_id);
  }
  return next;
}

function ruleToDb(rule: AutomationRule): Record<string, unknown> {
  return remapRuleRow(
    {
      id: rule.id,
      tenant_id: rule.tenant_id,
      name: rule.name,
      description: rule.description ?? null,
      module: rule.module,
      event_key: rule.event_key,
      enabled: rule.enabled,
      is_system: Boolean(rule.is_system),
      conditions: rule.conditions ?? [],
      actions: rule.actions ?? [],
      created_at: rule.created_at,
      updated_at: rule.updated_at
    },
    true
  );
}

function ruleFromDb(row: Record<string, unknown>): AutomationRule {
  const r = remapRuleRow(row, false);
  return {
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    name: String(r.name),
    description: r.description ? String(r.description) : undefined,
    module: r.module as AutomationRule["module"],
    event_key: String(r.event_key),
    enabled: Boolean(r.enabled),
    is_system: Boolean(r.is_system),
    conditions: (r.conditions as AutomationRule["conditions"]) ?? [],
    actions: (r.actions as AutomationRule["actions"]) ?? [],
    created_at: String(r.created_at),
    updated_at: String(r.updated_at)
  };
}

function scheduleToDb(s: AutomationSchedule): Record<string, unknown> {
  const next = remapRuleRow(
    {
      id: s.id,
      tenant_id: s.tenant_id,
      name: s.name,
      description: s.description ?? null,
      module: s.module,
      enabled: s.enabled,
      is_system: Boolean(s.is_system),
      frequency: s.frequency,
      time_hhmm: s.time_hhmm,
      weekday: s.weekday ?? null,
      event_key: s.event_key,
      payload: s.payload ?? {},
      last_run_at: s.last_run_at ?? null,
      next_run_at: s.next_run_at ?? null,
      created_at: s.created_at,
      updated_at: s.updated_at
    },
    true
  );
  return next;
}

function scheduleFromDb(row: Record<string, unknown>): AutomationSchedule {
  const r = remapRuleRow(row, false);
  return {
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    name: String(r.name),
    description: r.description ? String(r.description) : undefined,
    module: r.module as AutomationSchedule["module"],
    enabled: Boolean(r.enabled),
    is_system: Boolean(r.is_system),
    frequency: r.frequency as AutomationSchedule["frequency"],
    time_hhmm: String(r.time_hhmm ?? "08:00"),
    weekday: r.weekday != null ? Number(r.weekday) : undefined,
    event_key: String(r.event_key),
    payload: (r.payload as Record<string, string>) ?? {},
    last_run_at: r.last_run_at ? String(r.last_run_at) : null,
    next_run_at: r.next_run_at ? String(r.next_run_at) : null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at)
  };
}

export function isAutomationSupabaseSyncEnabled() {
  return hasSecretKey() && process.env.NEXT_PUBLIC_AUTOMATION_USE_SUPABASE !== "false";
}

export async function pushAutomationSnapshot(snapshot: AutomationRemoteSnapshot) {
  if (!isAutomationSupabaseSyncEnabled()) {
    return { ok: false as const, reason: "Supabase secret key missing or automation sync disabled" };
  }

  const admin = getSupabaseAdminClient();
  const errors: string[] = [];

  if (snapshot.rules?.length) {
    const { error } = await admin.from("automation_rules").upsert(
      snapshot.rules.map(ruleToDb),
      { onConflict: "id" }
    );
    if (error) errors.push(`automation_rules upsert: ${error.message}`);
  }

  if (snapshot.schedules?.length) {
    const { error } = await admin.from("automation_schedules").upsert(
      snapshot.schedules.map(scheduleToDb),
      { onConflict: "id" }
    );
    if (error) errors.push(`automation_schedules upsert: ${error.message}`);
  }

  if (snapshot.tenantId) {
    await reconcileAutomationDeletes(admin, snapshot, snapshot.tenantId, errors);
  } else {
    const tenantIds = [...new Set(snapshot.rules.map((r) => r.tenant_id))];
    for (const tid of tenantIds) {
      await reconcileAutomationDeletes(admin, snapshot, tid, errors);
    }
    const scheduleTenants = [...new Set(snapshot.schedules.map((s) => s.tenant_id))];
    for (const tid of scheduleTenants) {
      if (!tenantIds.includes(tid)) {
        await reconcileAutomationDeletes(admin, snapshot, tid, errors);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

async function reconcileAutomationDeletes(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  snapshot: AutomationRemoteSnapshot,
  uiTenantId: string,
  errors: string[]
) {
  const dbTenant = toDbTenantId(uiTenantId);
  const keepRuleIds = snapshot.rules.filter((r) => r.tenant_id === uiTenantId).map((r) => r.id);
  const keepScheduleIds = snapshot.schedules.filter((s) => s.tenant_id === uiTenantId).map((s) => s.id);

  const { data: dbRules, error: rulesListErr } = await admin
    .from("automation_rules")
    .select("id")
    .eq("tenant_id", dbTenant);
  if (rulesListErr) errors.push(`automation_rules list: ${rulesListErr.message}`);
  else {
    const deleteRuleIds = (dbRules ?? [])
      .map((r) => String(r.id))
      .filter((id) => !keepRuleIds.includes(id));
    if (deleteRuleIds.length) {
      const { error } = await admin.from("automation_rules").delete().in("id", deleteRuleIds);
      if (error) errors.push(`automation_rules delete: ${error.message}`);
    }
  }

  const { data: dbSchedules, error: schedListErr } = await admin
    .from("automation_schedules")
    .select("id")
    .eq("tenant_id", dbTenant);
  if (schedListErr) errors.push(`automation_schedules list: ${schedListErr.message}`);
  else {
    const deleteScheduleIds = (dbSchedules ?? [])
      .map((s) => String(s.id))
      .filter((id) => !keepScheduleIds.includes(id));
    if (deleteScheduleIds.length) {
      const { error } = await admin.from("automation_schedules").delete().in("id", deleteScheduleIds);
      if (error) errors.push(`automation_schedules delete: ${error.message}`);
    }
  }
}

export async function deleteAutomationRuleFromDb(ruleId: string) {
  if (!isAutomationSupabaseSyncEnabled()) return { ok: false as const };
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("automation_rules").delete().eq("id", ruleId);
  return { ok: !error, error: error?.message };
}

export async function pullAutomationSnapshot(uiTenantId?: string): Promise<{
  ok: boolean;
  snapshot?: AutomationRemoteSnapshot;
  reason?: string;
  errors?: string[];
}> {
  if (!isAutomationSupabaseSyncEnabled()) {
    return { ok: false, reason: "Supabase secret key missing or automation sync disabled" };
  }

  const admin = getSupabaseAdminClient();
  const dbTenant = uiTenantId ? toDbTenantId(uiTenantId) : null;
  const errors: string[] = [];

  let rulesQuery = admin.from("automation_rules").select("*");
  let schedulesQuery = admin.from("automation_schedules").select("*");
  let eventsQuery = admin.from("automation_events").select("*").order("created_at", { ascending: false }).limit(200);

  if (dbTenant) {
    rulesQuery = rulesQuery.eq("tenant_id", dbTenant);
    schedulesQuery = schedulesQuery.eq("tenant_id", dbTenant);
    eventsQuery = eventsQuery.eq("tenant_id", dbTenant);
  }

  const [rulesRes, schedulesRes, eventsRes] = await Promise.all([rulesQuery, schedulesQuery, eventsQuery]);

  if (rulesRes.error) errors.push(`automation_rules: ${rulesRes.error.message}`);
  if (schedulesRes.error) errors.push(`automation_schedules: ${schedulesRes.error.message}`);
  if (eventsRes.error) errors.push(`automation_events: ${eventsRes.error.message}`);

  const snapshot: AutomationRemoteSnapshot = {
    version: 1,
    rules: (rulesRes.data ?? []).map((r) => ruleFromDb(r as Record<string, unknown>)),
    schedules: (schedulesRes.data ?? []).map((s) => scheduleFromDb(s as Record<string, unknown>)),
    events: (eventsRes.data ?? []).map((e) => {
      const row = e as Record<string, unknown>;
      const tenant = remapRuleRow({ tenant_id: row.tenant_id }, false);
      return {
        id: String(row.id),
        tenant_id: String(tenant.tenant_id),
        module: row.module as BusinessEvent["module"],
        event_key: String(row.event_key),
        title: String(row.title),
        message: row.message ? String(row.message) : undefined,
        actor_email: row.actor_email ? String(row.actor_email) : null,
        entity_id: row.entity_id ? String(row.entity_id) : null,
        entity_label: row.entity_label ? String(row.entity_label) : null,
        payload: (row.payload as Record<string, unknown>) ?? {},
        matched_rule_ids: (row.matched_rule_ids as string[]) ?? [],
        action_results: (row.action_results as BusinessEvent["action_results"]) ?? [],
        created_at: String(row.created_at)
      };
    })
  };

  return { ok: true, snapshot, errors: errors.length ? errors : undefined };
}

/** Load enabled rules for an event directly from DB (server emit). */
export async function loadRulesForEventFromDb(tenantId: string, eventKey: string): Promise<AutomationRule[]> {
  if (!isAutomationSupabaseSyncEnabled()) return [];
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("automation_rules")
    .select("*")
    .eq("tenant_id", toDbTenantId(tenantId))
    .eq("event_key", eventKey)
    .eq("enabled", true);
  if (error || !data) return [];
  return data.map((r) => ruleFromDb(r as Record<string, unknown>));
}

export async function appendAutomationEventToDb(event: BusinessEvent) {
  if (!isAutomationSupabaseSyncEnabled()) return { ok: false as const };
  const admin = getSupabaseAdminClient();
  const row = remapRuleRow(
    {
      id: event.id,
      tenant_id: event.tenant_id,
      module: event.module,
      event_key: event.event_key,
      title: event.title,
      message: event.message ?? null,
      actor_email: event.actor_email ?? null,
      entity_id: event.entity_id ?? null,
      entity_label: event.entity_label ?? null,
      payload: event.payload ?? {},
      matched_rule_ids: event.matched_rule_ids ?? [],
      action_results: event.action_results ?? [],
      created_at: event.created_at
    },
    true
  );
  const { error } = await admin.from("automation_events").upsert(row, { onConflict: "id" });
  return { ok: !error, error: error?.message };
}

export async function insertEmailOutboxJob(input: {
  tenantId: string;
  payload: Record<string, unknown>;
  meta?: Record<string, unknown>;
}) {
  if (!isAutomationSupabaseSyncEnabled()) return { ok: false as const };
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("email_outbox_jobs").insert({
    tenant_id: toDbTenantId(input.tenantId),
    status: "pending",
    attempts: 0,
    kind: "templated",
    payload: input.payload,
    meta: input.meta ?? {}
  });
  return { ok: !error, error: error?.message };
}

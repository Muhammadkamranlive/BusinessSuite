import type { ModuleKey } from "@/lib/permissions";
import type { AutomationRule, BusinessEvent } from "@/lib/automation/types";
import { flattenPayload, interpolate } from "@/lib/automation/interpolate";
import { normalizeEventVars } from "@/lib/automation/runtime";
import { dispatchActionServer } from "@/lib/automation/server-channels";
import {
  appendAutomationEventToDb,
  isAutomationSupabaseSyncEnabled,
  loadRulesForEventFromDb
} from "@/modules/automation/services/automation.supabase-sync";

function now() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID();
}

function matchCondition(
  cond: { field: string; op: string; value?: string },
  vars: Record<string, unknown>
) {
  const flat = flattenPayload(vars);
  const raw = flat[cond.field] ?? (vars[cond.field] != null ? String(vars[cond.field]) : "");
  const expected = cond.value ?? "";
  switch (cond.op) {
    case "eq":
      return raw.toLowerCase() === expected.toLowerCase();
    case "neq":
      return raw.toLowerCase() !== expected.toLowerCase();
    case "contains":
      return raw.toLowerCase().includes(expected.toLowerCase());
    case "exists":
      return Boolean(raw);
    default:
      return true;
  }
}

function ruleMatches(rule: AutomationRule, vars: Record<string, unknown>) {
  if (!rule.enabled) return false;
  if (!rule.conditions?.length) return true;
  return rule.conditions.every((c) => matchCondition(c, vars));
}

export type EmitAutomationServerInput = {
  tenantId: string;
  module: ModuleKey | "platform";
  eventKey: string;
  title?: string;
  message?: string;
  actorEmail?: string;
  entityId?: string;
  entityLabel?: string;
  payload?: Record<string, unknown>;
  supportEmail?: string;
  companyName?: string;
};

/** DB-first event bus — loads rules from Supabase, sends email server-side. */
export async function emitBusinessEventServer(input: EmitAutomationServerInput) {
  if (!isAutomationSupabaseSyncEnabled()) {
    return { ok: false as const, reason: "automation_db_sync_off" };
  }

  const payload: Record<string, unknown> = {
    ...(input.payload || {}),
    actor_email: input.actorEmail || (input.payload?.actor_email as string) || ""
  };

  const vars = normalizeEventVars(payload, {
    actorEmail: input.actorEmail,
    eventKey: input.eventKey,
    entityId: input.entityId,
    entityLabel: input.entityLabel
  });
  if (input.supportEmail) {
    vars.support_email = input.supportEmail.trim().toLowerCase();
    vars.company_email = vars.support_email;
  }

  const event: BusinessEvent = {
    id: id(),
    tenant_id: input.tenantId,
    module: input.module,
    event_key: input.eventKey,
    title: input.title || input.eventKey,
    message: input.message,
    actor_email: input.actorEmail ?? null,
    entity_id: input.entityId ?? null,
    entity_label: input.entityLabel ?? null,
    payload,
    matched_rule_ids: [],
    action_results: [],
    created_at: now()
  };

  const rules = await loadRulesForEventFromDb(input.tenantId, input.eventKey);
  const matched: string[] = [];
  const actionResults: NonNullable<BusinessEvent["action_results"]> = [];

  for (const rule of rules) {
    if (!ruleMatches(rule, vars)) continue;
    matched.push(rule.id);
    for (const action of rule.actions) {
      const result = await dispatchActionServer(action, {
        tenantId: input.tenantId,
        module: rule.module,
        eventId: event.id,
        ruleId: rule.id,
        vars,
        supportEmail: input.supportEmail,
        companyName: input.companyName
      });
      actionResults.push({
        rule_id: rule.id,
        action_id: action.id,
        type: action.type,
        ok: result.ok,
        detail: result.detail
      });
    }
  }

  event.matched_rule_ids = matched;
  event.action_results = actionResults;
  await appendAutomationEventToDb(event);

  return { ok: true as const, event, matched: matched.length, actionResults };
}

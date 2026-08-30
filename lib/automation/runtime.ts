import type { ModuleKey } from "@/lib/permissions";
import type {
  ApprovalInstance,
  ApprovalStepInstance,
  AutomationCondition,
  AutomationRule,
  BusinessEvent
} from "@/lib/automation/types";
import { dispatchAction } from "@/lib/automation/channels";
import { flattenPayload, interpolate } from "@/lib/automation/interpolate";
import { getEventCatalogEntry } from "@/lib/automation/catalog";
import {
  appendBusinessEvent,
  getApprovalChain,
  getApprovalInstance,
  listBusinessEvents,
  listRules,
  saveApprovalInstance,
  updateEventMatches
} from "@/modules/automation/services/automation.store";
import { createNotification } from "@/modules/core/services/notification.service";
import { startOutboxWorker } from "@/lib/email/outbox";
import { getSystemSettings } from "@/modules/admin/services/admin.store";

function now() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID();
}

function matchCondition(cond: AutomationCondition, vars: Record<string, unknown>) {
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

/** Flatten payload + common recipient aliases so {{user_email}} / {{assignee_email}} resolve. */
export function normalizeEventVars(
  payload: Record<string, unknown>,
  extras?: { actorEmail?: string; eventKey?: string; entityId?: string; entityLabel?: string }
): Record<string, unknown> {
  const flat = flattenPayload(payload);
  const userEmail = String(
    flat.user_email || payload.user_email || extras?.actorEmail || flat.actor_email || ""
  )
    .trim()
    .toLowerCase();
  const actorEmail = String(flat.actor_email || extras?.actorEmail || userEmail || "")
    .trim()
    .toLowerCase();
  let supportEmail = String(flat.support_email || payload.support_email || "").trim().toLowerCase();
  if (!supportEmail && typeof window !== "undefined") {
    try {
      supportEmail = getSystemSettings().supportEmail?.trim().toLowerCase() || "";
    } catch {
      supportEmail = "";
    }
  }
  return {
    ...payload,
    ...flat,
    user_email: userEmail,
    actor_email: actorEmail,
    assignee_email: String(flat.assignee_email || payload.assignee_email || userEmail || "").trim().toLowerCase(),
    requester_email: String(flat.requester_email || payload.requester_email || actorEmail || "").trim().toLowerCase(),
    customer_email: String(flat.customer_email || payload.customer_email || "").trim().toLowerCase(),
    buyer_email: String(flat.buyer_email || payload.buyer_email || "").trim().toLowerCase(),
    support_email: supportEmail,
    company_email: supportEmail,
    event_key: extras?.eventKey,
    entity_id: extras?.entityId,
    entity_label: extras?.entityLabel
  };
}

/** Rules that would fire for an event (for UI debugging). */
export function previewMatchingRules(
  tenantId: string,
  eventKey: string,
  payload: Record<string, unknown>,
  actorEmail?: string
) {
  const vars = normalizeEventVars(payload, { actorEmail, eventKey });
  return listRules(tenantId).filter((r) => r.enabled && r.event_key === eventKey && ruleMatches(r, vars));
}

export type EmitBusinessEventInput = {
  tenantId: string;
  module: ModuleKey | "platform";
  eventKey: string;
  title?: string;
  message?: string;
  actorEmail?: string;
  entityId?: string;
  entityLabel?: string;
  payload?: Record<string, unknown>;
  /** Skip rule execution (log only) */
  logOnly?: boolean;
  /** When true, send_email actions are skipped (already handled server-side). */
  skipEmailActions?: boolean;
};

/** Central bus: log event → match rules → run actions (notify / email / task / approval). */
export function emitBusinessEvent(input: EmitBusinessEventInput): BusinessEvent {
  if (typeof window !== "undefined") startOutboxWorker();

  const catalog = getEventCatalogEntry(input.eventKey);
  const payload: Record<string, unknown> = {
    ...(input.payload || {}),
    actor_email: input.actorEmail || (input.payload?.actor_email as string) || ""
  };

  const event = appendBusinessEvent({
    tenant_id: input.tenantId,
    module: input.module,
    event_key: input.eventKey,
    title: input.title || catalog?.label || input.eventKey,
    message: input.message,
    actor_email: input.actorEmail ?? null,
    entity_id: input.entityId ?? null,
    entity_label: input.entityLabel ?? null,
    payload,
    matched_rule_ids: []
  });

  if (input.logOnly) return event;

  const vars = normalizeEventVars(payload, {
    actorEmail: input.actorEmail,
    eventKey: input.eventKey,
    entityId: input.entityId,
    entityLabel: input.entityLabel
  });

  // Match by event key within tenant — module on the rule is for UI grouping only.
  const rules = listRules(input.tenantId).filter((r) => r.enabled && r.event_key === input.eventKey);

  const matched: string[] = [];
  const actionResults: NonNullable<BusinessEvent["action_results"]> = [];

  for (const rule of rules) {
    if (!ruleMatches(rule, vars)) continue;
    matched.push(rule.id);
    for (const action of rule.actions) {
      if (input.skipEmailActions && action.type === "send_email") continue;
      if (action.type === "start_approval") {
        startApprovalFromAction({
          tenantId: input.tenantId,
          module: rule.module,
          chainId: action.approvalChainId || "",
          title: interpolate(action.title || rule.name, flattenPayload(vars)),
          message: interpolate(action.message || "", flattenPayload(vars)),
          requestedBy: input.actorEmail || String(payload.requester_email || payload.actor_email || ""),
          entityId: input.entityId,
          entityLabel: input.entityLabel,
          payload: vars
        });
        actionResults.push({
          rule_id: rule.id,
          action_id: action.id,
          type: action.type,
          ok: true,
          detail: "approval started"
        });
        continue;
      }
      const result = dispatchAction(action, {
        tenantId: input.tenantId,
        module: rule.module,
        eventId: event.id,
        ruleId: rule.id,
        vars
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

  if (matched.length) updateEventMatches(event.id, matched, actionResults);
  return { ...event, matched_rule_ids: matched, action_results: actionResults };
}

export function startApprovalFromAction(input: {
  tenantId: string;
  module: ModuleKey | "platform";
  chainId: string;
  title: string;
  message?: string;
  requestedBy: string;
  entityId?: string;
  entityLabel?: string;
  payload?: Record<string, unknown>;
}) {
  const chain = getApprovalChain(input.chainId);
  if (!chain || !chain.enabled) return null;

  const steps: ApprovalStepInstance[] = [...chain.steps]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      id: id(),
      step_def_id: s.id,
      name: s.name,
      order: s.order,
      status: "pending" as const,
      assignee_email: s.approver_email || null,
      decided_by: null,
      decided_at: null,
      comment: null
    }));

  if (!steps.length) return null;

  const instance: ApprovalInstance = {
    id: id(),
    tenant_id: input.tenantId,
    chain_id: chain.id,
    chain_name: chain.name,
    module: input.module,
    title: input.title,
    status: "pending",
    current_step: steps[0].order,
    steps,
    requested_by: input.requestedBy,
    entity_id: input.entityId ?? null,
    entity_label: input.entityLabel ?? null,
    payload: input.payload,
    created_at: now(),
    updated_at: now()
  };

  saveApprovalInstance(instance);
  notifyApprovalStep(instance, steps[0]);
  return instance;
}

function notifyApprovalStep(instance: ApprovalInstance, step: ApprovalStepInstance) {
  const email = step.assignee_email;
  if (!email) return;
  createNotification({
    tenantId: instance.tenant_id,
    userEmail: email,
    title: `Approval needed: ${instance.title}`,
    message: `Step “${step.name}” on ${instance.chain_name} is waiting for you.`,
    type: "warning",
    href: "/settings/automations",
    event: "approval.step.pending"
  });
  emitBusinessEvent({
    tenantId: instance.tenant_id,
    module: "platform",
    eventKey: "approval.step.pending",
    title: `Approval pending: ${instance.title}`,
    actorEmail: instance.requested_by,
    entityId: instance.id,
    payload: {
      title: instance.title,
      assignee_email: email,
      step: step.name,
      chain: instance.chain_name
    },
    logOnly: true
  });
}

export function decideApprovalStep(input: {
  instanceId: string;
  actorEmail: string;
  decision: "approved" | "rejected";
  comment?: string;
}) {
  const instance = getApprovalInstance(input.instanceId);
  if (!instance || instance.status !== "pending") return null;

  const step = instance.steps.find((s) => s.order === instance.current_step && s.status === "pending");
  if (!step) return null;

  step.status = input.decision;
  step.decided_by = input.actorEmail;
  step.decided_at = now();
  step.comment = input.comment ?? null;
  instance.updated_at = now();

  if (input.decision === "rejected") {
    instance.status = "rejected";
    saveApprovalInstance(instance);
    notifyRequester(instance, "rejected");
    return instance;
  }

  const next = instance.steps
    .filter((s) => s.order > step.order)
    .sort((a, b) => a.order - b.order)[0];

  if (!next) {
    instance.status = "approved";
    saveApprovalInstance(instance);
    notifyRequester(instance, "approved");
    return instance;
  }

  instance.current_step = next.order;
  saveApprovalInstance(instance);
  notifyApprovalStep(instance, next);
  return instance;
}

function notifyRequester(instance: ApprovalInstance, status: "approved" | "rejected") {
  if (instance.requested_by) {
    createNotification({
      tenantId: instance.tenant_id,
      userEmail: instance.requested_by,
      title: `Approval ${status}: ${instance.title}`,
      message: `${instance.chain_name} was ${status}.`,
      type: status === "approved" ? "success" : "warning",
      href: "/settings/automations",
      event: "approval.completed"
    });
  }
  emitBusinessEvent({
    tenantId: instance.tenant_id,
    module: "platform",
    eventKey: "approval.completed",
    title: `Approval ${status}`,
    actorEmail: instance.requested_by,
    entityId: instance.id,
    payload: {
      title: instance.title,
      status,
      requester_email: instance.requested_by
    },
    logOnly: true
  });
}

/** Replay an event through the rule engine again (admin tool). */
export function replayBusinessEvent(tenantId: string, eventId: string) {
  const event = listBusinessEvents(tenantId, { limit: 2000 }).find((e) => e.id === eventId);
  if (!event) return null;
  return emitBusinessEvent({
    tenantId: event.tenant_id,
    module: event.module,
    eventKey: event.event_key,
    title: event.title,
    message: event.message,
    actorEmail: event.actor_email || undefined,
    entityId: event.entity_id || undefined,
    entityLabel: event.entity_label || undefined,
    payload: event.payload
  });
}

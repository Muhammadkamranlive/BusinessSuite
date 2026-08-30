import { EmailTemplateKey } from "@/lib/email/types";
import { enqueueTemplatedEmail, startOutboxWorker } from "@/lib/email/outbox";
import { flattenPayload, interpolate } from "@/lib/automation/interpolate";
import { recipientRawForAction, resolveRecipient, resolveRecipients } from "@/lib/automation/recipients";
import type { AutomationAction, AutomationChannel } from "@/lib/automation/types";
import {
  createAutomationTask,
  getChannelSettings
} from "@/modules/automation/services/automation.store";
import { createNotification } from "@/modules/core/services/notification.service";
import type { ModuleKey } from "@/lib/permissions";
import { getSystemSettings } from "@/modules/admin/services/admin.store";

function companyName() {
  if (typeof window === "undefined") return "BusinessSuite";
  try {
    const raw = window.localStorage.getItem("businesssuite:admin:settings");
    if (!raw) return "BusinessSuite";
    const parsed = JSON.parse(raw) as { companyName?: string };
    return parsed.companyName?.trim() || "BusinessSuite";
  } catch {
    return "BusinessSuite";
  }
}

export type ActionContext = {
  tenantId: string;
  module: ModuleKey | "platform";
  eventId?: string;
  ruleId?: string;
  vars: Record<string, unknown>;
};

function channelAllowed(tenantId: string, channel: AutomationChannel | undefined) {
  if (!channel) return true;
  const settings = getChannelSettings(tenantId);
  const row = settings.find((c) => c.channel === channel);
  if (!row) return false;
  if (!row.enabled) return false;
  if (!row.ready && (channel === "sms" || channel === "whatsapp")) return false;
  return true;
}

export function dispatchAction(action: AutomationAction, ctx: ActionContext) {
  const flat = { ...flattenPayload(ctx.vars), ...ctx.vars };
  const title = interpolate(action.title || "Automation", flat);
  const message = interpolate(action.message || "", flat);
  const href = interpolate(action.href || "", flat) || undefined;

  switch (action.type) {
    case "log_only":
      return { ok: true, detail: "logged" };

    case "notify_in_app": {
      if (!channelAllowed(ctx.tenantId, "in_app")) return { ok: false, detail: "in_app disabled" };
      const to = resolveRecipient(action.to || action.assigneeEmail, flat);
      if (!to) return { ok: false, detail: "missing recipient" };
      createNotification({
        tenantId: ctx.tenantId,
        userEmail: to,
        title,
        message,
        type: "info",
        targetModule: ctx.module === "platform" ? "settings" : ctx.module,
        href: href ?? null,
        event: "automation.rule"
      });
      return { ok: true, detail: `in_app → ${to}` };
    }

    case "send_email": {
      if (!channelAllowed(ctx.tenantId, action.channel || "email")) {
        return { ok: false, detail: "email channel disabled" };
      }
      const rawTo = recipientRawForAction(action);
      const recipients = resolveRecipients(rawTo, flat);
      if (!recipients.length) {
        return {
          ok: false,
          detail: rawTo
            ? `invalid email recipient (“${rawTo}”) — use a literal address or {{support_email}} / {{user_email}}`
            : "missing Email To — set a literal address (e.g. support@company.com) or {{variable}}"
        };
      }
      if (typeof window !== "undefined") startOutboxWorker();

      const supportEmail =
        String(flat.support_email || "").trim().toLowerCase() ||
        (typeof window !== "undefined" ? getSystemSettings().supportEmail?.trim().toLowerCase() : "") ||
        "";

      const eventVars = flattenPayload(ctx.vars);
      const queued: string[] = [];

      for (const recipient of recipients) {
        const vars = {
          company_name: companyName(),
          title,
          message,
          support_email: supportEmail,
          ...eventVars,
          user_name: String(eventVars.user_name || ctx.vars.user_name || recipient),
          user_email: recipient,
          ...(action.variables || {})
        };
        enqueueTemplatedEmail({
          to: recipient,
          tenantId: ctx.tenantId,
          templateKey: action.emailTemplateKey || EmailTemplateKey.GenericNotification,
          variables: vars,
          meta: { automation: true, ruleId: ctx.ruleId, eventId: ctx.eventId, rawTo }
        });
        queued.push(recipient);
      }

      return { ok: true, detail: `email queued → ${queued.join(", ")}` };
    }

    case "create_task": {
      const assignee = resolveRecipient(action.assigneeEmail || action.to, flat);
      const taskTitle = interpolate(action.taskTitle || action.title || "Automation task", flat);
      createAutomationTask({
        tenant_id: ctx.tenantId,
        module: ctx.module,
        title: taskTitle,
        description: message,
        assignee_email: assignee || null,
        source_event_id: ctx.eventId ?? null,
        source_rule_id: ctx.ruleId ?? null,
        href: href ?? null
      });
      if (assignee && channelAllowed(ctx.tenantId, "in_app")) {
        createNotification({
          tenantId: ctx.tenantId,
          userEmail: assignee,
          title: `Task: ${taskTitle}`,
          message: message || "A new automation task was created for you.",
          type: "info",
          href: href ?? "/settings/automations",
          event: "automation.task"
        });
      }
      return { ok: true, detail: `task → ${assignee || "unassigned"}` };
    }

    case "assign": {
      const assignee = resolveRecipient(action.assigneeEmail || action.to, flat);
      if (assignee && channelAllowed(ctx.tenantId, "in_app")) {
        createNotification({
          tenantId: ctx.tenantId,
          userEmail: assignee,
          title: title || "Assigned to you",
          message: message || "An automation rule assigned this item to you.",
          type: "info",
          href: href ?? null,
          event: "automation.assign"
        });
      }
      return { ok: true, detail: `assign → ${assignee || "none"}` };
    }

    case "start_approval":
      // Handled in runtime to avoid circular imports with approvals helper
      return { ok: true, detail: "start_approval_deferred" };

    default:
      return { ok: false, detail: "unknown action" };
  }
}

/** SMS / WhatsApp stubs — record intent when channel not ready. */
export function stubFutureChannel(channel: AutomationChannel, to: string, body: string) {
  return {
    ok: false,
    detail: `${channel} not ready (would send to ${to}: ${body.slice(0, 80)})`
  };
}

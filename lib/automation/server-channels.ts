import { EmailTemplateKey } from "@/lib/email/types";
import { sendEmailDirect } from "@/lib/email/send-direct";
import { flattenPayload, interpolate } from "@/lib/automation/interpolate";
import { recipientRawForAction, resolveRecipient, resolveRecipients } from "@/lib/automation/recipients";
import type { AutomationAction, AutomationChannel } from "@/lib/automation/types";
import { insertEmailOutboxJob } from "@/modules/automation/services/automation.supabase-sync";
import type { ModuleKey } from "@/lib/permissions";

export type ServerActionContext = {
  tenantId: string;
  module: ModuleKey | "platform";
  eventId?: string;
  ruleId?: string;
  vars: Record<string, unknown>;
  supportEmail?: string;
  companyName?: string;
};

function channelAllowedServer(channel: AutomationChannel | undefined) {
  if (!channel) return true;
  if (channel === "email" || channel === "in_app") return true;
  return false;
}

export async function dispatchActionServer(action: AutomationAction, ctx: ServerActionContext) {
  const flat = { ...flattenPayload(ctx.vars), ...ctx.vars };
  const title = interpolate(action.title || "Automation", flat);
  const message = interpolate(action.message || "", flat);
  const href = interpolate(action.href || "", flat) || undefined;

  switch (action.type) {
    case "log_only":
      return { ok: true, detail: "logged" };

    case "notify_in_app":
      return { ok: true, detail: "in_app (client bell — open app to sync)" };

    case "send_email": {
      if (!channelAllowedServer(action.channel || "email")) {
        return { ok: false, detail: "email channel disabled" };
      }
      const rawTo = recipientRawForAction(action);
      const recipients = resolveRecipients(rawTo, flat);
      if (!recipients.length) {
        return {
          ok: false,
          detail: rawTo
            ? `invalid recipient “${rawTo}”`
            : "missing Email To — use {{user_email}}, custom@address, or both comma-separated"
        };
      }

      const supportEmail = String(ctx.supportEmail || flat.support_email || "").trim().toLowerCase();
      const eventVars = flattenPayload(ctx.vars);
      const queued: string[] = [];
      const errors: string[] = [];

      for (const recipient of recipients) {
        const vars = {
          company_name: ctx.companyName || "BusinessSuite",
          title,
          message,
          support_email: supportEmail,
          ...eventVars,
          user_name: String(eventVars.user_name || ctx.vars.user_name || recipient),
          user_email: recipient,
          ...(action.variables || {})
        };

        const payload = {
          to: recipient,
          tenantId: ctx.tenantId,
          templateKey: action.emailTemplateKey || EmailTemplateKey.GenericNotification,
          variables: vars,
          meta: { automation: true, ruleId: ctx.ruleId, eventId: ctx.eventId, rawTo, server: true }
        };

        await insertEmailOutboxJob({
          tenantId: ctx.tenantId,
          payload,
          meta: payload.meta as Record<string, unknown>
        });

        const sent = await sendEmailDirect(payload);
        if (sent.ok) {
          queued.push(recipient);
        } else {
          errors.push(`${recipient}: ${sent.error || "send failed"}`);
        }
      }

      if (!queued.length) {
        return { ok: false, detail: errors.join("; ") || "email send failed" };
      }
      return { ok: true, detail: `email sent → ${queued.join(", ")}` };
    }

    case "create_task":
    case "assign":
      return { ok: true, detail: `${action.type} (synced via client store)` };

    case "start_approval":
      return { ok: true, detail: "start_approval_deferred" };

    default:
      return { ok: false, detail: "unknown action" };
  }
}

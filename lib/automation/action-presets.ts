import { EmailTemplateKey } from "@/lib/email/types";
import type { EmailTemplate } from "@/lib/email/types";
import type { AutomationAction, AutomationActionType } from "@/lib/automation/types";
import { getEventCatalogEntry } from "@/lib/automation/catalog";

export type ActionPreset = {
  title?: string;
  message?: string;
  href?: string;
  to?: string;
  assigneeEmail?: string;
  taskTitle?: string;
  emailTemplateKey?: string;
};

/** Suggested email template per business event (Send email actions). */
const EVENT_EMAIL_TEMPLATE: Record<string, string> = {
  "auth.login": EmailTemplateKey.SecurityLogin,
  "auth.password_changed": EmailTemplateKey.SecurityPasswordChanged,
  "account.profile_updated": EmailTemplateKey.AccountProfileUpdated,
  "subscription.activated": EmailTemplateKey.SubscriptionActivated,
  "hrm.leave.submitted": EmailTemplateKey.LeaveSubmitted,
  "hrm.leave.decided": EmailTemplateKey.LeaveApproved,
  "sales.invoice.overdue": EmailTemplateKey.InvoiceGenerated,
  "sales.order.approved": EmailTemplateKey.OrderApproved,
  "sales.quotation.sent": EmailTemplateKey.GenericNotification
};

function recipientForEvent(eventKey: string): string {
  const p = getEventCatalogEntry(eventKey)?.samplePayload || {};
  const keys = [
    "user_email",
    "assignee_email",
    "actor_email",
    "customer_email",
    "buyer_email",
    "requester_email",
    "employee_email",
    "approver_email",
    "owner_email",
    "billing_email",
    "patient_email"
  ];
  for (const k of keys) {
    if (p[k]) return `{{${k}}}`;
  }
  return "{{user_email}}";
}

function moduleHref(eventKey: string): string {
  if (eventKey.startsWith("crm.")) return "/crm";
  if (eventKey.startsWith("sales.")) return "/sales/invoices";
  if (eventKey.startsWith("purchase.")) return "/purchases";
  if (eventKey.startsWith("inventory.")) return "/inventory";
  if (eventKey.startsWith("hrm.")) return "/hrm";
  if (eventKey.startsWith("projects.")) return "/projects";
  if (eventKey.startsWith("finance.")) return "/finance";
  if (eventKey.startsWith("documents.")) return "/documents";
  if (eventKey.startsWith("healthcare.")) return "/healthcare";
  if (eventKey.startsWith("auth.")) return "/profile";
  if (eventKey.startsWith("subscription.")) return "/settings/billing";
  return "/dashboard";
}

/** Default title / message / recipient per event + action type. */
export function presetForEventAction(eventKey: string, type: AutomationActionType): ActionPreset {
  const entry = getEventCatalogEntry(eventKey);
  const label = entry?.label || eventKey;
  const to = recipientForEvent(eventKey);
  const href = moduleHref(eventKey);
  const emailTpl = EVENT_EMAIL_TEMPLATE[eventKey] || EmailTemplateKey.GenericNotification;

  const presets: Record<string, Partial<Record<AutomationActionType, ActionPreset>>> = {
    "auth.login": {
      notify_in_app: {
        to: "{{user_email}}",
        title: "Signed in",
        message: "Welcome back — signed in from {{device_label}} at {{signed_in_at}}.",
        href: "/dashboard"
      },
      send_email: {
        to: "{{user_email}}",
        emailTemplateKey: EmailTemplateKey.SecurityLogin,
        title: "Sign-in alert — {{company_name}}",
        message:
          "Hi {{user_name}}, a sign-in to your {{company_name}} account was detected from {{device_label}} at {{signed_in_at}}.",
        href: "/profile"
      },
      create_task: {
        assigneeEmail: "{{user_email}}",
        taskTitle: "Review post-login checklist",
        message: "Automation task after sign-in from {{device_label}}.",
        href: "/dashboard"
      }
    },
    "auth.password_changed": {
      notify_in_app: {
        to: "{{user_email}}",
        title: "Password changed",
        message: "Your password was changed. If this wasn’t you, contact support immediately.",
        href: "/profile"
      },
      send_email: {
        to: "{{user_email}}",
        emailTemplateKey: EmailTemplateKey.SecurityPasswordChanged,
        title: "Password changed — {{company_name}}",
        message: "Your {{company_name}} password was changed from {{device_label}}.",
        href: "/profile"
      }
    },
    "crm.lead.assigned": {
      notify_in_app: {
        to: "{{assignee_email}}",
        title: "Lead assigned: {{lead_name}}",
        message: "{{actor_email}} assigned {{lead_name}} to you.",
        href: "/crm/leads"
      },
      send_email: {
        to: "{{assignee_email}}",
        emailTemplateKey: EmailTemplateKey.GenericNotification,
        title: "Lead assigned: {{lead_name}}",
        message: "{{actor_email}} assigned lead {{lead_name}} to you. Open CRM to follow up.",
        href: "/crm/leads"
      },
      create_task: {
        assigneeEmail: "{{assignee_email}}",
        taskTitle: "Follow up lead {{lead_name}}",
        message: "New lead {{lead_name}} assigned by {{actor_email}}.",
        href: "/crm/leads"
      }
    },
    "sales.invoice.overdue": {
      send_email: {
        to: "{{customer_email}}",
        emailTemplateKey: EmailTemplateKey.GenericNotification,
        title: "Invoice {{invoice_no}} is overdue",
        message: "Invoice {{invoice_no}} for {{amount}} is past due. Please arrange payment.",
        href: "/sales/invoices"
      },
      notify_in_app: {
        to: "{{support_email}}",
        title: "Overdue invoice {{invoice_no}}",
        message: "Customer notified for overdue {{invoice_no}} ({{amount}}).",
        href: "/sales/invoices"
      }
    },
    "inventory.stock.low": {
      notify_in_app: {
        to: "{{buyer_email}}",
        title: "Low stock: {{product_name}}",
        message: "{{product_name}} is down to {{qty}} units.",
        href: "/inventory/low-stock"
      },
      create_task: {
        assigneeEmail: "{{buyer_email}}",
        taskTitle: "Reorder {{product_name}}",
        message: "Stock for {{product_name}} is low ({{qty}} units).",
        href: "/purchases/requisitions"
      }
    },
    "hrm.leave.submitted": {
      send_email: {
        to: "{{approver_email}}",
        emailTemplateKey: EmailTemplateKey.LeaveSubmitted,
        title: "Leave request from {{employee_name}}",
        message: "{{employee_name}} submitted {{leave_type}} leave. Review in HRM.",
        href: "/hrm/leave"
      },
      notify_in_app: {
        to: "{{approver_email}}",
        title: "Leave request: {{employee_name}}",
        message: "{{employee_name}} submitted {{leave_type}} leave for approval.",
        href: "/hrm/leave"
      }
    },
    "platform.schedule.tick": {
      notify_in_app: {
        to: "{{support_email}}",
        title: "Scheduled job: {{schedule_name}}",
        message: "Schedule “{{schedule_name}}” ({{frequency}}) completed.",
        href: "/settings/automations"
      }
    }
  };

  const specific = presets[eventKey]?.[type];
  if (specific) return specific;

  const generic: Record<AutomationActionType, ActionPreset> = {
    notify_in_app: {
      to,
      title: label,
      message: `${label} — review details in BusinessSuite.`,
      href
    },
    send_email: {
      to,
      emailTemplateKey: emailTpl,
      title: label,
      message: `${label}. Open BusinessSuite for details.`,
      href
    },
    create_task: {
      assigneeEmail: to,
      taskTitle: label,
      message: `${label} — complete the follow-up task.`,
      href
    },
    assign: {
      assigneeEmail: to,
      title: `Assigned: ${label}`,
      message: `You were assigned an item for ${label}.`,
      href
    },
    start_approval: {
      to: "{{requester_email}}",
      title: `Approve: ${label}`,
      message: `${label} requires your approval.`,
      href: "/settings/automations"
    },
    log_only: {
      title: label,
      message: `${label} logged.`
    }
  };

  return generic[type] || { title: label, message: `${label}.` };
}

/** Merge preset onto an action (keeps id + type). */
export function applyPresetToAction(
  action: AutomationAction,
  preset: ActionPreset,
  opts?: { fillRecipientOnly?: boolean }
): AutomationAction {
  const next = { ...action };
  if (preset.title != null && !opts?.fillRecipientOnly) next.title = preset.title;
  if (preset.message != null && !opts?.fillRecipientOnly) next.message = preset.message;
  if (preset.href != null && !opts?.fillRecipientOnly) next.href = preset.href;
  if (preset.emailTemplateKey != null) next.emailTemplateKey = preset.emailTemplateKey;
  if (preset.taskTitle != null && !opts?.fillRecipientOnly) next.taskTitle = preset.taskTitle;

  if (action.type === "send_email") {
    if (preset.to != null) next.to = preset.to;
  } else if (action.type === "create_task" || action.type === "assign") {
    if (preset.assigneeEmail != null) next.assigneeEmail = preset.assigneeEmail;
  } else if (preset.to != null) {
    next.to = preset.to;
  }

  if (action.type === "send_email") {
    next.channel = "email";
    if (!next.emailTemplateKey) next.emailTemplateKey = EmailTemplateKey.GenericNotification;
  }
  if (action.type === "notify_in_app") next.channel = "in_app";

  return next;
}

export function applyEventPresetsToActions(
  eventKey: string,
  actions: AutomationAction[]
): AutomationAction[] {
  return actions.map((a) => applyPresetToAction(a, presetForEventAction(eventKey, a.type)));
}

export function fieldsFromEmailTemplate(tpl: EmailTemplate): { title: string; message: string } {
  const title = tpl.subject?.trim() || tpl.name;
  const message =
    tpl.text?.trim() ||
    tpl.html
      ?.replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim() ||
    tpl.description ||
    "";
  return { title, message };
}

export function applyTemplateToAction(action: AutomationAction, tpl: EmailTemplate): AutomationAction {
  const { title, message } = fieldsFromEmailTemplate(tpl);
  return {
    ...action,
    emailTemplateKey: tpl.key,
    channel: "email",
    title,
    message
  };
}

export function newActionForEvent(eventKey: string, type: AutomationActionType = "notify_in_app"): AutomationAction {
  const base: AutomationAction = {
    id: crypto.randomUUID(),
    type,
    channel: type === "send_email" ? "email" : "in_app",
    to: type === "send_email" ? "" : "{{user_email}}",
    title: "Alert",
    message: "Automation fired.",
    href: "",
    emailTemplateKey: type === "send_email" ? EmailTemplateKey.GenericNotification : undefined
  };
  return applyPresetToAction(base, presetForEventAction(eventKey, type));
}

/** Templates sorted: event-matched first, then category, then name. */
export function sortTemplatesForEvent(templates: EmailTemplate[], eventKey: string) {
  const preferred = EVENT_EMAIL_TEMPLATE[eventKey];
  return [...templates].sort((a, b) => {
    if (preferred) {
      if (a.key === preferred && b.key !== preferred) return -1;
      if (b.key === preferred && a.key !== preferred) return 1;
    }
    const cat = a.category.localeCompare(b.category);
    if (cat !== 0) return cat;
    return a.name.localeCompare(b.name);
  });
}

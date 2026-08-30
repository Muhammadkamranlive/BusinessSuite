import type {
  ApprovalChainDef,
  AutomationRule,
  AutomationSchedule
} from "@/lib/automation/types";

function now() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID();
}

/** Default rules / schedules / chains for a new tenant. */
export function seedAutomationForTenant(tenantId: string): {
  rules: AutomationRule[];
  schedules: AutomationSchedule[];
  chains: ApprovalChainDef[];
} {
  const ts = now();

  const rules: AutomationRule[] = [
    {
      id: id(),
      tenant_id: tenantId,
      name: "Every login → in-app + task",
      description: "Fires on every auth.login — use To/assignee {{user_email}} for the signed-in user.",
      module: "platform",
      event_key: "auth.login",
      enabled: true,
      is_system: true,
      conditions: [],
      actions: [
        {
          id: id(),
          type: "notify_in_app",
          channel: "in_app",
          to: "{{user_email}}",
          title: "Signed in",
          message: "Welcome back — signed in from {{device_label}} at {{signed_in_at}}.",
          href: "/dashboard"
        },
        {
          id: id(),
          type: "create_task",
          assigneeEmail: "{{user_email}}",
          taskTitle: "Review post-login checklist",
          message: "Automation task after sign-in from {{device_label}}.",
          href: "/dashboard"
        }
      ],
      created_at: ts,
      updated_at: ts
    },
    {
      id: id(),
      tenant_id: tenantId,
      name: "Scheduled tick → notify company admin",
      description: "Runs when a schedule emits platform.schedule.tick.",
      module: "platform",
      event_key: "platform.schedule.tick",
      enabled: true,
      is_system: true,
      conditions: [],
      actions: [
        {
          id: id(),
          type: "notify_in_app",
          channel: "in_app",
          to: "{{support_email}}",
          title: "Scheduled job: {{schedule_name}}",
          message: "Schedule “{{schedule_name}}” ({{frequency}}) completed.",
          href: "/settings/automations"
        }
      ],
      created_at: ts,
      updated_at: ts
    },
    {
      id: id(),
      tenant_id: tenantId,
      name: "Notify on new device login",
      description: "In-app alert when a login is marked as a new device.",
      module: "platform",
      event_key: "auth.login",
      enabled: true,
      is_system: true,
      conditions: [{ field: "is_new_device", op: "eq", value: "yes" }],
      actions: [
        {
          id: id(),
          type: "notify_in_app",
          channel: "in_app",
          to: "{{user_email}}",
          title: "New device sign-in",
          message: "New sign-in from {{device_label}}. If this wasn’t you, change your password.",
          href: "/profile"
        }
      ],
      created_at: ts,
      updated_at: ts
    },
    {
      id: id(),
      tenant_id: tenantId,
      name: "Email assignee when CRM lead assigned",
      description: "Example CRM rule — enable after CRM emits crm.lead.assigned.",
      module: "crm",
      event_key: "crm.lead.assigned",
      enabled: true,
      is_system: true,
      conditions: [],
      actions: [
        {
          id: id(),
          type: "notify_in_app",
          channel: "in_app",
          to: "{{assignee_email}}",
          title: "Lead assigned: {{lead_name}}",
          message: "{{actor_email}} assigned {{lead_name}} to you.",
          href: "/crm/leads"
        },
        {
          id: id(),
          type: "send_email",
          channel: "email",
          to: "{{assignee_email}}",
          title: "Lead assigned: {{lead_name}}",
          message: "{{actor_email}} assigned lead {{lead_name}} to you. Open CRM to follow up.",
          emailTemplateKey: "generic.notification"
        },
        {
          id: id(),
          type: "create_task",
          to: "{{assignee_email}}",
          assigneeEmail: "{{assignee_email}}",
          taskTitle: "Follow up lead {{lead_name}}",
          href: "/crm/leads"
        }
      ],
      created_at: ts,
      updated_at: ts
    },
    {
      id: id(),
      tenant_id: tenantId,
      name: "Low stock → notify buyer + task",
      description: "Example inventory rule for reorder alerts.",
      module: "inventory",
      event_key: "inventory.stock.low",
      enabled: true,
      is_system: true,
      conditions: [],
      actions: [
        {
          id: id(),
          type: "notify_in_app",
          channel: "in_app",
          to: "{{buyer_email}}",
          title: "Low stock: {{product_name}}",
          message: "{{product_name}} is down to {{qty}} units.",
          href: "/inventory/low-stock"
        },
        {
          id: id(),
          type: "create_task",
          assigneeEmail: "{{buyer_email}}",
          taskTitle: "Reorder {{product_name}}",
          href: "/purchases/requisitions"
        }
      ],
      created_at: ts,
      updated_at: ts
    },
    {
      id: id(),
      tenant_id: tenantId,
      name: "PO approval chain",
      description: "Starts the default purchase approval chain when a requisition is submitted.",
      module: "purchases",
      event_key: "purchase.requisition.submitted",
      enabled: true,
      is_system: true,
      conditions: [],
      actions: [
        {
          id: id(),
          type: "start_approval",
          approvalChainId: "seed-chain-po",
          title: "Approve requisition {{req_no}}",
          message: "Requisition {{req_no}} needs approval.",
          to: "{{requester_email}}"
        }
      ],
      created_at: ts,
      updated_at: ts
    },
    {
      id: id(),
      tenant_id: tenantId,
      name: "Overdue invoice dunning (email)",
      description: "Email customer when sales.invoice.overdue is emitted (scheduler or sales job).",
      module: "sales",
      event_key: "sales.invoice.overdue",
      enabled: true,
      is_system: true,
      conditions: [],
      actions: [
        {
          id: id(),
          type: "send_email",
          channel: "email",
          to: "{{customer_email}}",
          title: "Invoice {{invoice_no}} is overdue",
          message: "Invoice {{invoice_no}} for {{amount}} is past due. Please arrange payment.",
          emailTemplateKey: "generic.notification",
          href: "/sales/invoices"
        },
        {
          id: id(),
          type: "notify_in_app",
          channel: "in_app",
          to: "{{support_email}}",
          title: "Overdue invoice {{invoice_no}}",
          message: "Customer notified for overdue {{invoice_no}} ({{amount}}).",
          href: "/sales/invoices"
        }
      ],
      created_at: ts,
      updated_at: ts
    }
  ];

  const schedules: AutomationSchedule[] = [
    {
      id: id(),
      tenant_id: tenantId,
      name: "Daily operations digest",
      description: "Emits platform.schedule.tick every day so digest rules can attach later.",
      module: "platform",
      enabled: true,
      is_system: true,
      frequency: "daily",
      time_hhmm: "08:00",
      event_key: "platform.schedule.tick",
      payload: { digest: "daily", schedule_name: "Daily operations digest" },
      last_run_at: null,
      next_run_at: null,
      created_at: ts,
      updated_at: ts
    },
    {
      id: id(),
      tenant_id: tenantId,
      name: "Weekly executive summary",
      description: "Monday morning weekly tick for reports digests.",
      module: "reports",
      enabled: true,
      is_system: true,
      frequency: "weekly",
      time_hhmm: "09:00",
      weekday: 1,
      event_key: "platform.schedule.tick",
      payload: { digest: "weekly", schedule_name: "Weekly executive summary" },
      last_run_at: null,
      next_run_at: null,
      created_at: ts,
      updated_at: ts
    }
  ];

  const chains: ApprovalChainDef[] = [
    {
      id: "seed-chain-po",
      tenant_id: tenantId,
      name: "Purchase requisition approval",
      description: "Manager then finance for purchasing.",
      module: "purchases",
      enabled: true,
      steps: [
        {
          id: id(),
          name: "Manager review",
          order: 1,
          approver_role: "company_admin",
          approver_email: "manager@demo.com"
        },
        {
          id: id(),
          name: "Finance review",
          order: 2,
          approver_role: "finance_manager",
          approver_email: "finance@demo.com"
        }
      ],
      created_at: ts,
      updated_at: ts
    },
    {
      id: id(),
      tenant_id: tenantId,
      name: "Leave multi-step (example)",
      description: "Line manager then HR.",
      module: "hrm",
      enabled: true,
      steps: [
        {
          id: id(),
          name: "Line manager",
          order: 1,
          approver_email: "manager@demo.com"
        },
        {
          id: id(),
          name: "HR",
          order: 2,
          approver_email: "hr@demo.com"
        }
      ],
      created_at: ts,
      updated_at: ts
    }
  ];

  // Fix PO rule to use actual chain id
  const poRule = rules.find((r) => r.event_key === "purchase.requisition.submitted");
  if (poRule) {
    for (const a of poRule.actions) {
      if (a.type === "start_approval") a.approvalChainId = "seed-chain-po";
    }
  }

  return { rules, schedules, chains };
}

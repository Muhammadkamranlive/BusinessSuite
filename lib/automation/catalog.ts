import type { ModuleKey } from "@/lib/permissions";
import type { EventCatalogEntry } from "@/lib/automation/types";

/** Known business events modules can emit. Expand as each module wires automation. */
export const EVENT_CATALOG: EventCatalogEntry[] = [
  {
    key: "platform.schedule.tick",
    module: "platform",
    label: "Scheduled job tick",
    description: "Fired by the scheduler when a job is due.",
    samplePayload: { schedule_name: "Daily digest", frequency: "daily" }
  },
  {
    key: "auth.login",
    module: "platform",
    label: "User signed in",
    description: "Successful workspace login (with device details).",
    samplePayload: { user_email: "user@demo.com", device_label: "Chrome on macOS", is_new_device: "no" }
  },
  {
    key: "auth.password_changed",
    module: "platform",
    label: "Password changed",
    description: "User or admin changed a login password.",
    samplePayload: { user_email: "user@demo.com", by_admin: "no" }
  },
  {
    key: "account.profile_updated",
    module: "dashboard",
    label: "Profile updated",
    description: "User saved profile details.",
    samplePayload: { user_email: "user@demo.com", summary: "Contact details updated" }
  },
  {
    key: "subscription.activated",
    module: "settings",
    label: "Subscription activated",
    description: "Company subscription became active.",
    samplePayload: { package_code: "gold", billing_email: "billing@demo.com" }
  },
  {
    key: "crm.lead.assigned",
    module: "crm",
    label: "Lead assigned",
    description: "A lead was assigned to a salesperson.",
    samplePayload: {
      lead_name: "Acme Lead",
      assignee_email: "sales@demo.com",
      actor_email: "manager@demo.com"
    }
  },
  {
    key: "crm.deal.stage_changed",
    module: "crm",
    label: "Deal stage changed",
    description: "Opportunity moved to a new pipeline stage.",
    samplePayload: { deal_name: "Acme Deal", stage: "Proposal", owner_email: "sales@demo.com" }
  },
  {
    key: "crm.ticket.sla_breach",
    module: "crm",
    label: "Ticket SLA breach",
    description: "Support ticket exceeded SLA.",
    samplePayload: { ticket_no: "TK-1001", assignee_email: "sales@demo.com" }
  },
  {
    key: "sales.quotation.sent",
    module: "sales",
    label: "Quotation sent",
    description: "Quotation emailed / marked sent to customer.",
    samplePayload: { quote_no: "Q-1001", customer_email: "buyer@acme.com", total: "1200" }
  },
  {
    key: "sales.invoice.overdue",
    module: "sales",
    label: "Invoice overdue",
    description: "Customer invoice past due date.",
    samplePayload: { invoice_no: "INV-1001", customer_email: "buyer@acme.com", amount: "500" }
  },
  {
    key: "sales.order.approved",
    module: "sales",
    label: "Sales order approved",
    description: "Order approved for fulfillment.",
    samplePayload: { order_no: "SO-1001", customer_email: "buyer@acme.com" }
  },
  {
    key: "purchase.po.approved",
    module: "purchases",
    label: "Purchase order approved",
    description: "PO approved and ready to send.",
    samplePayload: { po_no: "PO-1001", buyer_email: "warehouse@demo.com", supplier_name: "Vendor Co" }
  },
  {
    key: "purchase.requisition.submitted",
    module: "purchases",
    label: "Requisition submitted",
    description: "Purchase requisition awaiting approval.",
    samplePayload: { req_no: "PR-1001", requester_email: "employee@demo.com" }
  },
  {
    key: "inventory.stock.low",
    module: "inventory",
    label: "Low stock",
    description: "Product fell below reorder level.",
    samplePayload: { product_name: "Widget", qty: "3", buyer_email: "warehouse@demo.com" }
  },
  {
    key: "hrm.leave.submitted",
    module: "hrm",
    label: "Leave submitted",
    description: "Employee submitted a leave request.",
    samplePayload: { employee_name: "Hassan", approver_email: "hr@demo.com", leave_type: "Annual" }
  },
  {
    key: "hrm.leave.decided",
    module: "hrm",
    label: "Leave decided",
    description: "Leave approved or rejected.",
    samplePayload: { employee_email: "employee@demo.com", decision: "approved" }
  },
  {
    key: "projects.task.assigned",
    module: "projects",
    label: "Task assigned",
    description: "Project task assigned to a user.",
    samplePayload: { task_title: "Prepare demo", assignee_email: "employee@demo.com" }
  },
  {
    key: "finance.budget.overrun",
    module: "finance",
    label: "Budget overrun",
    description: "Budget utilization crossed threshold.",
    samplePayload: { budget_name: "Marketing", pct: "90", owner_email: "finance@demo.com" }
  },
  {
    key: "documents.upload.overdue",
    module: "documents",
    label: "Required upload overdue",
    description: "Employee missed a required document due date.",
    samplePayload: { document_type: "CNIC", employee_email: "employee@demo.com" }
  },
  {
    key: "healthcare.appointment.reminder",
    module: "healthcare",
    label: "Appointment reminder",
    description: "Upcoming patient appointment.",
    samplePayload: { patient_email: "patient@demo.com", when: "Tomorrow 10:00" }
  },
  {
    key: "operations.maintenance.due",
    module: "operations",
    label: "Maintenance due",
    description: "Preventive maintenance window reached.",
    samplePayload: { asset_name: "Line A", owner_email: "manager@demo.com" }
  },
  {
    key: "approval.step.pending",
    module: "platform",
    label: "Approval step pending",
    description: "A multi-step approval needs action.",
    samplePayload: { title: "PO approval", assignee_email: "manager@demo.com" }
  },
  {
    key: "approval.completed",
    module: "platform",
    label: "Approval completed",
    description: "Approval chain finished (approved or rejected).",
    samplePayload: { title: "PO approval", status: "approved", requester_email: "employee@demo.com" }
  }
];

export function eventsForModule(module: ModuleKey | "platform" | "all") {
  if (module === "all") return EVENT_CATALOG;
  return EVENT_CATALOG.filter((e) => e.module === module || e.module === "platform");
}

export function getEventCatalogEntry(key: string) {
  return EVENT_CATALOG.find((e) => e.key === key) ?? null;
}

export const CHANNEL_DEFAULTS = [
  {
    channel: "in_app" as const,
    enabled: true,
    ready: true,
    label: "In-app notifications",
    description: "Bell icon alerts inside BusinessSuite (live)."
  },
  {
    channel: "email" as const,
    enabled: true,
    ready: true,
    label: "Email",
    description: "Queued via the email outbox worker and Gmail/Nodemailer API (live)."
  },
  {
    channel: "sms" as const,
    enabled: false,
    ready: false,
    label: "SMS",
    description: "Coming soon — Twilio/MessageBird style gateway."
  },
  {
    channel: "whatsapp" as const,
    enabled: false,
    ready: false,
    label: "WhatsApp",
    description: "Coming soon — Meta Business API templates."
  }
];

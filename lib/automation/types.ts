import type { ModuleKey } from "@/lib/permissions";

export type AutomationChannel = "in_app" | "email" | "sms" | "whatsapp";

export type AutomationActionType =
  | "notify_in_app"
  | "send_email"
  | "create_task"
  | "assign"
  | "start_approval"
  | "log_only";

export type ScheduleFrequency = "hourly" | "daily" | "weekly";

export type ApprovalInstanceStatus = "pending" | "approved" | "rejected" | "cancelled";

export type AutomationCondition = {
  field: string;
  op: "eq" | "neq" | "contains" | "exists";
  value?: string;
};

export type AutomationAction = {
  id: string;
  type: AutomationActionType;
  /** Channel for notify/email; sms/whatsapp reserved */
  channel?: AutomationChannel;
  /** Recipient: literal email, or {{payload.field}} / {{actor_email}} / {{assignee_email}} */
  to?: string;
  title?: string;
  message?: string;
  href?: string;
  emailTemplateKey?: string;
  /** For assign / create_task */
  assigneeEmail?: string;
  taskTitle?: string;
  /** Approval chain definition id */
  approvalChainId?: string;
  /** Extra template variables */
  variables?: Record<string, string>;
};

export type AutomationRule = {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  module: ModuleKey | "platform";
  /** Catalog event key e.g. crm.lead.assigned */
  event_key: string;
  enabled: boolean;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  is_system?: boolean;
  created_at: string;
  updated_at: string;
};

export type AutomationSchedule = {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  module: ModuleKey | "platform";
  enabled: boolean;
  frequency: ScheduleFrequency;
  /** Local time HH:mm for daily/weekly */
  time_hhmm: string;
  /** 0=Sun … 6=Sat for weekly */
  weekday?: number;
  /** Emit this synthetic event when due */
  event_key: string;
  payload?: Record<string, string>;
  last_run_at?: string | null;
  next_run_at?: string | null;
  is_system?: boolean;
  created_at: string;
  updated_at: string;
};

export type ApprovalStepDef = {
  id: string;
  name: string;
  order: number;
  /** Role key or fixed email */
  approver_role?: string;
  approver_email?: string;
};

export type ApprovalChainDef = {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  module: ModuleKey | "platform";
  steps: ApprovalStepDef[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type ApprovalStepInstance = {
  id: string;
  step_def_id: string;
  name: string;
  order: number;
  status: ApprovalInstanceStatus;
  assignee_email?: string | null;
  decided_by?: string | null;
  decided_at?: string | null;
  comment?: string | null;
};

export type ApprovalInstance = {
  id: string;
  tenant_id: string;
  chain_id: string;
  chain_name: string;
  module: ModuleKey | "platform";
  title: string;
  status: ApprovalInstanceStatus;
  current_step: number;
  steps: ApprovalStepInstance[];
  requested_by: string;
  entity_label?: string | null;
  entity_id?: string | null;
  payload?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AutomationTask = {
  id: string;
  tenant_id: string;
  module: ModuleKey | "platform";
  title: string;
  description?: string;
  assignee_email?: string | null;
  status: "open" | "done" | "cancelled";
  source_event_id?: string | null;
  source_rule_id?: string | null;
  href?: string | null;
  created_at: string;
  updated_at: string;
};

export type BusinessEvent = {
  id: string;
  tenant_id: string;
  module: ModuleKey | "platform";
  event_key: string;
  title: string;
  message?: string;
  actor_email?: string | null;
  entity_id?: string | null;
  entity_label?: string | null;
  payload: Record<string, unknown>;
  /** Rule ids that fired */
  matched_rule_ids: string[];
  /** Per-action dispatch results (email queued, errors, etc.) */
  action_results?: Array<{
    rule_id: string;
    action_id: string;
    type: string;
    ok: boolean;
    detail: string;
  }>;
  created_at: string;
};

export type ChannelStatus = {
  channel: AutomationChannel;
  enabled: boolean;
  label: string;
  description: string;
  ready: boolean;
};

export type EventCatalogEntry = {
  key: string;
  module: ModuleKey | "platform";
  label: string;
  description: string;
  samplePayload: Record<string, string>;
};

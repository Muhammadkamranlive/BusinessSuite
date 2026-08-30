import type { TenantEntity, UUID } from "@/modules/core/types";

export type LeadStatus = "new" | "contacted" | "qualified" | "lost" | "converted";
export type LeadPriority = "low" | "medium" | "high";
export type DealStage = "prospecting" | "proposal" | "negotiation" | "won" | "lost";
export type ActivityType = "call" | "email" | "meeting" | "note" | "task";

export interface Lead extends TenantEntity {
  lead_no: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  source: string;
  status: LeadStatus;
  priority: LeadPriority;
  estimated_value: number;
  assigned_to?: UUID | null;
  notes?: string | null;
  score?: number;
  territory?: string | null;
  campaign_id?: UUID | null;
  converted_customer_id?: UUID | null;
  converted_deal_id?: UUID | null;
}

export interface Customer extends TenantEntity {
  customer_no: string;
  name: string;
  type: "individual" | "company";
  email: string;
  phone: string;
  tax_number?: string | null;
  industry?: string | null;
  billing_address?: string | null;
  shipping_address?: string | null;
  status: "active" | "inactive";
  credit_limit?: number;
  credit_terms?: string | null;
  payment_terms?: string | null;
  price_group?: string | null;
  customer_group_id?: UUID | null;
  parent_id?: UUID | null;
  salesperson_id?: UUID | null;
  territory?: string | null;
  currency?: string;
  tax_region?: string | null;
}

export interface Contact extends TenantEntity {
  customer_id?: UUID | null;
  lead_id?: UUID | null;
  full_name: string;
  email: string;
  phone: string;
  designation?: string | null;
  is_primary: boolean;
}

export interface Deal extends TenantEntity {
  deal_no: string;
  title: string;
  customer_id?: UUID | null;
  lead_id?: UUID | null;
  stage: DealStage;
  amount: number;
  probability: number;
  expected_close_date?: string | null;
  assigned_to?: UUID | null;
  status: "open" | "won" | "lost";
  win_loss_reason?: string | null;
  quotation_id?: UUID | null;
  sales_order_id?: UUID | null;
}

export interface CrmActivity extends TenantEntity {
  related_type: "lead" | "customer" | "deal" | "ticket";
  related_id: UUID;
  activity_type: ActivityType;
  subject: string;
  description?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  assigned_to?: UUID | null;
}

export interface CustomerGroup extends TenantEntity {
  name: string;
  code: string;
  price_group?: string | null;
}

export interface Campaign extends TenantEntity {
  campaign_no: string;
  name: string;
  channel: "email" | "sms" | "web" | "event" | "other";
  status: "draft" | "active" | "completed" | "paused";
  budget: number;
  spend: number;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
}

export interface Ticket extends TenantEntity {
  ticket_no: string;
  customer_id?: UUID | null;
  subject: string;
  description?: string | null;
  priority: LeadPriority;
  status: "open" | "pending" | "resolved" | "closed";
  sla_hours: number;
  due_at?: string | null;
  csat_score?: number | null;
}

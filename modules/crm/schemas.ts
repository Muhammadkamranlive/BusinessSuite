import type { LeadPriority, LeadStatus } from "@/modules/crm/types";

export type LeadFormValues = {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  source: string;
  status: LeadStatus;
  priority: LeadPriority;
  estimated_value: number;
  notes?: string;
};

export function validateLeadForm(data: LeadFormValues): string | null {
  if (!data.company_name.trim()) return "Company name is required";
  if (!data.contact_name.trim()) return "Contact name is required";
  if (!data.email.includes("@")) return "Valid email required";
  if (!data.phone.trim()) return "Phone is required";
  return null;
}

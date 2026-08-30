import type {
  Lead,
  Customer,
  Deal,
  CrmActivity,
  Contact,
  CustomerGroup,
  Campaign,
  Ticket
} from "@/modules/crm/types";
import { generateDocumentNumber } from "@/modules/core/services/numbering.service";
import { logCreate, logUpdate } from "@/modules/core/services/audit.service";
import { bindTrashRestore, trashEntityInCollection, updateEntityInCollection } from "@/modules/core/services/entity-crud";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";
import { isClientDatabasePrimary } from "@/lib/database-mode";
import { queueOpsRemoteSync, registerOpsModule } from "@/modules/ops/services/ops-remote";
import type { UUID } from "@/modules/core/types";

function now() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID();
}

let leads: Lead[] = [];
let customers: Customer[] = [];
let deals: Deal[] = [];
let activities: CrmActivity[] = [];
let contacts: Contact[] = [];
let customerGroups: CustomerGroup[] = [];
let campaigns: Campaign[] = [];
let tickets: Ticket[] = [];

const STORAGE_KEY = "businesssuite:crm:v3";
const STORAGE_VERSION = 3;
const DEMO_ALPHA = "alpha";
let hydrated = false;

function seedAlphaCrm() {
  if (customers.some((c) => c.tenant_id === DEMO_ALPHA)) return;

  const eastern = {
    id: id(),
    tenant_id: DEMO_ALPHA,
    customer_no: generateDocumentNumber(DEMO_ALPHA, "customer"),
    name: "Eastern Retail Group",
    type: "company" as const,
    email: "billing@easternretail.example",
    phone: "+971 50 111 2222",
    industry: "Retail",
    status: "active" as const,
    credit_limit: 200000,
    credit_terms: "Net 30",
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  const urban = {
    id: id(),
    tenant_id: DEMO_ALPHA,
    customer_no: generateDocumentNumber(DEMO_ALPHA, "customer"),
    name: "Urban Fashion Mills",
    type: "company" as const,
    email: "accounts@urbanfashion.example",
    phone: "+92 300 777 8888",
    industry: "Manufacturing",
    status: "active" as const,
    credit_limit: 150000,
    credit_terms: "Net 15",
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  customers.push(eastern, urban);

  if (!leads.some((l) => l.tenant_id === DEMO_ALPHA)) {
    leads.push(
      {
        id: id(),
        tenant_id: DEMO_ALPHA,
        lead_no: generateDocumentNumber(DEMO_ALPHA, "lead"),
        company_name: "BlueLine Clinics",
        contact_name: "Hira Noor",
        email: "info@blueline.example",
        phone: "+971 50 222 3333",
        source: "Website",
        status: "qualified",
        priority: "high",
        estimated_value: 94000,
        score: 84,
        created_at: now(),
        updated_at: now(),
        is_active: true
      },
      {
        id: id(),
        tenant_id: DEMO_ALPHA,
        lead_no: generateDocumentNumber(DEMO_ALPHA, "lead"),
        company_name: "Makkah Auto Hub",
        contact_name: "Sales Desk",
        email: "sales@makkahauto.example",
        phone: "+966 50 444 5555",
        source: "Campaign",
        status: "new",
        priority: "medium",
        estimated_value: 78000,
        score: 78,
        created_at: now(),
        updated_at: now(),
        is_active: true
      }
    );
  }

  if (!deals.some((d) => d.tenant_id === DEMO_ALPHA)) {
    deals.push({
      id: id(),
      tenant_id: DEMO_ALPHA,
      deal_no: generateDocumentNumber(DEMO_ALPHA, "deal"),
      title: "Wholesale ERP rollout",
      customer_id: eastern.id,
      stage: "proposal",
      amount: 125000,
      probability: 62,
      expected_close_date: "2026-09-30",
      status: "open",
      created_at: now(),
      updated_at: now(),
      is_active: true
    });
  }

  persist();
}

function persist() {
  savePersisted(STORAGE_KEY, {
    version: STORAGE_VERSION,
    leads,
    customers,
    deals,
    activities,
    contacts,
    customerGroups,
    campaigns,
    tickets
  });
  queueOpsRemoteSync();
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  const snap = loadPersisted<{
    version: number;
    leads: Lead[];
    customers: Customer[];
    deals: Deal[];
    activities: CrmActivity[];
    contacts: Contact[];
    customerGroups?: CustomerGroup[];
    campaigns?: Campaign[];
    tickets?: Ticket[];
  }>(STORAGE_KEY);
  if (snap?.version === STORAGE_VERSION && Array.isArray(snap.leads)) {
    leads = snap.leads;
    customers = snap.customers ?? [];
    deals = snap.deals ?? [];
    activities = snap.activities ?? [];
    contacts = snap.contacts ?? [];
    customerGroups = snap.customerGroups ?? [];
    campaigns = snap.campaigns ?? [];
    tickets = snap.tickets ?? [];
  }
  if (!isClientDatabasePrimary()) seedAlphaCrm();
}

export function listLeads(tenantId: UUID, search?: string) {
  ensureHydrated();
  let result = leads.filter((l) => l.tenant_id === tenantId && l.is_active !== false);
  if (search) {
    const q = search.toLowerCase();
    result = result.filter((l) => l.company_name.toLowerCase().includes(q) || l.contact_name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q));
  }
  return result;
}

export function getLead(id: UUID) {
  return leads.find((l) => l.id === id);
}

export function createLead(tenantId: UUID, data: Omit<Lead, "id" | "tenant_id" | "lead_no" | "created_at" | "updated_at">) {
  ensureHydrated();
  const lead: Lead = {
    ...data,
    id: id(),
    tenant_id: tenantId,
    lead_no: generateDocumentNumber(tenantId, "lead"),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  lead.score = lead.score || scoreLead(lead);
  leads.unshift(lead);
  persist();
  logCreate({ tenantId, module: "crm", entityName: "lead", entityId: lead.id, newData: lead as unknown as Record<string, unknown> });
  return lead;
}

export function scoreLead(lead: Pick<Lead, "source" | "priority" | "estimated_value">) {
  let score = 20;
  if (lead.priority === "high") score += 30;
  if (lead.priority === "medium") score += 15;
  if (lead.source === "referral" || lead.source === "website") score += 20;
  if (lead.estimated_value >= 100000) score += 25;
  else if (lead.estimated_value >= 40000) score += 10;
  return Math.min(100, score);
}

export function updateLead(id: UUID, data: Partial<Lead>) {
  ensureHydrated();
  const index = leads.findIndex((l) => l.id === id);
  if (index === -1) return null;
  const old = { ...leads[index] };
  leads[index] = { ...leads[index], ...data, updated_at: now() };
  persist();
  logUpdate({ tenantId: old.tenant_id, module: "crm", entityName: "lead", entityId: id, oldData: old as unknown as Record<string, unknown>, newData: leads[index] as unknown as Record<string, unknown> });
  return leads[index];
}

export function deleteLead(id: UUID) {
  ensureHydrated();
  return Boolean(trashEntityInCollection(leadRef, id));
}

const leadRef = {
  get: () => leads,
  set: (rows: Lead[]) => {
    leads = rows;
  },
  persist,
  module: "crm",
  entityName: "lead",
  labelOf: (row: Lead) => `${row.lead_no} · ${row.company_name}`
};
const customerRef = {
  get: () => customers,
  set: (rows: Customer[]) => {
    customers = rows;
  },
  persist,
  module: "crm",
  entityName: "customer",
  labelOf: (row: Customer) => `${row.customer_no} · ${row.name}`
};
const dealRef = {
  get: () => deals,
  set: (rows: Deal[]) => {
    deals = rows;
  },
  persist,
  module: "crm",
  entityName: "deal",
  labelOf: (row: Deal) => `${row.deal_no} · ${row.title}`
};
const activityRef = {
  get: () => activities,
  set: (rows: CrmActivity[]) => {
    activities = rows;
  },
  persist,
  module: "crm",
  entityName: "activity",
  labelOf: (row: CrmActivity) => row.subject
};
const contactRef = {
  get: () => contacts,
  set: (rows: Contact[]) => {
    contacts = rows;
  },
  persist,
  module: "crm",
  entityName: "contact",
  labelOf: (row: Contact) => row.full_name
};

bindTrashRestore(leadRef);
bindTrashRestore(customerRef);
bindTrashRestore(dealRef);
bindTrashRestore(activityRef);
bindTrashRestore(contactRef);

export function updateCustomer(id: UUID, data: Partial<Customer>) {
  ensureHydrated();
  return updateEntityInCollection(customerRef, id, data);
}
export function trashCustomer(id: UUID) {
  ensureHydrated();
  return trashEntityInCollection(customerRef, id);
}
export function updateDeal(id: UUID, data: Partial<Deal>) {
  ensureHydrated();
  return updateEntityInCollection(dealRef, id, data);
}
export function trashDeal(id: UUID) {
  ensureHydrated();
  return trashEntityInCollection(dealRef, id);
}
export function updateActivity(id: UUID, data: Partial<CrmActivity>) {
  ensureHydrated();
  return updateEntityInCollection(activityRef, id, data);
}
export function trashActivity(id: UUID) {
  ensureHydrated();
  return trashEntityInCollection(activityRef, id);
}
export function updateContact(id: UUID, data: Partial<Contact>) {
  ensureHydrated();
  return updateEntityInCollection(contactRef, id, data);
}
export function trashContact(id: UUID) {
  ensureHydrated();
  return trashEntityInCollection(contactRef, id);
}
export function trashLead(id: UUID) {
  return deleteLead(id);
}

export function convertLeadToCustomer(leadId: UUID) {
  const lead = getLead(leadId);
  if (!lead || lead.status === "converted") return null;
  const gate = canConvertLead(lead);
  if (!gate.ok) throw new Error(gate.reason);
  const customer = createCustomer(lead.tenant_id, {
    name: lead.company_name,
    type: "company",
    email: lead.email,
    phone: lead.phone,
    industry: null,
    tax_number: null,
    billing_address: null,
    shipping_address: null,
    status: "active"
  });
  const deal = createDeal(lead.tenant_id, {
    title: `${lead.company_name} opportunity`,
    customer_id: customer.id,
    lead_id: lead.id,
    stage: "prospecting",
    amount: lead.estimated_value,
    probability: 40,
    expected_close_date: null,
    assigned_to: lead.assigned_to ?? null,
    status: "open"
  });
  updateLead(leadId, { status: "converted", converted_customer_id: customer.id, converted_deal_id: deal.id });
  return customer;
}

export function convertLeadToDeal(leadId: UUID) {
  const lead = getLead(leadId);
  if (!lead) return null;
  const deal = createDeal(lead.tenant_id, {
    title: lead.company_name,
    customer_id: lead.converted_customer_id ?? null,
    lead_id: lead.id,
    stage: "prospecting",
    amount: lead.estimated_value,
    probability: Math.max(20, lead.score ?? 30),
    expected_close_date: null,
    assigned_to: lead.assigned_to ?? null,
    status: "open"
  });
  updateLead(leadId, { converted_deal_id: deal.id, status: lead.status === "new" ? "qualified" : lead.status });
  return deal;
}

export function listCustomers(tenantId: UUID, search?: string) {
  ensureHydrated();
  let result = customers.filter((c) => c.tenant_id === tenantId && c.is_active !== false);
  if (search) {
    const q = search.toLowerCase();
    result = result.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }
  return result;
}

export function getCustomer(id: UUID) {
  return customers.find((c) => c.id === id);
}

export function getCustomerPriceGroup(tenantId: UUID, customerName?: string | null, customerId?: UUID | null): string | null {
  ensureHydrated();
  const customer = customerId
    ? customers.find((c) => c.id === customerId)
    : customers.find((c) => c.tenant_id === tenantId && c.name === customerName);
  if (!customer) return null;
  if (customer.price_group) return customer.price_group;
  const group = customer.customer_group_id ? customerGroups.find((g) => g.id === customer.customer_group_id) : null;
  return group?.price_group ?? null;
}

export function canConvertLead(lead: Lead) {
  const score = lead.score ?? scoreLead(lead);
  const ok = score >= 50 || lead.status === "qualified" || lead.priority === "high";
  return { ok, score, reason: ok ? "" : `Lead score ${score} is below 50. Qualify the lead or raise priority before convert.` };
}

export function createCustomer(tenantId: UUID, data: Omit<Customer, "id" | "tenant_id" | "customer_no" | "created_at" | "updated_at">) {
  ensureHydrated();
  const customer: Customer = {
    ...data,
    id: id(),
    tenant_id: tenantId,
    customer_no: generateDocumentNumber(tenantId, "customer"),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  customers.unshift(customer);
  persist();
  logCreate({ tenantId, module: "crm", entityName: "customer", entityId: customer.id, newData: customer as unknown as Record<string, unknown> });
  return customer;
}

export function listDeals(tenantId: UUID) {
  ensureHydrated();
  return deals.filter((d) => d.tenant_id === tenantId && d.is_active !== false);
}

export function createDeal(tenantId: UUID, data: Omit<Deal, "id" | "tenant_id" | "deal_no" | "created_at" | "updated_at">) {
  const deal: Deal = {
    ...data,
    id: id(),
    tenant_id: tenantId,
    deal_no: generateDocumentNumber(tenantId, "deal"),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  deals.unshift(deal);
  persist();
  logCreate({ tenantId, module: "crm", entityName: "deal", entityId: deal.id, newData: deal as unknown as Record<string, unknown> });
  return deal;
}

export function updateDealStage(dealId: UUID, stage: Deal["stage"], winLossReason?: string) {
  const deal = deals.find((d) => d.id === dealId);
  if (!deal) return null;
  if ((stage === "won" || stage === "lost") && !winLossReason?.trim() && !deal.win_loss_reason) {
    throw new Error("Enter a win/loss reason before closing the opportunity.");
  }
  deal.stage = stage;
  if (stage === "won") deal.status = "won";
  if (stage === "lost") deal.status = "lost";
  if (winLossReason?.trim()) deal.win_loss_reason = winLossReason.trim();
  if (stage === "won") deal.probability = 100;
  if (stage === "lost") deal.probability = 0;
  deal.updated_at = now();
  persist();
  return deal;
}

export function listActivities(tenantId: UUID) {
  ensureHydrated();
  return activities.filter((a) => a.tenant_id === tenantId);
}

export function createActivity(tenantId: UUID, data: Omit<CrmActivity, "id" | "tenant_id" | "created_at" | "updated_at">) {
  const activity: CrmActivity = {
    ...data,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  activities.unshift(activity);
  persist();
  logCreate({ tenantId, module: "crm", entityName: "activity", entityId: activity.id, newData: activity as unknown as Record<string, unknown> });
  return activity;
}

export function completeActivity(activityId: UUID) {
  ensureHydrated();
  const activity = activities.find((a) => a.id === activityId);
  if (!activity) return null;
  activity.completed_at = now();
  activity.updated_at = now();
  persist();
  return activity;
}

export function getLeadActivities(leadId: UUID) {
  return activities.filter((a) => a.related_type === "lead" && a.related_id === leadId);
}

export function listContacts(tenantId: UUID) {
  ensureHydrated();
  return contacts.filter((c) => c.tenant_id === tenantId && c.is_active !== false);
}

export function createContact(tenantId: UUID, data: Omit<Contact, "id" | "tenant_id" | "created_at" | "updated_at">) {
  ensureHydrated();
  if (data.is_primary && data.customer_id) {
    for (const c of contacts.filter((row) => row.customer_id === data.customer_id && row.is_primary)) {
      c.is_primary = false;
    }
  }
  const contact: Contact = {
    ...data,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  contacts.unshift(contact);
  persist();
  logCreate({ tenantId, module: "crm", entityName: "contact", entityId: contact.id, newData: contact as unknown as Record<string, unknown> });
  return contact;
}

export function listFollowUps(tenantId: UUID) {
  ensureHydrated();
  return activities.filter((a) => a.tenant_id === tenantId && !a.completed_at);
}

export function listCustomerGroups(tenantId: UUID) {
  ensureHydrated();
  return customerGroups.filter((g) => g.tenant_id === tenantId && g.is_active !== false);
}

export function createCustomerGroup(tenantId: UUID, data: Omit<CustomerGroup, "id" | "tenant_id" | "created_at" | "updated_at">) {
  ensureHydrated();
  const row: CustomerGroup = { ...data, id: id(), tenant_id: tenantId, created_at: now(), updated_at: now(), is_active: true };
  customerGroups.unshift(row);
  persist();
  return row;
}

export function listCampaigns(tenantId: UUID) {
  ensureHydrated();
  return campaigns.filter((c) => c.tenant_id === tenantId && c.is_active !== false);
}

export function createCampaign(tenantId: UUID, data: Omit<Campaign, "id" | "tenant_id" | "campaign_no" | "created_at" | "updated_at">) {
  ensureHydrated();
  const row: Campaign = {
    ...data,
    id: id(),
    tenant_id: tenantId,
    campaign_no: generateDocumentNumber(tenantId, "campaign"),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  campaigns.unshift(row);
  persist();
  logCreate({ tenantId, module: "crm", entityName: "campaign", entityId: row.id, newData: row as unknown as Record<string, unknown> });
  return row;
}

export function listTickets(tenantId: UUID) {
  ensureHydrated();
  return tickets.filter((t) => t.tenant_id === tenantId && t.is_active !== false);
}

export function createTicket(tenantId: UUID, data: Omit<Ticket, "id" | "tenant_id" | "ticket_no" | "created_at" | "updated_at">) {
  ensureHydrated();
  const due = new Date();
  due.setHours(due.getHours() + (data.sla_hours || 24));
  const row: Ticket = {
    ...data,
    id: id(),
    tenant_id: tenantId,
    ticket_no: generateDocumentNumber(tenantId, "ticket"),
    due_at: data.due_at ?? due.toISOString(),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  tickets.unshift(row);
  persist();
  return row;
}

export function campaignRoi(tenantId: UUID, campaignId: UUID) {
  ensureHydrated();
  const campaign = campaigns.find((c) => c.id === campaignId);
  if (!campaign) return { spend: 0, pipeline: 0, won: 0, leadCount: 0, roi: 0 };
  const linked = leads.filter((l) => l.campaign_id === campaignId && l.is_active !== false);
  const pipeline = linked.reduce((s, l) => s + (l.estimated_value || 0), 0);
  const won = deals.filter((d) => d.lead_id && linked.some((l) => l.id === d.lead_id) && d.status === "won").reduce((s, d) => s + d.amount, 0);
  const spend = campaign.spend || 0;
  return { spend, pipeline, won, leadCount: linked.length, roi: spend > 0 ? (won - spend) / spend : 0 };
}

export function ticketSlaBreached(ticket: Ticket) {
  if (!ticket.due_at || ticket.status === "resolved" || ticket.status === "closed") return false;
  return new Date(ticket.due_at).getTime() < Date.now();
}

export function advanceTicket(id: UUID) {
  ensureHydrated();
  const ticket = tickets.find((t) => t.id === id);
  if (!ticket) return null;
  const next: Record<Ticket["status"], Ticket["status"]> = { open: "pending", pending: "resolved", resolved: "closed", closed: "closed" };
  ticket.status = next[ticket.status];
  ticket.updated_at = now();
  persist();
  return ticket;
}

const groupRef = {
  get: () => customerGroups,
  set: (rows: CustomerGroup[]) => { customerGroups = rows; },
  persist,
  module: "crm",
  entityName: "customer_group",
  labelOf: (row: CustomerGroup) => row.name
};
const campaignRef = {
  get: () => campaigns,
  set: (rows: Campaign[]) => { campaigns = rows; },
  persist,
  module: "crm",
  entityName: "campaign",
  labelOf: (row: Campaign) => `${row.campaign_no} · ${row.name}`
};
const ticketRef = {
  get: () => tickets,
  set: (rows: Ticket[]) => { tickets = rows; },
  persist,
  module: "crm",
  entityName: "ticket",
  labelOf: (row: Ticket) => `${row.ticket_no} · ${row.subject}`
};

bindTrashRestore(groupRef);
bindTrashRestore(campaignRef);
bindTrashRestore(ticketRef);

export function updateCustomerGroup(id: UUID, data: Partial<CustomerGroup>) { ensureHydrated(); return updateEntityInCollection(groupRef, id, data); }
export function trashCustomerGroup(id: UUID) { ensureHydrated(); return trashEntityInCollection(groupRef, id); }
export function updateCampaign(id: UUID, data: Partial<Campaign>) { ensureHydrated(); return updateEntityInCollection(campaignRef, id, data); }
export function trashCampaign(id: UUID) { ensureHydrated(); return trashEntityInCollection(campaignRef, id); }
export function updateTicket(id: UUID, data: Partial<Ticket>) { ensureHydrated(); return updateEntityInCollection(ticketRef, id, data); }
export function trashTicket(id: UUID) { ensureHydrated(); return trashEntityInCollection(ticketRef, id); }

registerOpsModule({
  build: () => ({
    leads: leads as unknown as Record<string, unknown>[],
    customers: customers as unknown as Record<string, unknown>[],
    deals: deals as unknown as Record<string, unknown>[],
    contacts: contacts as unknown as Record<string, unknown>[],
    activities: activities as unknown as Record<string, unknown>[],
    campaigns: campaigns as unknown as Record<string, unknown>[],
    tickets: tickets as unknown as Record<string, unknown>[],
    customerGroups: customerGroups as unknown as Record<string, unknown>[]
  }),
  apply: (snapshot) => {
    if (snapshot.leads) leads = snapshot.leads as unknown as Lead[];
    if (snapshot.customers) customers = snapshot.customers as unknown as Customer[];
    if (snapshot.deals) deals = snapshot.deals as unknown as Deal[];
    if (snapshot.contacts) contacts = snapshot.contacts as unknown as Contact[];
    if (snapshot.activities) activities = snapshot.activities as unknown as CrmActivity[];
    if (snapshot.campaigns) campaigns = snapshot.campaigns as unknown as Campaign[];
    if (snapshot.tickets) tickets = snapshot.tickets as unknown as Ticket[];
    if (snapshot.customerGroups) customerGroups = snapshot.customerGroups as unknown as CustomerGroup[];
    savePersisted(STORAGE_KEY, {
      version: STORAGE_VERSION,
      leads,
      customers,
      deals,
      activities,
      contacts,
      customerGroups,
      campaigns,
      tickets
    });
  }
});

export { leads, customers, deals, activities, contacts };
export type { Campaign, Ticket, CustomerGroup };

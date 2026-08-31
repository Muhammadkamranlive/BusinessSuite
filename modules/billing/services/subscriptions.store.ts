import type { ModuleKey } from "@/lib/permissions";
import { tenants as seedTenants } from "@/lib/demo-data";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";
import type { UUID } from "@/modules/core/types";

const PACKAGES_KEY = "businesssuite:subscription-packages:v2";
const PACKAGES_CATALOG_PATCH = "businesssuite:packages:deployment-copy:v3";
const SUBS_KEY = "businesssuite:tenant-subscriptions:v1";
const DEMO_TENANT_IDS = new Set(seedTenants.map((t) => t.id));

export type PlanTier = "silver" | "gold" | "platinum" | "professional";
export type BillingInterval = "month" | "year";
export type SubscriptionStatus = "incomplete" | "trialing" | "active" | "past_due" | "canceled" | "unpaid";

export type SubscriptionPackage = {
  id: UUID;
  code: PlanTier;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  features: string[];
  modules: ModuleKey[];
  max_users: number;
  monthly_price_cents: number;
  yearly_price_cents: number;
  currency: string;
  stripe_product_id?: string | null;
  stripe_price_monthly_id?: string | null;
  stripe_price_yearly_id?: string | null;
  highlighted?: boolean;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
};

export type TenantSubscription = {
  id: UUID;
  tenant_id: UUID;
  company_name: string;
  package_id: UUID;
  package_code: PlanTier;
  interval: BillingInterval;
  status: SubscriptionStatus;
  amount_cents: number;
  currency: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_payment_intent_id?: string | null;
  current_period_end?: string | null;
  activated_at?: string | null;
  canceled_at?: string | null;
  billing_email: string;
  created_at: string;
  updated_at: string;
};

function now() {
  return new Date().toISOString();
}

function defaultPackages(): SubscriptionPackage[] {
  const ts = now();
  return [
    {
      id: "pkg-silver",
      code: "silver",
      name: "Silver",
      badge: "Starter",
      tagline: "Essentials for growing teams",
      description: "Core CRM, Sales, and Inventory to run day-to-day operations.",
      features: [
        "Up to 10 users",
        "Modules: Dashboard, CRM, Sales, Inventory, Documents, Reports",
        "Lead & customer pipeline",
        "Stock & warehouse registers",
        "Documents library",
        "Email support",
        "Standard reports",
        "Rule Engine — when→then email & alerts",
        "Intranet deployment available — talk to sales"
      ],
      modules: ["dashboard", "crm", "sales", "inventory", "documents", "reports"],
      max_users: 10,
      monthly_price_cents: 4900,
      yearly_price_cents: 49000,
      currency: "usd",
      highlighted: false,
      is_active: true,
      sort_order: 1,
      updated_at: ts
    },
    {
      id: "pkg-gold",
      code: "gold",
      name: "Gold",
      badge: "Popular",
      tagline: "Procurement, HR, and finance",
      description: "Add Purchases, HRM, and Finance for full mid-market control. Banks, lots, debit notes, and payroll-to-GL live inside those modules.",
      features: [
        "Up to 50 users",
        "Everything in Silver",
        "Modules: Purchases, HRM, Finance, Administration",
        "Purchase orders & three-way match",
        "Payroll-to-GL, leaves & attendance",
        "Extra form fields",
        "Priority support",
        "Audit logs",
        "Rule Engine + compose email",
        "Intranet deployment available — talk to sales"
      ],
      modules: [
        "dashboard",
        "crm",
        "sales",
        "purchases",
        "inventory",
        "hrm",
        "documents",
        "finance",
        "reports",
        "settings"
      ],
      max_users: 50,
      monthly_price_cents: 9900,
      yearly_price_cents: 99000,
      currency: "usd",
      highlighted: true,
      is_active: true,
      sort_order: 2,
      updated_at: ts
    },
    {
      id: "pkg-platinum",
      code: "platinum",
      name: "Platinum",
      badge: "Scale",
      tagline: "Projects, operations, healthcare, and BI",
      description: "Full module suite with projects, plant operations, hospital HMS, and advanced reporting for multi-team companies.",
      features: [
        "Up to 200 users",
        "Everything in Gold",
        "Modules: Projects, Operations, Healthcare HMS",
        "Projects: tasks, milestones, budgets",
        "Operations: BOM, work orders, maintenance",
        "Healthcare: patients, OPD, pharmacy, lab",
        "Custom reports & BI snapshots",
        "SSO-ready architecture",
        "Dedicated onboarding",
        "Rule Engine on every module",
        "Intranet deployment available — talk to sales"
      ],
      modules: [
        "dashboard",
        "crm",
        "sales",
        "purchases",
        "inventory",
        "hrm",
        "documents",
        "finance",
        "projects",
        "operations",
        "healthcare",
        "reports",
        "settings"
      ],
      max_users: 200,
      monthly_price_cents: 19900,
      yearly_price_cents: 199000,
      currency: "usd",
      highlighted: false,
      is_active: true,
      sort_order: 3,
      updated_at: ts
    },
    {
      id: "pkg-professional",
      code: "professional",
      name: "Professional",
      badge: "Dedicated",
      tagline: "Dedicated cloud, VPS, self-hosted, or intranet — your call",
      description:
        "Isolated infrastructure deployed where you want it: our dedicated cloud, a VPS of your choice, your own hosting company under a commercial license, or a fully offline intranet. Separate database, your domain and white-label name, and instance Super Admin on that stack.",
      features: [
        "Unlimited users",
        "All modules: Dashboard, CRM, Sales, Purchases, Inventory, Operations, HRM, Healthcare, Documents, Finance, Projects, Reports, Administration",
        "Separate database (not shared multi-tenant)",
        "Deploy on dedicated cloud, your VPS, or your hosting company",
        "Licensed self-hosting with guided install & upgrades",
        "Fully offline intranet / on-premise option",
        "Your domain + white-label product name",
        "Custom SLA and success manager — talk to sales",
        "Rule Engine + full event catalog on your stack"
      ],
      modules: [
        "dashboard",
        "crm",
        "sales",
        "purchases",
        "inventory",
        "hrm",
        "documents",
        "finance",
        "projects",
        "operations",
        "healthcare",
        "reports",
        "settings"
      ],
      max_users: 0,
      monthly_price_cents: 39900,
      yearly_price_cents: 399000,
      currency: "usd",
      highlighted: false,
      is_active: true,
      sort_order: 4,
      updated_at: ts
    }
  ];
}

function loadPackages(): SubscriptionPackage[] {
  const stored = loadPersisted<SubscriptionPackage[]>(PACKAGES_KEY);
  if (!stored?.length) {
    const seeded = defaultPackages();
    savePersisted(PACKAGES_KEY, seeded);
    return seeded;
  }
  if (typeof window !== "undefined" && !loadPersisted<string>(PACKAGES_CATALOG_PATCH)) {
    const seeded = defaultPackages();
    const next = stored.map((row) => {
      const seed = seeded.find((s) => s.code === row.code);
      if (!seed) return row;
      const modules = [...new Set([...row.modules, ...seed.modules])];
      return { ...row, modules, tagline: seed.tagline, description: seed.description, features: seed.features };
    });
    savePersisted(PACKAGES_KEY, next);
    savePersisted(PACKAGES_CATALOG_PATCH, "1");
    return next;
  }
  return stored;
}

function savePackages(rows: SubscriptionPackage[]) {
  savePersisted(PACKAGES_KEY, rows);
}

function loadSubs(): TenantSubscription[] {
  return loadPersisted<TenantSubscription[]>(SUBS_KEY) ?? [];
}

function saveSubs(rows: TenantSubscription[]) {
  savePersisted(SUBS_KEY, rows);
}

/** Deterministic seed catalog — safe for SSR + first client render (no localStorage read). */
export function listSeedPackages(opts?: { activeOnly?: boolean }) {
  let rows = defaultPackages().sort((a, b) => a.sort_order - b.sort_order);
  if (opts?.activeOnly) rows = rows.filter((p) => p.is_active);
  return rows;
}

export function listPackages(opts?: { activeOnly?: boolean }) {
  let rows = loadPackages().sort((a, b) => a.sort_order - b.sort_order);
  if (opts?.activeOnly) rows = rows.filter((p) => p.is_active);
  return rows;
}

export function getPackage(id: string) {
  return loadPackages().find((p) => p.id === id) ?? null;
}

export function getPackageByCode(code: PlanTier) {
  return loadPackages().find((p) => p.code === code) ?? null;
}

export function upsertPackage(input: Partial<SubscriptionPackage> & { id?: string; code: PlanTier; name: string }) {
  const rows = loadPackages();
  const existing = input.id ? rows.find((r) => r.id === input.id) : null;
  const next: SubscriptionPackage = {
    id: existing?.id ?? input.id ?? crypto.randomUUID(),
    code: input.code,
    name: input.name,
    badge: input.badge ?? existing?.badge ?? input.code,
    tagline: input.tagline ?? existing?.tagline ?? "",
    description: input.description ?? existing?.description ?? "",
    features: input.features ?? existing?.features ?? [],
    modules: input.modules ?? existing?.modules ?? ["dashboard"],
    max_users: input.max_users ?? existing?.max_users ?? 10,
    monthly_price_cents: input.monthly_price_cents ?? existing?.monthly_price_cents ?? 0,
    yearly_price_cents: input.yearly_price_cents ?? existing?.yearly_price_cents ?? 0,
    currency: input.currency ?? existing?.currency ?? "usd",
    stripe_product_id: input.stripe_product_id ?? existing?.stripe_product_id ?? null,
    stripe_price_monthly_id: input.stripe_price_monthly_id ?? existing?.stripe_price_monthly_id ?? null,
    stripe_price_yearly_id: input.stripe_price_yearly_id ?? existing?.stripe_price_yearly_id ?? null,
    highlighted: input.highlighted ?? existing?.highlighted ?? false,
    is_active: input.is_active ?? existing?.is_active ?? true,
    sort_order: input.sort_order ?? existing?.sort_order ?? 99,
    updated_at: now()
  };
  const filtered = rows.filter((r) => r.id !== next.id);
  filtered.push(next);
  savePackages(filtered);
  return next;
}

export function deletePackage(id: string) {
  savePackages(loadPackages().filter((p) => p.id !== id));
}

export function resetDefaultPackages() {
  const seeded = defaultPackages();
  savePackages(seeded);
  return seeded;
}

export function listTenantSubscriptions(tenantId?: string) {
  const rows = loadSubs().sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  return tenantId ? rows.filter((r) => r.tenant_id === tenantId) : rows;
}

export function getActiveSubscription(tenantId: string) {
  return (
    listTenantSubscriptions(tenantId).find((s) => s.status === "active" || s.status === "trialing") ?? null
  );
}

export function getSubscription(id: string) {
  return loadSubs().find((s) => s.id === id) ?? null;
}

export function priceFor(pkg: SubscriptionPackage, interval: BillingInterval) {
  return interval === "year" ? pkg.yearly_price_cents : pkg.monthly_price_cents;
}

export function formatMoney(cents: number, currency = "usd") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(0)}`;
  }
}

export function upsertTenantSubscription(
  input: Partial<TenantSubscription> & {
    tenant_id: string;
    package_id: string;
    package_code: PlanTier;
    interval: BillingInterval;
    billing_email: string;
    company_name: string;
    amount_cents: number;
  }
) {
  const rows = loadSubs();
  const existing =
    (input.id ? rows.find((r) => r.id === input.id) : null) ??
    rows.find((r) => r.tenant_id === input.tenant_id && (r.status === "incomplete" || r.status === "active"));

  const next: TenantSubscription = {
    id: existing?.id ?? input.id ?? crypto.randomUUID(),
    tenant_id: input.tenant_id,
    company_name: input.company_name,
    package_id: input.package_id,
    package_code: input.package_code,
    interval: input.interval,
    status: input.status ?? existing?.status ?? "incomplete",
    amount_cents: input.amount_cents,
    currency: input.currency ?? existing?.currency ?? "usd",
    stripe_customer_id: input.stripe_customer_id ?? existing?.stripe_customer_id ?? null,
    stripe_subscription_id: input.stripe_subscription_id ?? existing?.stripe_subscription_id ?? null,
    stripe_payment_intent_id: input.stripe_payment_intent_id ?? existing?.stripe_payment_intent_id ?? null,
    current_period_end: input.current_period_end ?? existing?.current_period_end ?? null,
    activated_at: input.activated_at ?? existing?.activated_at ?? null,
    canceled_at: input.canceled_at ?? existing?.canceled_at ?? null,
    billing_email: input.billing_email,
    created_at: existing?.created_at ?? now(),
    updated_at: now()
  };

  const filtered = rows.filter((r) => r.id !== next.id);
  filtered.unshift(next);
  saveSubs(filtered);
  return next;
}

export function activateSubscription(id: string, extras?: Partial<TenantSubscription>) {
  const row = getSubscription(id);
  if (!row) return null;
  const activated = upsertTenantSubscription({
    ...row,
    ...extras,
    status: "active",
    activated_at: now(),
    current_period_end:
      extras?.current_period_end ??
      new Date(Date.now() + (row.interval === "year" ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString()
  });
  if (activated) {
    recordLocalInvoice({
      tenant_id: activated.tenant_id,
      subscription_id: activated.id,
      package_code: activated.package_code,
      amount_cents: activated.amount_cents,
      currency: activated.currency,
      interval: activated.interval,
      billing_email: activated.billing_email,
      company_name: activated.company_name,
      stripe_invoice_id: null,
      stripe_hosted_invoice_url: null,
      status: "paid",
      period_start: activated.activated_at ?? now(),
      period_end: activated.current_period_end ?? null,
      paid_at: now()
    });
    if (typeof window !== "undefined" && activated.billing_email) {
      void import("@/lib/notifications/automate").then(({ automateSubscriptionActivated }) => {
        automateSubscriptionActivated({
          email: activated.billing_email,
          name: activated.company_name,
          tenantId: activated.tenant_id,
          packageCode: activated.package_code,
          amountLabel: formatMoney(activated.amount_cents, activated.currency),
          interval: activated.interval
        });
      });
    }
  }
  return activated;
}

export type SubscriptionInvoice = {
  id: string;
  tenant_id: string;
  subscription_id: string;
  invoice_number: string;
  package_code: PlanTier;
  amount_cents: number;
  currency: string;
  interval: BillingInterval;
  status: "paid" | "open" | "void" | "uncollectible" | "draft";
  billing_email: string;
  company_name: string;
  stripe_invoice_id?: string | null;
  stripe_hosted_invoice_url?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  paid_at?: string | null;
  created_at: string;
};

const INVOICES_KEY = "businesssuite:subscription-invoices:v1";

function loadInvoices(): SubscriptionInvoice[] {
  return loadPersisted<SubscriptionInvoice[]>(INVOICES_KEY) ?? [];
}

function saveInvoices(rows: SubscriptionInvoice[]) {
  savePersisted(INVOICES_KEY, rows.slice(0, 2000));
}

export function recordLocalInvoice(
  input: Omit<SubscriptionInvoice, "id" | "invoice_number" | "created_at"> & {
    id?: string;
    invoice_number?: string;
  }
) {
  const rows = loadInvoices();
  // Avoid duplicate for same subscription activation burst
  if (
    input.subscription_id &&
    rows.some(
      (r) =>
        r.subscription_id === input.subscription_id &&
        r.status === "paid" &&
        Math.abs(new Date(r.created_at).getTime() - Date.now()) < 15_000
    )
  ) {
    return rows[0];
  }
  const seq = rows.filter((r) => r.tenant_id === input.tenant_id).length + 1;
  const invoice: SubscriptionInvoice = {
    id: input.id ?? crypto.randomUUID(),
    tenant_id: input.tenant_id,
    subscription_id: input.subscription_id,
    invoice_number: input.invoice_number ?? `SUB-${String(seq).padStart(4, "0")}`,
    package_code: input.package_code,
    amount_cents: input.amount_cents,
    currency: input.currency,
    interval: input.interval,
    status: input.status,
    billing_email: input.billing_email,
    company_name: input.company_name,
    stripe_invoice_id: input.stripe_invoice_id ?? null,
    stripe_hosted_invoice_url: input.stripe_hosted_invoice_url ?? null,
    period_start: input.period_start ?? null,
    period_end: input.period_end ?? null,
    paid_at: input.paid_at ?? null,
    created_at: now()
  };
  rows.unshift(invoice);
  saveInvoices(rows);
  return invoice;
}

export function listLocalInvoices(tenantId: string) {
  return loadInvoices()
    .filter((r) => r.tenant_id === tenantId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function nextPaymentLabel(sub: TenantSubscription | null) {
  if (!sub?.current_period_end) return "—";
  const end = new Date(sub.current_period_end);
  if (Number.isNaN(end.getTime())) return "—";
  return end.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

export function daysUntilNextPayment(sub: TenantSubscription | null) {
  if (!sub?.current_period_end) return null;
  const end = new Date(sub.current_period_end).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
}

export function markSubscriptionStatus(id: string, status: SubscriptionStatus) {
  const row = getSubscription(id);
  if (!row) return null;
  return upsertTenantSubscription({
    ...row,
    status,
    canceled_at: status === "canceled" ? now() : row.canceled_at
  });
}

/** Seeded demo companies stay open; new companies must pay via Stripe Elements. */
export function isTenantActivated(tenantId: string) {
  if (DEMO_TENANT_IDS.has(tenantId)) return true;
  return Boolean(getActiveSubscription(tenantId));
}

export function requiresSubscriptionPayment(tenantId: string) {
  return !isTenantActivated(tenantId);
}

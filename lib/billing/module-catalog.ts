import type { ModuleKey } from "@/lib/permissions";

/** Business modules billed as pay-per apps (Administration included at no add-on cost). */
export type BillableModule = {
  key: ModuleKey;
  label: string;
  tagline: string;
  /** Product marketing page slug when available. */
  productSlug?: string;
  /** Suggested add-on when not in base package (USD cents / month). */
  addon_monthly_cents: number;
};

/** Platform apps — cross-cutting engines sold separately from business modules. */
export type PlatformAppId = "email_engine" | "rule_engine";

export type PlatformApp = {
  id: PlatformAppId;
  label: string;
  tagline: string;
  productSlug: string;
  monthly_cents: number;
  /** Other platform apps automatically included when this app is licensed. */
  dependsOn: PlatformAppId[];
  features: string[];
};

/** 13 business modules + 2 platform apps = 15 pay-per apps. */
export const BUSINESS_APP_COUNT = 13;
export const PLATFORM_APP_COUNT = 2;
export const TOTAL_PAYABLE_APP_COUNT = BUSINESS_APP_COUNT + PLATFORM_APP_COUNT;

export const BILLABLE_MODULES: BillableModule[] = [
  { key: "dashboard", label: "Dashboard", tagline: "Executive home & KPIs", addon_monthly_cents: 0 },
  { key: "crm", label: "CRM", tagline: "Leads, customers, pipeline", productSlug: "crm", addon_monthly_cents: 1500 },
  { key: "sales", label: "Sales", tagline: "Quotes, orders, invoicing", productSlug: "sales", addon_monthly_cents: 2000 },
  { key: "purchases", label: "Procurement", tagline: "PO, GRN, vendor bills", productSlug: "purchases", addon_monthly_cents: 1800 },
  { key: "inventory", label: "Inventory", tagline: "Stock, warehouses, transfers", productSlug: "inventory", addon_monthly_cents: 1500 },
  { key: "operations", label: "Operations", tagline: "BOM, work orders, maintenance", productSlug: "operations", addon_monthly_cents: 2500 },
  { key: "hrm", label: "HRM & Payroll", tagline: "Employees, leave, payroll", productSlug: "hrm", addon_monthly_cents: 2200 },
  { key: "healthcare", label: "Healthcare HMS", tagline: "Patients, OPD, pharmacy", productSlug: "healthcare", addon_monthly_cents: 3500 },
  { key: "documents", label: "Documents", tagline: "Files, compliance uploads", productSlug: "documents", addon_monthly_cents: 800 },
  { key: "finance", label: "Finance", tagline: "GL, banks, journals", productSlug: "finance", addon_monthly_cents: 2000 },
  { key: "projects", label: "Projects", tagline: "Tasks, timesheets, budgets", productSlug: "projects", addon_monthly_cents: 1200 },
  { key: "reports", label: "Data Warehouse / BI", tagline: "Analytics & snapshots", productSlug: "reports", addon_monthly_cents: 1000 },
  {
    key: "settings",
    label: "Administration",
    tagline: "Users, billing, access control",
    productSlug: "administration",
    addon_monthly_cents: 0
  }
];

export const PLATFORM_APPS: PlatformApp[] = [
  {
    id: "email_engine",
    label: "Email Engine",
    tagline: "Compose, send, and branded HTML templates",
    productSlug: "email-engine",
    monthly_cents: 900,
    dependsOn: [],
    features: [
      "Gmail-style compose in every module",
      "Template library with picture / branded layouts",
      "Write HTML templates as source code",
      "Custom To/CC and merge fields",
      "Attachments and tenant sender profiles"
    ]
  },
  {
    id: "rule_engine",
    label: "Rule Engine",
    tagline: "When→then automations, schedules, alerts",
    productSlug: "rule-engine",
    monthly_cents: 2900,
    dependsOn: ["email_engine"],
    features: [
      "Per-module and company-wide rule consoles",
      "Send email actions using Email Engine templates",
      "In-app bell, tasks, and approval chains",
      "Schedules and full event log"
    ]
  }
];

/** @deprecated Use PLATFORM_APPS */
export const PLATFORM_ADDONS = PLATFORM_APPS.map((a) => ({
  id: a.id,
  label: a.label,
  tagline: a.tagline,
  monthly_cents: a.monthly_cents
}));

export function moduleLabel(key: ModuleKey) {
  return BILLABLE_MODULES.find((m) => m.key === key)?.label ?? key;
}

export function platformAppLabel(id: PlatformAppId) {
  return PLATFORM_APPS.find((a) => a.id === id)?.label ?? id;
}

export function getPlatformApp(id: PlatformAppId) {
  return PLATFORM_APPS.find((a) => a.id === id) ?? null;
}

/** Resolve platform app selection with dependency closure (Rule Engine → Email Engine). */
export function resolvePlatformApps(selected: PlatformAppId[]): PlatformAppId[] {
  const out = new Set<PlatformAppId>(selected);
  let changed = true;
  while (changed) {
    changed = false;
    for (const app of PLATFORM_APPS) {
      if (!out.has(app.id)) continue;
      for (const dep of app.dependsOn) {
        if (!out.has(dep)) {
          out.add(dep);
          changed = true;
        }
      }
    }
  }
  return PLATFORM_APPS.map((a) => a.id).filter((id) => out.has(id));
}

export function estimateAddonMonthlyCents(selected: ModuleKey[], includedInPackage: ModuleKey[]) {
  const included = new Set(includedInPackage);
  return BILLABLE_MODULES.filter((m) => selected.includes(m.key) && !included.has(m.key)).reduce(
    (sum, m) => sum + m.addon_monthly_cents,
    0
  );
}

export function estimatePlatformAppsMonthlyCents(platformApps: PlatformAppId[]) {
  const resolved = resolvePlatformApps(platformApps);
  return PLATFORM_APPS.filter((a) => resolved.includes(a.id)).reduce((sum, a) => sum + a.monthly_cents, 0);
}

export function estimateTotalAddonMonthlyCents(
  selectedModules: ModuleKey[],
  includedInPackage: ModuleKey[],
  platformApps: PlatformAppId[]
) {
  return estimateAddonMonthlyCents(selectedModules, includedInPackage) + estimatePlatformAppsMonthlyCents(platformApps);
}

/** Menu ids that require a licensed platform app. */
export function menuRequiresPlatformApp(menuId: string): PlatformAppId | null {
  if (menuId.endsWith(".compose_email") || menuId === "settings.email_templates") return "email_engine";
  if (menuId.endsWith(".rule_engine") || menuId === "settings.rule_engine") return "rule_engine";
  return null;
}

export const MEGA_MENU_SECTIONS = [
  {
    title: "Business apps",
    items: BILLABLE_MODULES.filter((m) => m.key !== "settings").map((m) => ({
      label: m.label,
      href: m.productSlug ? `/product/${m.productSlug}` : "/#modules",
      tagline: m.tagline
    }))
  },
  {
    title: "Platform apps",
    items: PLATFORM_APPS.map((a) => ({
      label: a.label,
      href: `/product/${a.productSlug}`,
      tagline: a.tagline
    }))
  },
  {
    title: "Administration",
    items: [
      {
        label: "Administration",
        href: "/product/administration",
        tagline: "Users, roles, billing, access control"
      }
    ]
  }
] as const;

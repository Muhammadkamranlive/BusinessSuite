import {
  menuRequiresPlatformApp,
  resolvePlatformApps,
  type PlatformAppId
} from "@/lib/billing/module-catalog";
import type { ModuleKey } from "@/lib/permissions";
import { tenants as seedTenants } from "@/lib/demo-data";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";
import {
  getActiveSubscription,
  getPackage,
  type PlanTier
} from "@/modules/billing/services/subscriptions.store";

const TENANT_APPS_KEY = "businesssuite:tenant-app-licenses:v1";
const DEMO_TENANT_IDS = new Set(seedTenants.map((t) => t.id));

const ALL_MODULES: ModuleKey[] = [
  "dashboard",
  "crm",
  "sales",
  "purchases",
  "inventory",
  "operations",
  "hrm",
  "healthcare",
  "documents",
  "finance",
  "projects",
  "reports",
  "settings"
];

export type TenantAppLicense = {
  tenant_id: string;
  subscription_id?: string | null;
  package_code?: PlanTier;
  modules: ModuleKey[];
  platform_apps: PlatformAppId[];
  addon_monthly_cents: number;
  updated_at: string;
};

function now() {
  return new Date().toISOString();
}

function loadLicenses(): TenantAppLicense[] {
  return loadPersisted<TenantAppLicense[]>(TENANT_APPS_KEY) ?? [];
}

function saveLicenses(rows: TenantAppLicense[]) {
  savePersisted(TENANT_APPS_KEY, rows);
}

export function getTenantAppLicense(tenantId: string): TenantAppLicense | null {
  return loadLicenses().find((r) => r.tenant_id === tenantId) ?? null;
}

export function saveTenantAppLicense(input: Omit<TenantAppLicense, "updated_at">) {
  const rows = loadLicenses().filter((r) => r.tenant_id !== input.tenant_id);
  const next: TenantAppLicense = {
    ...input,
    platform_apps: resolvePlatformApps(input.platform_apps),
    updated_at: now()
  };
  rows.unshift(next);
  saveLicenses(rows);
  return next;
}

function defaultPlatformAppsForTier(code: PlanTier): PlatformAppId[] {
  if (code === "silver") return [];
  if (code === "gold") return ["email_engine"];
  return ["email_engine", "rule_engine"];
}

function licenseFromActiveSubscription(tenantId: string): TenantAppLicense | null {
  const sub = getActiveSubscription(tenantId);
  if (!sub) return null;
  const pkg = getPackage(sub.package_id);
  if (!pkg) return null;
  return {
    tenant_id: tenantId,
    subscription_id: sub.id,
    package_code: sub.package_code,
    modules: pkg.modules,
    platform_apps: defaultPlatformAppsForTier(sub.package_code),
    addon_monthly_cents: 0,
    updated_at: sub.updated_at
  };
}

export function getLicensedModulesForTenant(tenantId: string): ModuleKey[] {
  if (DEMO_TENANT_IDS.has(tenantId)) return ALL_MODULES;
  const saved = getTenantAppLicense(tenantId);
  if (saved) return saved.modules;
  const fromSub = licenseFromActiveSubscription(tenantId);
  return fromSub?.modules ?? ["dashboard", "settings"];
}

export function getLicensedPlatformAppsForTenant(tenantId: string): PlatformAppId[] {
  if (DEMO_TENANT_IDS.has(tenantId)) return ["email_engine", "rule_engine"];
  const saved = getTenantAppLicense(tenantId);
  if (saved) return resolvePlatformApps(saved.platform_apps);
  const fromSub = licenseFromActiveSubscription(tenantId);
  return resolvePlatformApps(fromSub?.platform_apps ?? []);
}

export function tenantHasModule(tenantId: string | undefined, module: ModuleKey) {
  if (!tenantId) return true;
  return getLicensedModulesForTenant(tenantId).includes(module);
}

export function tenantHasPlatformApp(tenantId: string | undefined, appId: PlatformAppId) {
  if (!tenantId) return true;
  return getLicensedPlatformAppsForTenant(tenantId).includes(appId);
}

export function tenantHasMenuApp(tenantId: string | undefined, menuId: string) {
  const platformApp = menuRequiresPlatformApp(menuId);
  if (!platformApp) return true;
  return tenantHasPlatformApp(tenantId, platformApp);
}

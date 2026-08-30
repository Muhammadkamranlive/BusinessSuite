import {
  estimateTotalAddonMonthlyCents,
  resolvePlatformApps,
  type PlatformAppId
} from "@/lib/billing/module-catalog";
import type { ModuleKey } from "@/lib/permissions";
import { getPackageByCode, type PlanTier } from "@/modules/billing/services/subscriptions.store";

export const SIGNUP_APPS_KEY = "businesssuite:signup-app-selection:v1";

export type SignupAppSelection = {
  tier: PlanTier;
  modules: ModuleKey[];
  platform_apps: PlatformAppId[];
  addon_monthly_cents: number;
};

export function buildSignupSelection(input: {
  tier: PlanTier;
  extraModules?: ModuleKey[];
  platformApps?: PlatformAppId[];
}): SignupAppSelection {
  const pkg = getPackageByCode(input.tier);
  const included = pkg?.modules ?? ["dashboard"];
  const modules = [...new Set([...included, ...(input.extraModules ?? [])])] as ModuleKey[];
  const platform_apps = resolvePlatformApps(input.platformApps ?? []);
  const addon_monthly_cents = estimateTotalAddonMonthlyCents(modules, included, platform_apps);
  return { tier: input.tier, modules, platform_apps, addon_monthly_cents };
}

export function buildSignupSelectionFromSearchParams(params: URLSearchParams): SignupAppSelection | null {
  const tier = params.get("plan") as PlanTier | null;
  if (!tier) return null;
  const pkg = getPackageByCode(tier);
  if (!pkg) return null;

  const extraModules = (params.get("addons") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as ModuleKey[];

  const platformApps: PlatformAppId[] = [];
  if (params.get("email_engine") === "1") platformApps.push("email_engine");
  if (params.get("rule_engine") === "1") platformApps.push("rule_engine");

  return buildSignupSelection({ tier, extraModules, platformApps });
}

export function persistSignupAppSelection(selection: SignupAppSelection) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SIGNUP_APPS_KEY, JSON.stringify(selection));
}

export function readSignupAppSelection(): SignupAppSelection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SIGNUP_APPS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SignupAppSelection;
    if (!parsed?.tier || !Array.isArray(parsed.modules)) return null;
    parsed.platform_apps = resolvePlatformApps(parsed.platform_apps ?? []);
    return parsed;
  } catch {
    return null;
  }
}

export function clearSignupAppSelection() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SIGNUP_APPS_KEY);
}

export function signupUrlForSelection(selection: SignupAppSelection) {
  const pkg = getPackageByCode(selection.tier);
  const included = new Set(pkg?.modules ?? []);
  const extra = selection.modules.filter((m) => !included.has(m));
  const params = new URLSearchParams({ plan: selection.tier });
  if (extra.length) params.set("addons", extra.join(","));
  if (selection.platform_apps.includes("email_engine")) params.set("email_engine", "1");
  if (selection.platform_apps.includes("rule_engine")) params.set("rule_engine", "1");
  return `/signup?${params.toString()}`;
}

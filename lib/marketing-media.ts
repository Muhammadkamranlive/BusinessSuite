/**
 * Landing / marketing images.
 * Code defaults live here; Super Admin overrides via /api/landing-media (Postgres + config file).
 */

const P = "/PublicImages";

/** Stable slot keys Super Admin can edit */
export type LandingMediaSlot =
  | "hero.dashboard"
  | "testimonials.photo"
  | "ruleEngine.showcase"
  | "module.crm"
  | "module.sales"
  | "module.purchases"
  | "module.inventory"
  | "module.operations"
  | "module.hrm"
  | "module.healthcare"
  | "module.finance"
  | "module.documents"
  | "module.projects"
  | "module.reports"
  | "module.administration"
  | "module.email-engine"
  | "module.rule-engine"
  | "photo.office"
  | "photo.support"
  | "photo.dashboard"
  | "photo.warehouse"
  | "photo.collaboration"
  | "photo.finance"
  | "photo.meeting"
  | "shot.executiveFlow"
  | "shot.crmWorkflow"
  | "shot.composeEmail"
  | "shot.bi"
  | "shot.dataWarehouse"
  | "shot.salesReports"
  | "shot.crmLeads"
  | "shot.crmCustomers"
  | "shot.crmPipeline";

export type LandingMediaMap = Record<LandingMediaSlot, string>;

export type LandingMediaSlotMeta = {
  key: LandingMediaSlot;
  label: string;
  group: string;
  hint: string;
};

export const LANDING_MEDIA_SLOTS: LandingMediaSlotMeta[] = [
  { key: "hero.dashboard", label: "Hero dashboard", group: "Landing page", hint: "Main image next to the homepage headline" },
  { key: "testimonials.photo", label: "Testimonials photo", group: "Landing page", hint: "Beside “Run by people who run companies”" },
  { key: "ruleEngine.showcase", label: "Rule Engine showcase", group: "Landing page", hint: "Laptop image in the Rule Engine section" },

  { key: "module.crm", label: "CRM module", group: "Module screenshots", hint: "Product / CRM laptop & cards" },
  { key: "module.sales", label: "Sales module", group: "Module screenshots", hint: "Product / Sales" },
  { key: "module.purchases", label: "Purchases module", group: "Module screenshots", hint: "Product / Procurement" },
  { key: "module.inventory", label: "Inventory module", group: "Module screenshots", hint: "Product / Inventory" },
  { key: "module.operations", label: "Operations module", group: "Module screenshots", hint: "Product / Operations" },
  { key: "module.hrm", label: "HRM module", group: "Module screenshots", hint: "Product / HRM" },
  { key: "module.healthcare", label: "Healthcare module", group: "Module screenshots", hint: "Product / Healthcare" },
  { key: "module.finance", label: "Finance module", group: "Module screenshots", hint: "Product / Finance" },
  { key: "module.documents", label: "Documents module", group: "Module screenshots", hint: "Product / Documents" },
  { key: "module.projects", label: "Projects module", group: "Module screenshots", hint: "Product / Projects" },
  { key: "module.reports", label: "BI / Reports module", group: "Module screenshots", hint: "Product / Data warehouse" },
  { key: "module.administration", label: "Administration module", group: "Module screenshots", hint: "Product / Administration" },
  { key: "module.email-engine", label: "Email Engine module", group: "Module screenshots", hint: "Product / Email Engine" },
  { key: "module.rule-engine", label: "Rule Engine module", group: "Module screenshots", hint: "Product / Rule Engine page" },

  { key: "photo.office", label: "Office / CMS photo", group: "Marketing pages", hint: "About / CMS side image" },
  { key: "photo.support", label: "Support / Contact hero", group: "Marketing pages", hint: "Contact page hero" },
  { key: "photo.dashboard", label: "Security hero", group: "Marketing pages", hint: "Security page hero" },
  { key: "photo.warehouse", label: "Warehouse photo", group: "Marketing pages", hint: "Legacy warehouse visual" },
  { key: "photo.collaboration", label: "Collaboration photo", group: "Marketing pages", hint: "Team / HR visual" },
  { key: "photo.finance", label: "Finance photo", group: "Marketing pages", hint: "Finance marketing visual" },
  { key: "photo.meeting", label: "Meeting photo", group: "Marketing pages", hint: "CRM meeting visual" },

  { key: "shot.executiveFlow", label: "Executive flow shot", group: "Extra screenshots", hint: "Flow diagram style shot" },
  { key: "shot.crmWorkflow", label: "CRM workflow shot", group: "Extra screenshots", hint: "CRM / automation workflow" },
  { key: "shot.composeEmail", label: "Compose email shot", group: "Extra screenshots", hint: "Email Engine compose" },
  { key: "shot.bi", label: "BI shot", group: "Extra screenshots", hint: "Business intelligence" },
  { key: "shot.dataWarehouse", label: "Data warehouse shot", group: "Extra screenshots", hint: "Warehouse / BI" },
  { key: "shot.salesReports", label: "Sales reports shot", group: "Extra screenshots", hint: "Sales analytics" },
  { key: "shot.crmLeads", label: "CRM leads shot", group: "Extra screenshots", hint: "Leads list" },
  { key: "shot.crmCustomers", label: "CRM customers shot", group: "Extra screenshots", hint: "Customers list" },
  { key: "shot.crmPipeline", label: "CRM pipeline shot", group: "Extra screenshots", hint: "Deal pipeline" }
];

export const defaultLandingMedia: LandingMediaMap = {
  "hero.dashboard": `${P}/ExectiveDashboard-Admin.png`,
  "testimonials.photo": `${P}/administration.png`,
  "ruleEngine.showcase": `${P}/CRM-WORK-Flow.png`,

  "module.crm": `${P}/CRM-Dashboard.png`,
  "module.sales": `${P}/SALES.png`,
  "module.purchases": "/marketing/purchase.png",
  "module.inventory": "/marketing/Erpinventroy.png",
  "module.operations": `${P}/OPRATIONS.png`,
  "module.hrm": `${P}/hrm.png`,
  "module.healthcare": `${P}/healthcare.png`,
  "module.finance": `${P}/finance.png`,
  "module.documents": "/marketing/documentamangement.png",
  "module.projects": `${P}/project.png`,
  "module.reports": `${P}/Datawherehouse.png`,
  "module.administration": `${P}/administration.png`,
  "module.email-engine": `${P}/Compose-Email.png`,
  "module.rule-engine": `${P}/Exective-Dashboard-Flow.png`,

  "photo.office": `${P}/administration.png`,
  "photo.support": `${P}/healthcare.png`,
  "photo.dashboard": `${P}/ExectiveDashboard-Admin.png`,
  "photo.warehouse": "/marketing/Erpinventroy.png",
  "photo.collaboration": `${P}/hrm.png`,
  "photo.finance": `${P}/finance.png`,
  "photo.meeting": `${P}/CRM-Dashboard.png`,

  "shot.executiveFlow": `${P}/Exective-Dashboard-Flow.png`,
  "shot.crmWorkflow": `${P}/CRM-WORK-Flow.png`,
  "shot.composeEmail": `${P}/Compose-Email.png`,
  "shot.bi": `${P}/BI.png`,
  "shot.dataWarehouse": `${P}/Datawherehouse.png`,
  "shot.salesReports": `${P}/SALESREPORTS.png`,
  "shot.crmLeads": `${P}/CRM-Leads.png`,
  "shot.crmCustomers": `${P}/CRM-Customer.png`,
  "shot.crmPipeline": `${P}/CRM-Deal-pipeline.png`
};

export function mergeLandingMedia(partial?: Partial<LandingMediaMap> | null): LandingMediaMap {
  const next = { ...defaultLandingMedia };
  if (!partial || typeof partial !== "object") return next;
  for (const slot of LANDING_MEDIA_SLOTS) {
    const value = partial[slot.key];
    if (typeof value === "string" && value.trim()) next[slot.key] = value.trim();
  }
  return next;
}

let cachedMedia: LandingMediaMap | null = null;
const listeners = new Set<() => void>();

export function getCachedLandingMedia(): LandingMediaMap {
  return cachedMedia ?? { ...defaultLandingMedia };
}

export function setCachedLandingMedia(media: LandingMediaMap) {
  cachedMedia = mergeLandingMedia(media);
  listeners.forEach((fn) => fn());
}

export function subscribeLandingMedia(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function mediaUrl(slot: LandingMediaSlot, media?: LandingMediaMap): string {
  const map = media ?? getCachedLandingMedia();
  return map[slot] || defaultLandingMedia[slot];
}

export function screenshotForModule(slug: string, media?: LandingMediaMap): string {
  const key = `module.${slug}` as LandingMediaSlot;
  if (key in defaultLandingMedia) return mediaUrl(key, media);
  return mediaUrl("hero.dashboard", media);
}

/** @deprecated Prefer mediaUrl / useLandingMedia — kept for gradual migration */
export const erpScreenshots = {
  get executiveDashboard() {
    return mediaUrl("hero.dashboard");
  },
  get executiveFlow() {
    return mediaUrl("shot.executiveFlow");
  },
  get crmDashboard() {
    return mediaUrl("module.crm");
  },
  get crmLeads() {
    return mediaUrl("shot.crmLeads");
  },
  get crmCustomers() {
    return mediaUrl("shot.crmCustomers");
  },
  get crmPipeline() {
    return mediaUrl("shot.crmPipeline");
  },
  get crmOpportunitiesFlow() {
    return mediaUrl("shot.crmPipeline");
  },
  get crmWorkflow() {
    return mediaUrl("shot.crmWorkflow");
  },
  get composeEmail() {
    return mediaUrl("shot.composeEmail");
  },
  get bi() {
    return mediaUrl("shot.bi");
  },
  get dataWarehouse() {
    return mediaUrl("shot.dataWarehouse");
  },
  get operations() {
    return mediaUrl("module.operations");
  },
  get sales() {
    return mediaUrl("module.sales");
  },
  get salesReports() {
    return mediaUrl("shot.salesReports");
  },
  get administration() {
    return mediaUrl("module.administration");
  },
  get finance() {
    return mediaUrl("module.finance");
  },
  get healthcare() {
    return mediaUrl("module.healthcare");
  },
  get hrm() {
    return mediaUrl("module.hrm");
  },
  get projects() {
    return mediaUrl("module.projects");
  }
};

/** @deprecated Prefer screenshotForModule / mediaUrl */
export const moduleScreenshot: Record<string, string> = new Proxy(
  {} as Record<string, string>,
  {
    get(_target, slug: string) {
      return screenshotForModule(slug);
    }
  }
);

/** @deprecated Prefer mediaUrl with photo.* slots */
export const marketingPhotos = {
  get heroTeam() {
    return mediaUrl("hero.dashboard");
  },
  get dashboard() {
    return mediaUrl("photo.dashboard");
  },
  get warehouse() {
    return mediaUrl("photo.warehouse");
  },
  get collaboration() {
    return mediaUrl("photo.collaboration");
  },
  get finance() {
    return mediaUrl("photo.finance");
  },
  get office() {
    return mediaUrl("photo.office");
  },
  get meeting() {
    return mediaUrl("photo.meeting");
  },
  get city() {
    return mediaUrl("hero.dashboard");
  },
  get support() {
    return mediaUrl("photo.support");
  },
  get blogGrowth() {
    return mediaUrl("module.sales");
  },
  get blogSecurity() {
    return mediaUrl("module.administration");
  },
  get blogOps() {
    return mediaUrl("module.operations");
  }
};

export async function fetchLandingMedia(): Promise<LandingMediaMap> {
  try {
    const res = await fetch("/api/landing-media", { cache: "no-store" });
    if (!res.ok) return getCachedLandingMedia();
    const data = (await res.json()) as { media?: LandingMediaMap };
    const media = mergeLandingMedia(data.media);
    setCachedLandingMedia(media);
    return media;
  } catch {
    return getCachedLandingMedia();
  }
}

export async function saveLandingMedia(media: LandingMediaMap): Promise<LandingMediaMap> {
  const res = await fetch("/api/landing-media", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(media)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Failed to save landing images");
  }
  const data = (await res.json()) as { media: LandingMediaMap };
  const merged = mergeLandingMedia(data.media);
  setCachedLandingMedia(merged);
  return merged;
}

export async function resetLandingMedia(): Promise<LandingMediaMap> {
  const res = await fetch("/api/landing-media", { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Failed to reset landing images");
  }
  const data = (await res.json()) as { media: LandingMediaMap };
  const merged = mergeLandingMedia(data.media);
  setCachedLandingMedia(merged);
  return merged;
}

export async function uploadLandingMediaImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/landing-media/upload", { method: "POST", body });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Upload failed");
  }
  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error("Upload returned no URL");
  return data.url;
}

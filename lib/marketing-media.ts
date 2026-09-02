/**
 * ERP product screenshots — served from /public/PublicImages (real app captures).
 * Legacy stock photos remain under /marketing/ where no module shot exists yet.
 */
const P = "/PublicImages";

export const erpScreenshots = {
  executiveDashboard: `${P}/ExectiveDashboard-Admin.png`,
  executiveFlow: `${P}/Exective-Dashboard-Flow.png`,
  crmDashboard: `${P}/CRM-Dashboard.png`,
  crmLeads: `${P}/CRM-Leads.png`,
  crmCustomers: `${P}/CRM-Customer.png`,
  crmPipeline: `${P}/CRM-Deal-pipeline.png`,
  crmOpportunitiesFlow: `${P}/CRM-opporunities-Flow.png`,
  crmWorkflow: `${P}/CRM-WORK-Flow.png`,
  composeEmail: `${P}/Compose-Email.png`,
  bi: `${P}/BI.png`,
  dataWarehouse: `${P}/Datawherehouse.png`,
  operations: `${P}/OPRATIONS.png`,
  sales: `${P}/SALES.png`,
  salesReports: `${P}/SALESREPORTS.png`,
  administration: `${P}/administration.png`,
  finance: `${P}/finance.png`,
  healthcare: `${P}/healthcare.png`,
  hrm: `${P}/hrm.png`,
  projects: `${P}/project.png`
} as const;

/** Primary hero / laptop image per product slug */
export const moduleScreenshot: Record<string, string> = {
  crm: erpScreenshots.crmDashboard,
  sales: erpScreenshots.sales,
  purchases: "/marketing/purchase.png",
  inventory: "/marketing/Erpinventroy.png",
  operations: erpScreenshots.operations,
  hrm: erpScreenshots.hrm,
  healthcare: erpScreenshots.healthcare,
  finance: erpScreenshots.finance,
  documents: "/marketing/documentamangement.png",
  projects: erpScreenshots.projects,
  reports: erpScreenshots.dataWarehouse,
  administration: erpScreenshots.administration,
  "email-engine": erpScreenshots.composeEmail,
  "rule-engine": erpScreenshots.executiveFlow
};

export function screenshotForModule(slug: string) {
  return moduleScreenshot[slug] ?? erpScreenshots.executiveDashboard;
}

/** @deprecated Use erpScreenshots / moduleScreenshot — kept for blog & misc */
export const marketingPhotos = {
  heroTeam: erpScreenshots.executiveDashboard,
  dashboard: erpScreenshots.executiveDashboard,
  warehouse: "/marketing/Erpinventroy.png",
  collaboration: erpScreenshots.hrm,
  finance: erpScreenshots.finance,
  office: erpScreenshots.administration,
  meeting: erpScreenshots.crmDashboard,
  city: erpScreenshots.executiveDashboard,
  support: erpScreenshots.healthcare,
  blogGrowth: erpScreenshots.sales,
  blogSecurity: erpScreenshots.administration,
  blogOps: erpScreenshots.operations
} as const;

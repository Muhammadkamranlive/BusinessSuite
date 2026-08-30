import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  FileSearch,
  Gauge,
  HeartPulse,
  Landmark,
  Network,
  Receipt,
  Settings,
  ShoppingCart,
  Users,
  Wrench
} from "lucide-react";

/** Role keys are parameterized: builtins plus tenant-created roles. */
export type RoleKey = string;
export type ModuleKey =
  | "dashboard"
  | "crm"
  | "sales"
  | "purchases"
  | "inventory"
  | "operations"
  | "hrm"
  | "healthcare"
  | "documents"
  | "finance"
  | "projects"
  | "reports"
  | "settings";

export type DemoUser = {
  email: string;
  name: string;
  role: RoleKey;
  title: string;
};

export type NavItem = {
  key: ModuleKey;
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavGroup = NavItem & {
  children: Array<{
    label: string;
    href: string;
    permission?: string;
    /** Optional sidebar/subnav section label (e.g. Employment, Pay & benefits) */
    group?: string;
  }>;
};

/** Seeded local logins. Never show these on the login page — see DEMO_CREDENTIALS.txt. */
export const demoUsers: DemoUser[] = [
  { email: "admin@demo.com", name: "Ayesha Khan", role: "super_admin", title: "Super Admin" },
  { email: "manager@demo.com", name: "Omar Farooq", role: "company_admin", title: "Company Admin" },
  { email: "hr@demo.com", name: "Sana Malik", role: "hr_manager", title: "HR Manager" },
  { email: "sales@demo.com", name: "Bilal Ahmed", role: "sales_manager", title: "Sales Manager" },
  { email: "warehouse@demo.com", name: "Nadia Raza", role: "warehouse_manager", title: "Warehouse Manager" },
  { email: "finance@demo.com", name: "Mariam Ali", role: "finance_manager", title: "Finance Manager" },
  { email: "viewer@demo.com", name: "Imran Shah", role: "viewer", title: "Read-only Viewer" },
  { email: "employee@demo.com", name: "Hassan Tariq", role: "employee", title: "Employee" }
];

export const defaultRoleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  company_admin: "Company Admin",
  hr_manager: "HR Manager",
  sales_manager: "Sales Manager",
  purchase_manager: "Purchase Manager",
  warehouse_manager: "Warehouse Manager",
  finance_manager: "Finance Manager",
  project_manager: "Project Manager",
  employee: "Employee",
  viewer: "Viewer"
};

/** Live catalog — mutated by `applyRoleCatalog` when roles are loaded or saved. */
export const roleLabels: Record<string, string> = { ...defaultRoleLabels };

export const SYSTEM_ROLE_KEYS = Object.keys(defaultRoleLabels);

export const defaultRoleDescriptions: Record<string, string> = {
  super_admin: "Full platform control across tenants, users, and menu rights.",
  company_admin: "Full access inside one company, including administration.",
  hr_manager: "HRM menus with employee, attendance, leave, and payroll focus.",
  sales_manager: "CRM and sales documents with analytics visibility.",
  purchase_manager: "Purchase and inventory visibility for procurement.",
  warehouse_manager: "Inventory operations and related purchase visibility.",
  finance_manager: "Finance, invoices, vendor bills, and reporting.",
  project_manager: "Projects, tasks, timesheets, and related reports.",
  employee: "Self-service: own timesheets, attendance, leave, tasks, and document uploads.",
  viewer: "Read-only dashboards and reports."
};

export const roleDescriptions: Record<string, string> = { ...defaultRoleDescriptions };

export const moduleLabels: Record<ModuleKey, string> = {
  dashboard: "Executive dashboard",
  crm: "CRM",
  sales: "Sales",
  purchases: "Purchases",
  inventory: "Inventory",
  operations: "Operations",
  hrm: "HRM",
  healthcare: "Healthcare",
  documents: "Document Management",
  finance: "Finance",
  projects: "Projects",
  reports: "Data Warehouse / BI",
  settings: "Administration"
};

export const rawNavGroups: NavGroup[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: Gauge, children: [
    { label: "Overview", href: "/dashboard", permission: "dashboard.overview.view" },
    { label: "My profile", href: "/profile", permission: "dashboard.profile.view" }
  ] },
  {
    key: "crm",
    label: "CRM",
    href: "/crm",
    icon: BriefcaseBusiness,
    children: [
      { label: "Leads", href: "/crm/leads", permission: "crm.leads.view" },
      { label: "Customers", href: "/crm/customers", permission: "crm.customers.view" },
      { label: "Contacts", href: "/crm/contacts", permission: "crm.contacts.view" },
      { label: "Opportunities", href: "/crm/deals", permission: "crm.deals.view" },
      { label: "Activities", href: "/crm/activities", permission: "crm.activities.view" },
      { label: "Open activities", href: "/crm/follow-ups", permission: "crm.activities.view" },
      { label: "Campaigns", href: "/crm/campaigns", permission: "crm.campaigns.view" },
      { label: "Tickets", href: "/crm/tickets", permission: "crm.tickets.view" },
      { label: "Customer segments", href: "/crm/groups", permission: "crm.customers.view" },
      { label: "CRM analytics", href: "/crm/reports", permission: "crm.reports.view" },
      { label: "Recycle bin", href: "/crm/recycle-bin", permission: "crm.recycle_bin.view" }
    ]
  },
  {
    key: "sales",
    label: "Sales",
    href: "/sales",
    icon: Receipt,
    children: [
      { label: "Quotations", href: "/sales/quotations", permission: "sales.quotations.view" },
      { label: "Sales Orders", href: "/sales/orders", permission: "sales.orders.view" },
      { label: "Delivery notes (dispatch)", href: "/sales/deliveries", permission: "sales.deliveries.view" },
      { label: "Invoices", href: "/sales/invoices", permission: "sales.invoices.view" },
      { label: "Credit notes", href: "/sales/credit-notes", permission: "sales.credit_notes.view" },
      { label: "Customer receipts", href: "/sales/payments", permission: "sales.payments.view" },
      { label: "Return authorizations (RMA)", href: "/sales/returns", permission: "sales.returns.view" },
      { label: "Price lists", href: "/sales/price-lists", permission: "sales.price_lists.view" },
      { label: "Sales representatives", href: "/sales/team", permission: "sales.team.view" },
      { label: "Sales analytics", href: "/sales/reports", permission: "sales.reports.view" },
      { label: "Recycle bin", href: "/sales/recycle-bin", permission: "sales.recycle_bin.view" }
    ]
  },
  {
    key: "purchases",
    label: "Procurement",
    href: "/purchases",
    icon: ShoppingCart,
    children: [
      { label: "Suppliers", href: "/purchases/suppliers", permission: "purchase.suppliers.view" },
      { label: "Purchase requisitions", href: "/purchases/requisitions", permission: "purchase.requisitions.view" },
      { label: "Request for quotation", href: "/purchases/rfq", permission: "purchase.rfq.view" },
      { label: "Purchase orders", href: "/purchases/orders", permission: "purchase.orders.view" },
      { label: "Goods receipt notes (GRN)", href: "/purchases/receipts", permission: "purchase.receipts.view" },
      { label: "Supplier invoices", href: "/purchases/bills", permission: "purchase.bills.view" },
      { label: "Supplier payments", href: "/purchases/payments", permission: "purchase.payments.view" },
      { label: "Debit notes", href: "/purchases/debit-notes", permission: "purchase.debit_notes.view" },
      { label: "Procurement analytics", href: "/purchases/reports", permission: "purchase.reports.view" },
      { label: "Recycle bin", href: "/purchases/recycle-bin", permission: "purchases.recycle_bin.view" }
    ]
  },
  {
    key: "inventory",
    label: "Inventory",
    href: "/inventory",
    icon: Boxes,
    children: [
      { label: "Products", href: "/inventory/products", permission: "inventory.products.view" },
      { label: "Categories", href: "/inventory/categories", permission: "inventory.categories.view" },
      { label: "Warehouses", href: "/inventory/warehouses", permission: "inventory.warehouses.view" },
      { label: "Stock Movements", href: "/inventory/movements", permission: "inventory.stock_movements.view" },
      { label: "Stock Transfers", href: "/inventory/transfers", permission: "inventory.transfers.view" },
      { label: "Stock Adjustments", href: "/inventory/adjustments", permission: "inventory.adjustments.view" },
      { label: "Low Stock Alerts", href: "/inventory/low-stock", permission: "inventory.low_stock.view" },
      { label: "Units of measure", href: "/inventory/uom", permission: "inventory.uom.view" },
      { label: "Batches / lots", href: "/inventory/batches", permission: "inventory.batches.view" },
      { label: "Serial numbers", href: "/inventory/serials", permission: "inventory.serials.view" },
      { label: "Bins / locations", href: "/inventory/bins", permission: "inventory.bins.view" },
      { label: "Brands", href: "/inventory/brands", permission: "inventory.brands.view" },
      { label: "Inventory Reports", href: "/inventory/reports", permission: "inventory.reports.view" },
      { label: "Recycle bin", href: "/inventory/recycle-bin", permission: "inventory.recycle_bin.view" }
    ]
  },
  {
    key: "operations",
    label: "Operations",
    href: "/operations",
    icon: Wrench,
    children: [
      { label: "Overview", href: "/operations", permission: "operations.overview.view", group: "Core" },
      { label: "Bills of materials", href: "/operations/bom", permission: "operations.bom.view", group: "Manufacturing" },
      { label: "Work orders", href: "/operations/work-orders", permission: "operations.work_orders.view", group: "Manufacturing" },
      { label: "Maintenance orders", href: "/operations/maintenance", permission: "operations.maintenance.view", group: "Maintenance" },
      { label: "Vehicles / fleet", href: "/operations/fleet", permission: "operations.fleet.view", group: "Maintenance" },
      { label: "Warranty claims", href: "/operations/warranties", permission: "operations.warranties.view", group: "Maintenance" },
      { label: "Quality inspections", href: "/operations/inspections", permission: "operations.inspections.view", group: "Quality" },
      { label: "Contracts", href: "/operations/contracts", permission: "operations.contracts.view", group: "Commercial" },
      { label: "Recycle bin", href: "/operations/recycle-bin", permission: "operations.recycle_bin.view", group: "Core" }
    ]
  },
  {
    key: "hrm",
    label: "HRM",
    href: "/hrm",
    icon: Users,
    children: [
      { label: "Overview", href: "/hrm", permission: "hrm.overview.view", group: "Core" },
      { label: "Organization", href: "/hrm/organization", permission: "hrm.organization.view", group: "Core" },
      { label: "Inbox", href: "/hrm/inbox", permission: "hrm.inbox.view", group: "Core" },
      { label: "Company", href: "/hrm/company", permission: "hrm.company.view", group: "Core" },
      { label: "HR Reports", href: "/hrm/reports", permission: "hrm.reports.view", group: "Core" },
      { label: "Employees", href: "/hrm/employees", permission: "hrm.employees.view", group: "Employment" },
      { label: "Locations", href: "/hrm/locations", permission: "hrm.locations.view", group: "Organization" },
      { label: "Cost Centers", href: "/hrm/cost-centers", permission: "hrm.cost_centers.view", group: "Organization" },
      { label: "Jobs", href: "/hrm/jobs", permission: "hrm.jobs.view", group: "Organization" },
      { label: "Positions", href: "/hrm/positions", permission: "hrm.positions.view", group: "Organization" },
      { label: "Job Changes", href: "/hrm/job-changes", permission: "hrm.job_changes.view", group: "Employment" },
      { label: "Requisitions", href: "/hrm/requisitions", permission: "hrm.requisitions.view", group: "Employment" },
      { label: "Recruitment", href: "/hrm/recruitment", permission: "hrm.recruitment.view", group: "Employment" },
      { label: "Departments", href: "/hrm/departments", permission: "hrm.departments.view", group: "Employment" },
      { label: "Designations", href: "/hrm/designations", permission: "hrm.designations.view", group: "Employment" },
      { label: "Disciplinary", href: "/hrm/disciplinary", permission: "hrm.disciplinary.view", group: "Employment" },
      { label: "Attendance", href: "/hrm/attendance", permission: "hrm.attendance.view", group: "Attendance" },
      { label: "Timesheets", href: "/hrm/timesheets", permission: "hrm.timesheets.view", group: "Attendance" },
      { label: "Leave Requests", href: "/hrm/leaves", permission: "hrm.leave.view", group: "Attendance" },
      { label: "Team", href: "/hrm/team", permission: "hrm.team.view", group: "Attendance" },
      { label: "Shifts", href: "/hrm/shifts", permission: "hrm.shifts.view", group: "Attendance" },
      { label: "Holidays", href: "/hrm/holidays", permission: "hrm.holidays.view", group: "Attendance" },
      { label: "Compensation", href: "/hrm/compensation", permission: "hrm.compensation.view", group: "Compensation" },
      { label: "Pay Grades", href: "/hrm/pay-grades", permission: "hrm.pay_grades.view", group: "Compensation" },
      { label: "Benefits", href: "/hrm/benefits", permission: "hrm.benefits.view", group: "Compensation" },
      { label: "My Pay", href: "/hrm/my-pay", permission: "hrm.my_pay.view", group: "Compensation" },
      { label: "Payroll", href: "/hrm/payroll", permission: "hrm.payroll.view", group: "Compensation" },
      { label: "Provident Fund", href: "/hrm/provident-fund", permission: "hrm.pf.view", group: "Compensation" },
      { label: "EOBI", href: "/hrm/eobi", permission: "hrm.eobi.view", group: "Compensation" },
      { label: "Employee loans & advances", href: "/hrm/loans", permission: "hrm.loans.view", group: "Compensation" },
      { label: "Salary disbursements", href: "/hrm/payments", permission: "hrm.payments.view", group: "Compensation" },
      { label: "Talent", href: "/hrm/talent", permission: "hrm.talent.view", group: "HR Ops" },
      { label: "Assets", href: "/hrm/assets", permission: "hrm.assets.view", group: "HR Ops" },
      { label: "Notifications", href: "/hrm/notifications", permission: "hrm.notifications.view", group: "HR Ops" },
      { label: "Custom forms", href: "/hrm/forms", permission: "hrm.custom_forms.view", group: "HR Ops" },
      { label: "My forms", href: "/hrm/my-forms", permission: "hrm.my_forms.view", group: "HR Ops" },
      { label: "Workflows", href: "/hrm/workflows", permission: "hrm.workflows.view", group: "HR Ops" },
      { label: "Security", href: "/hrm/security", permission: "hrm.security.view", group: "HR Ops" },
      { label: "Recycle bin", href: "/hrm/recycle-bin", permission: "hrm.recycle_bin.view", group: "HR Ops" }
    ]
  },
  {
    key: "healthcare",
    label: "Healthcare",
    href: "/healthcare",
    icon: HeartPulse,
    children: [
      { label: "Overview", href: "/healthcare", permission: "healthcare.overview.view", group: "Core" },
      { label: "Patients", href: "/healthcare/patients", permission: "healthcare.patients.view", group: "Front desk" },
      { label: "Doctors", href: "/healthcare/doctors", permission: "healthcare.doctors.view", group: "Front desk" },
      { label: "Appointments", href: "/healthcare/appointments", permission: "healthcare.appointments.view", group: "Front desk" },
      { label: "OPD visits", href: "/healthcare/opd", permission: "healthcare.opd.view", group: "Front desk" },
      { label: "Emergency / ED", href: "/healthcare/emergency", permission: "healthcare.emergency.view", group: "Front desk" },
      { label: "Wards", href: "/healthcare/wards", permission: "healthcare.wards.view", group: "IPD" },
      { label: "Beds", href: "/healthcare/beds", permission: "healthcare.beds.view", group: "IPD" },
      { label: "IPD admissions", href: "/healthcare/admissions", permission: "healthcare.admissions.view", group: "IPD" },
      { label: "Nursing notes", href: "/healthcare/nursing", permission: "healthcare.nursing.view", group: "IPD" },
      { label: "Vitals", href: "/healthcare/vitals", permission: "healthcare.vitals.view", group: "IPD" },
      { label: "Duty rosters", href: "/healthcare/rosters", permission: "healthcare.rosters.view", group: "IPD" },
      { label: "Prescriptions", href: "/healthcare/prescriptions", permission: "healthcare.prescriptions.view", group: "Clinical" },
      { label: "Diagnoses", href: "/healthcare/diagnoses", permission: "healthcare.diagnoses.view", group: "Clinical" },
      { label: "EMR notes", href: "/healthcare/emr", permission: "healthcare.emr.view", group: "Clinical" },
      { label: "Treatment plans", href: "/healthcare/treatment-plans", permission: "healthcare.treatment_plans.view", group: "Clinical" },
      { label: "Consents", href: "/healthcare/consents", permission: "healthcare.consents.view", group: "Clinical" },
      { label: "OT / surgeries", href: "/healthcare/ot", permission: "healthcare.ot.view", group: "Clinical" },
      { label: "Lab tests", href: "/healthcare/lab-tests", permission: "healthcare.lab_tests.view", group: "Diagnostics" },
      { label: "Lab orders", href: "/healthcare/lab-orders", permission: "healthcare.lab_orders.view", group: "Diagnostics" },
      { label: "Radiology orders", href: "/healthcare/radiology", permission: "healthcare.radiology.view", group: "Diagnostics" },
      { label: "Pharmacy items", href: "/healthcare/pharmacy", permission: "healthcare.pharmacy.view", group: "Pharmacy" },
      { label: "Dispensing", href: "/healthcare/dispensing", permission: "healthcare.dispensing.view", group: "Pharmacy" },
      { label: "Insurance policies", href: "/healthcare/insurance", permission: "healthcare.insurance.view", group: "Payer" },
      { label: "Insurance claims", href: "/healthcare/claims", permission: "healthcare.claims.view", group: "Payer" },
      { label: "Infection control", href: "/healthcare/infection", permission: "healthcare.infection.view", group: "Quality" },
      { label: "Quality / CQI", href: "/healthcare/quality", permission: "healthcare.quality.view", group: "Quality" },
      { label: "PHC audit checklist", href: "/healthcare/phc-audit", permission: "healthcare.phc_audit.view", group: "Quality" },
      { label: "CSSD logs", href: "/healthcare/cssd", permission: "healthcare.cssd.view", group: "Quality" },
      { label: "Biomedical equipment", href: "/healthcare/equipment", permission: "healthcare.equipment.view", group: "Quality" },
      { label: "Recycle bin", href: "/healthcare/recycle-bin", permission: "healthcare.recycle_bin.view", group: "Core" }
    ]
  },
  {
    key: "documents",
    label: "Documents",
    href: "/documents",
    icon: FileSearch,
    children: [
      { label: "Required uploads", href: "/documents", permission: "documents.required_uploads.view", group: "Workspace" },
      { label: "Library", href: "/documents/library", permission: "documents.library.view", group: "Workspace" },
      { label: "Assign to users", href: "/documents/assign", permission: "documents.assign_to_users.view", group: "Workspace" },
      { label: "Document types", href: "/documents/types", permission: "documents.document_types.view", group: "Setup" },
      { label: "Recycle bin", href: "/documents/bin", permission: "documents.recycle_bin.view", group: "Setup" }
    ]
  },
  {
    key: "finance",
    label: "Finance",
    href: "/finance",
    icon: Landmark,
    children: [
      { label: "Chart of Accounts", href: "/finance/accounts", permission: "finance.accounts.view", group: "Books" },
      { label: "Expenses", href: "/finance/expenses", permission: "finance.expenses.view", group: "Books" },
      { label: "Income", href: "/finance/income", permission: "finance.income.view", group: "Books" },
      { label: "Journal Entries", href: "/finance/journals", permission: "finance.journals.view", group: "Books" },
      { label: "Taxes", href: "/finance/taxes", permission: "finance.taxes.view", group: "Books" },
      { label: "Banks", href: "/finance/banks", permission: "finance.banks.view", group: "Banking" },
      { label: "Bank accounts", href: "/finance/bank-accounts", permission: "finance.bank_accounts.view", group: "Banking" },
      { label: "Cheques / PDC", href: "/finance/cheques", permission: "finance.cheques.view", group: "Banking" },
      { label: "Bank reconciliation", href: "/finance/reconciliation", permission: "finance.reconciliation.view", group: "Banking" },
      { label: "Fiscal years", href: "/finance/fiscal-years", permission: "finance.fiscal_years.view", group: "Setup" },
      { label: "Accounting periods", href: "/finance/periods", permission: "finance.periods.view", group: "Setup" },
      { label: "Budgets", href: "/finance/budgets", permission: "finance.budgets.view", group: "Setup" },
      { label: "Voucher types", href: "/finance/voucher-types", permission: "finance.voucher_types.view", group: "Setup" },
      { label: "Withholding certificates", href: "/finance/withholding", permission: "finance.withholding.view", group: "Setup" },
      { label: "Currencies", href: "/finance/currencies", permission: "finance.currencies.view", group: "Setup" },
      { label: "Payment terms", href: "/finance/payment-terms", permission: "finance.payment_terms.view", group: "Setup" },
      { label: "Finance partners", href: "/finance/partners", permission: "finance.partners.view", group: "Setup" },
      { label: "General ledger", href: "/finance/ledgers", permission: "finance.ledgers.view", group: "Statements" },
      { label: "Trial balance", href: "/finance/trial-balance", permission: "finance.trial_balance.view", group: "Statements" },
      { label: "Balance sheet", href: "/finance/balance-sheet", permission: "finance.balance_sheet.view", group: "Statements" },
      { label: "Cash flow", href: "/finance/cash-flow", permission: "finance.cash_flow.view", group: "Statements" },
      { label: "Profit & Loss", href: "/finance/profit-loss", permission: "finance.reports.view", group: "Statements" },
      { label: "Finance Reports", href: "/finance/reports", permission: "finance.reports.view", group: "Statements" },
      { label: "Recycle bin", href: "/finance/recycle-bin", permission: "finance.recycle_bin.view", group: "Books" }
    ]
  },
  {
    key: "projects",
    label: "Projects",
    href: "/projects",
    icon: Network,
    children: [
      { label: "Projects", href: "/projects", permission: "projects.projects.view" },
      { label: "Tasks", href: "/projects/tasks", permission: "projects.tasks.view" },
      { label: "Timesheets", href: "/projects/timesheets", permission: "projects.timesheets.view" },
      { label: "Project Reports", href: "/projects/reports", permission: "projects.reports.view" },
      { label: "Recycle bin", href: "/projects/recycle-bin", permission: "projects.recycle_bin.view" }
    ]
  },
  {
    key: "reports",
    label: "Data Warehouse / BI",
    href: "/reports",
    icon: BarChart3,
    children: [
      { label: "Executive KPIs", href: "/reports#kpis", permission: "reports.view" },
      { label: "Sales Analytics", href: "/reports#sales", permission: "reports.view" },
      { label: "Inventory Analytics", href: "/reports#inventory", permission: "reports.view" },
      { label: "HR Analytics", href: "/reports#hr", permission: "reports.view" },
      { label: "Finance Analytics", href: "/reports#finance", permission: "reports.view" },
      { label: "Custom Report", href: "/reports/custom", permission: "reports.view" },
      { label: "Report Snapshots", href: "/reports#snapshots", permission: "reports.view" }
    ]
  },
  {
    key: "settings",
    label: "Administration",
    href: "/settings",
    icon: Settings,
    children: [
      { label: "Rule Engine", href: "/settings/automations", permission: "admin.settings.manage", group: "Rule Engine" },
      { label: "Email templates", href: "/settings/email-templates", permission: "admin.settings.manage", group: "Email Engine" },
      { label: "Companies / Tenants", href: "/settings/tenants", permission: "admin.tenants.manage", group: "Organization" },
      { label: "Users", href: "/settings/users", permission: "admin.users.manage", group: "Organization" },
      { label: "Roles & Permissions", href: "/settings/roles", permission: "admin.roles.manage", group: "Organization" },
      { label: "Access Control", href: "/settings/access", permission: "admin.roles.manage", group: "Organization" },
      { label: "Blogs", href: "/settings/blogs", permission: "admin.settings.manage", group: "Content" },
      { label: "Menus & Pages", href: "/settings/content", permission: "admin.settings.manage", group: "Content" },
      { label: "Extra form fields", href: "/settings/forms", permission: "admin.settings.manage", group: "Content" },
      { label: "Subscription packages", href: "/settings/packages", permission: "admin.settings.manage", group: "Billing" },
      { label: "My company & billing", href: "/settings/billing", permission: "admin.settings.manage", group: "Billing" },
      { label: "Recycle bin", href: "/settings/recycle-bin", permission: "admin.settings.manage", group: "System" },
      { label: "Audit Logs", href: "/settings/audit", permission: "admin.audit.view", group: "System" },
      { label: "Notifications", href: "/settings/notifications", permission: "admin.notifications.view", group: "System" },
      { label: "Process guides", href: "/guides", permission: "admin.settings.manage", group: "System" },
      { label: "Third-party integrations", href: "/settings/integrations", permission: "admin.settings.manage", group: "System" },
      { label: "System Settings", href: "/settings/system", permission: "admin.settings.manage", group: "System" }
    ]
  }
];

/** First sidebar item under every module — dedicated flow-diagram page. */
const FLOW_GUIDE_PERM: Partial<Record<ModuleKey, string>> = {
  dashboard: "dashboard.overview.view",
  crm: "crm.leads.view",
  sales: "sales.quotations.view",
  purchases: "purchase.suppliers.view",
  inventory: "inventory.products.view",
  operations: "operations.overview.view",
  hrm: "hrm.overview.view",
  healthcare: "healthcare.overview.view",
  documents: "documents.required_uploads.view",
  finance: "finance.accounts.view",
  projects: "projects.projects.view",
  reports: "reports.view",
  settings: "admin.settings.manage"
};

function withModuleFlowDiagramMenus(groups: NavGroup[]): NavGroup[] {
  return groups.map((group) => {
    const href = `${group.href.replace(/\/$/, "")}/guide`;
    const already = group.children.some((c) => c.href === href || c.label === "Flow diagram");
    if (already) return group;
    const entry = {
      label: "Flow diagram",
      href,
      permission: FLOW_GUIDE_PERM[group.key] ?? `${group.key}.view`,
      group: "Guide"
    };
    return { ...group, children: [entry, ...group.children] };
  });
}

/** Module-wise compose email — each product as communication source. */
function withModuleComposeMenus(groups: NavGroup[]): NavGroup[] {
  return groups.map((group) => {
    const href = `${group.href.replace(/\/$/, "")}/compose`;
    const already = group.children.some((c) => c.href === href || c.label === "Compose email");
    if (already) return group;
    const entry = {
      label: "Compose email",
      href,
      permission: FLOW_GUIDE_PERM[group.key] ?? `${group.key}.view`,
      group: "Email Engine"
    };
    const flowIdx = group.children.findIndex((c) => c.label === "Flow diagram" || c.href.endsWith("/guide"));
    if (flowIdx >= 0) {
      const children = [...group.children];
      children.splice(flowIdx + 1, 0, entry);
      return { ...group, children };
    }
    return { ...group, children: [...group.children, entry] };
  });
}

/** Per-module rule engine console (shared platform engine). */
function withModuleAutomationsMenus(groups: NavGroup[]): NavGroup[] {
  return groups.map((group) => {
    const href = `${group.href.replace(/\/$/, "")}/automations`;
    const already = group.children.some(
      (c) => c.href === href || c.label === "Rule engine" || c.label === "Automations"
    );
    if (already) {
      return {
        ...group,
        children: group.children.map((c) =>
          c.href === href || c.label === "Automations"
            ? { ...c, label: "Rule engine", group: "Rule Engine" }
            : c
        )
      };
    }
    const entry = {
      label: "Rule engine",
      href,
      permission: FLOW_GUIDE_PERM[group.key] ?? `${group.key}.view`,
      group: "Rule Engine"
    };
    const composeIdx = group.children.findIndex((c) => c.label === "Compose email" || c.href.endsWith("/compose"));
    if (composeIdx >= 0) {
      const children = [...group.children];
      children.splice(composeIdx + 1, 0, entry);
      return { ...group, children };
    }
    return { ...group, children: [...group.children, entry] };
  });
}

export const navGroups: NavGroup[] = withModuleAutomationsMenus(
  withModuleComposeMenus(withModuleFlowDiagramMenus(rawNavGroups))
);

export const navItems: NavItem[] = navGroups.map(({ children, ...item }) => item);

export const defaultPermissionMatrix: Record<string, ModuleKey[]> = {
  super_admin: [
    "dashboard", "crm", "sales", "purchases", "inventory", "operations",
    "hrm", "healthcare", "documents", "finance", "projects", "reports", "settings"
  ],
  company_admin: [
    "dashboard", "crm", "sales", "purchases", "inventory", "operations",
    "hrm", "healthcare", "documents", "finance", "projects", "reports", "settings"
  ],
  hr_manager: ["dashboard", "hrm", "documents", "reports"],
  sales_manager: ["dashboard", "crm", "sales", "reports"],
  purchase_manager: ["dashboard", "purchases", "inventory", "reports"],
  warehouse_manager: ["dashboard", "inventory", "purchases", "reports"],
  finance_manager: ["dashboard", "finance", "sales", "purchases", "reports"],
  project_manager: ["dashboard", "projects", "reports"],
  employee: ["dashboard", "hrm", "documents", "projects"],
  viewer: ["dashboard", "reports"]
};

/** Live module matrix — mutated by `applyRoleCatalog`. */
export const permissionMatrix: Record<string, ModuleKey[]> = Object.fromEntries(
  Object.entries(defaultPermissionMatrix).map(([key, modules]) => [key, [...modules]])
);

export type RoleCatalogRow = {
  key: string;
  label: string;
  description: string;
  modules: ModuleKey[];
  is_active?: boolean;
};

function assignCatalog(
  target: Record<string, string> | Record<string, ModuleKey[]>,
  source: Record<string, string> | Record<string, ModuleKey[]>
) {
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, source);
}

/** Replace live role labels / modules from the persisted catalog. */
export function applyRoleCatalog(rows: RoleCatalogRow[]) {
  const active = rows.filter((row) => row.is_active !== false);
  const nextLabels: Record<string, string> = {};
  const nextMatrix: Record<string, ModuleKey[]> = {};
  const nextDescriptions: Record<string, string> = {};
  for (const row of active) {
    nextLabels[row.key] = row.label;
    nextMatrix[row.key] = [...row.modules];
    nextDescriptions[row.key] = row.description;
  }
  if (Object.keys(nextLabels).length === 0) {
    assignCatalog(roleLabels, defaultRoleLabels);
    assignCatalog(permissionMatrix, Object.fromEntries(
      Object.entries(defaultPermissionMatrix).map(([key, modules]) => [key, [...modules]])
    ));
    assignCatalog(roleDescriptions, defaultRoleDescriptions);
    return;
  }
  assignCatalog(roleLabels, nextLabels);
  assignCatalog(permissionMatrix, nextMatrix);
  assignCatalog(roleDescriptions, nextDescriptions);
}

export function listRoleKeys(): RoleKey[] {
  return Object.keys(roleLabels);
}

export function getRoleLabel(role: RoleKey) {
  return roleLabels[role] ?? defaultRoleLabels[role] ?? role;
}

export function getRoleModules(role: RoleKey): ModuleKey[] {
  return permissionMatrix[role] ?? defaultPermissionMatrix[role] ?? [];
}

export const permissionActions = [
  "View",
  "Create",
  "Approve",
  "Export",
  "Configure"
] as const;

export function canAccess(role: RoleKey, module: ModuleKey) {
  return getRoleModules(role).includes(module);
}

export function hasPermission(role: RoleKey, permission?: string) {
  if (!permission) return true;
  if (role === "super_admin") return true;
  const moduleName = permission.split(".")[0];
  const normalizedModule = moduleName === "purchase" ? "purchases" : moduleName === "admin" ? "settings" : moduleName === "data_warehouse" ? "reports" : moduleName;
  return getRoleModules(role).includes(normalizedModule as ModuleKey);
}

export function hasAction(role: RoleKey, module: ModuleKey, action: (typeof permissionActions)[number]) {
  if (!canAccess(role, module)) return false;
  if (role === "super_admin" || role === "company_admin") return true;
  if (action === "View") return true;
  if (role === "viewer") return action === "Export" && module === "reports";
  if (action === "Export") return true;
  if (action === "Create") return role !== "employee";
  if (action === "Approve") {
    return ["hrm", "purchases", "sales", "finance", "healthcare", "operations"].includes(module) && role !== "employee";
  }
  return false;
}

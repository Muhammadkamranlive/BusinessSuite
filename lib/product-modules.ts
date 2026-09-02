import { moduleScreenshot } from "@/lib/marketing-media";

export type ProductModule = {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  image: string;
  heroCaption: string;
  highlights: string[];
  includes: string[];
};

export const productModules: ProductModule[] = [
  {
    slug: "crm",
    title: "CRM",
    eyebrow: "Customers & pipeline",
    summary:
      "Real CRM screens: lead queue, customer 360°, deal pipeline, and opportunity flow — all in one login. Score leads, log activities, run campaigns, and track ticket SLA without a side spreadsheet.",
    image: moduleScreenshot.crm,
    heroCaption: "CRM dashboard — open leads, customers, pipeline value, and follow-ups",
    highlights: [
      "Open leads, customers, and logged activities at a glance",
      "Opportunities with stage, probability, and required win/loss reasons",
      "Customer segments that drive price lists on sales documents",
      "Campaigns, tickets with SLA, and overdue follow-ups on one desk"
    ],
    includes: [
      "Leads",
      "Customers",
      "Contacts",
      "Opportunities",
      "Activities",
      "Follow-ups",
      "Campaigns",
      "Tickets",
      "Customer segments",
      "CRM analytics"
    ]
  },
  {
    slug: "sales",
    title: "Sales",
    eyebrow: "Quotes to cash",
    summary:
      "Quotations, sales orders, delivery notes, invoices, receipts, and sales analytics on live screens. Credit hold, price lists, and tax from finance — quote to cash without leaving the suite.",
    image: moduleScreenshot.sales,
    heroCaption: "Sales — quotations, orders, invoices, and AR on one workspace",
    highlights: [
      "Quote → order → delivery note → invoice, with expiry on quotations",
      "List prices, customer price groups, and tax from the finance catalog",
      "Credit hold blocks orders and invoices when AR is over limit",
      "Receipts, credit notes, and return authorizations (RMA) on the same AR"
    ],
    includes: [
      "Quotations",
      "Sales orders",
      "Delivery notes",
      "Invoices",
      "Credit notes",
      "Customer receipts",
      "Return authorizations (RMA)",
      "Price lists",
      "Sales representatives",
      "Sales analytics"
    ]
  },
  {
    slug: "purchases",
    title: "Procurement",
    eyebrow: "Requisition to pay",
    summary:
      "Requisition, RFQ, purchase order, goods receipt, vendor bill, and payment — with a three-way match that blocks variance outside tolerance. Debit notes handle charge-backs without a side spreadsheet.",
    image: moduleScreenshot.purchases,
    heroCaption: "Procurement home — open POs, suppliers, inbound pipeline, and debit notes",
    highlights: [
      "Purchase requisitions that mark ordered once the PO is raised",
      "RFQ award uses supplier quote lines, not a free-typed PO",
      "GRN with QC and over-receipt block; low stock can raise a PR",
      "Three-way match on bills, supplier payments, and debit notes"
    ],
    includes: [
      "Suppliers",
      "Purchase requisitions",
      "Request for quotation",
      "Purchase orders",
      "Goods receipt notes (GRN)",
      "Supplier invoices",
      "Supplier payments",
      "Debit notes",
      "Procurement analytics"
    ]
  },
  {
    slug: "inventory",
    title: "Inventory",
    eyebrow: "Stock that matches the warehouse",
    summary:
      "Active SKUs, warehouses, bins, batches, and serials on one board. Movements, transfers, and adjustments stay audited; low-stock alerts can feed a purchase requisition before the floor runs out.",
    image: moduleScreenshot.inventory,
    heroCaption: "Inventory home — SKUs, warehouses, movements, batches, and low-stock alerts",
    highlights: [
      "Products, categories, brands, and units of measure in one catalog",
      "Bins inside a warehouse, plus lots/expiry and serials",
      "Movement ledger, transfers, and adjustments with dates and quantities",
      "Low-stock alerts that purchasing can turn into a requisition"
    ],
    includes: [
      "Products",
      "Categories",
      "Brands",
      "Units of measure",
      "Warehouses",
      "Bins / locations",
      "Batches / lots",
      "Serial numbers",
      "Stock movements",
      "Transfers",
      "Adjustments",
      "Low-stock alerts",
      "Inventory reports"
    ]
  },
  {
    slug: "operations",
    title: "Operations",
    eyebrow: "Plant, quality & contracts",
    summary:
      "BOM, work orders, maintenance, quality inspections, fleet, and contracts — plant operations on screens built for supervisors and planners, not whiteboards.",
    image: moduleScreenshot.operations,
    heroCaption: "Operations — BOM, work orders, maintenance, and quality",
    highlights: [
      "BOM and work orders so finished items are not built from a whiteboard",
      "Preventive and breakdown maintenance against equipment",
      "Incoming / in-process / outgoing quality inspections",
      "AMC and lease contracts, company vehicles, and warranty claims"
    ],
    includes: [
      "Bills of materials",
      "Work orders",
      "Maintenance orders",
      "Quality inspections",
      "Contracts",
      "Vehicles / fleet",
      "Warranty claims"
    ]
  },
  {
    slug: "hrm",
    title: "HRM",
    eyebrow: "People, attendance & payroll",
    summary:
      "Headcount, attendance, leave balances, payroll runs, loans, and recruitment on real HRM screens. Managers approve in inbox; employees use self-service on the same tenant.",
    image: moduleScreenshot.hrm,
    heroCaption: "HRM — employees, attendance, leave, payroll, and organization",
    highlights: [
      "Organization, jobs, positions, and hire that fills a vacant seat",
      "Shifts, holidays, attendance, and leave that skip weekends and holidays",
      "Compensation bands, benefits, PF, EOBI, and employee loans with EMI",
      "Payroll finalize posts salaries, tax, statutory, and loan recovery to finance"
    ],
    includes: [
      "Employees",
      "Organization",
      "Positions",
      "Recruitment",
      "Attendance",
      "Shifts & holidays",
      "Leave",
      "Payroll",
      "Pay grades",
      "Benefits",
      "Provident fund",
      "EOBI",
      "Employee loans & advances",
      "Custom forms"
    ]
  },
  {
    slug: "healthcare",
    title: "Healthcare",
    eyebrow: "Hospital & clinic (HMS)",
    summary:
      "Hospital HMS on real screens: patients, OPD/IPD, pharmacy, lab, radiology, EMR, OT, nursing, and insurance claims — same login as finance and HR.",
    image: moduleScreenshot.healthcare,
    heroCaption: "Healthcare HMS — patients, wards, pharmacy, lab, and claims",
    highlights: [
      "MRN-style patients, doctors, appointments, OPD tokens, and ED triage",
      "Wards, beds, admissions, nursing notes, vitals, and duty rosters",
      "Prescriptions, pharmacy stock, dispensing, lab catalog and results, radiology orders",
      "EMR notes, OT cases, consents, insurance, claims, infection and PHC audit"
    ],
    includes: [
      "Patients",
      "Doctors",
      "Appointments",
      "OPD visits",
      "Emergency / ED",
      "Wards & beds",
      "IPD admissions",
      "Prescriptions",
      "Pharmacy & dispensing",
      "Lab tests & orders",
      "Radiology orders",
      "EMR notes",
      "OT / surgeries",
      "Insurance & claims",
      "Quality & PHC audit"
    ]
  },
  {
    slug: "finance",
    title: "Finance",
    eyebrow: "Books you can show leadership",
    summary:
      "Chart of accounts, journals, banks, cheques, budgets, and live P&L, balance sheet, and cash flow — finance screens that match what your accountant expects.",
    image: moduleScreenshot.finance,
    heroCaption: "Finance — ledger, P&L, balance sheet, and chart of accounts",
    highlights: [
      "Income, expenses, journals, and tax next to a live P&L",
      "Banks, accounts, PDC cheques, and statement reconciliation (file import later)",
      "Fiscal years, periods, voucher types, currencies, payment terms, and partners",
      "General ledger, trial balance, balance sheet, and cash flow from posted journals"
    ],
    includes: [
      "Chart of accounts",
      "Expenses & income",
      "Journal entries",
      "Taxes",
      "Banks & bank accounts",
      "Cheques / PDC",
      "Bank reconciliation",
      "Fiscal years & periods",
      "Budgets",
      "Voucher types",
      "Withholding certificates",
      "Currencies",
      "Payment terms",
      "General ledger",
      "Trial balance",
      "Balance sheet",
      "Cash flow",
      "Profit & loss"
    ]
  },
  {
    slug: "documents",
    title: "Documents",
    eyebrow: "Files with the record",
    summary:
      "Required uploads, a company library, and assignment to people — so contracts and IDs live with the employee or vendor, not in a shared drive.",
    image: moduleScreenshot.documents,
    heroCaption: "Document management — required uploads, library, and assignment",
    highlights: [
      "Required document types for the company",
      "Library of files the team can find again",
      "Assign documents to users so HR and finance are not chasing email",
      "A recycle bin for files that should not vanish forever"
    ],
    includes: ["Required uploads", "Library", "Assign to users", "Document types", "Recycle bin"]
  },
  {
    slug: "projects",
    title: "Projects",
    eyebrow: "Delivery next to the books",
    summary:
      "Projects, tasks, timesheets, and project reports — delivery tracked next to sales and payroll, not in a separate tool.",
    image: moduleScreenshot.projects,
    heroCaption: "Projects — tasks, timesheets, and delivery tracking",
    highlights: [
      "Project list with progress the manager can see",
      "Tasks owned by the people doing the work",
      "Timesheets with submit and approve, ready for payroll and project cost",
      "Project reports without exporting to a second system"
    ],
    includes: ["Projects", "Tasks", "Timesheets", "Project reports"]
  },
  {
    slug: "reports",
    title: "Reports & BI",
    eyebrow: "One set of numbers",
    summary:
      "Executive KPIs, sales and inventory analytics, custom reports, and saved snapshots — BI and data warehouse views from the same live company data.",
    image: moduleScreenshot.reports,
    heroCaption: "Reports & BI — executive KPIs, analytics, and snapshots",
    highlights: [
      "Executive KPIs on one board",
      "Sales, inventory, HR, and finance analytics from live modules",
      "Custom reports when the standard pack is not enough",
      "Snapshots you can keep for a board pack"
    ],
    includes: [
      "Executive KPIs",
      "Sales analytics",
      "Inventory analytics",
      "HR analytics",
      "Finance analytics",
      "Custom reports",
      "Snapshots"
    ]
  },
  {
    slug: "administration",
    title: "Administration",
    eyebrow: "Company, users & rights",
    summary:
      "Company dashboard, users, roles, pay-per-app licensing, access control, billing, extra fields, and audit — the admin screens that govern every tenant.",
    image: moduleScreenshot.administration,
    heroCaption: "Administration — company dashboard, users, roles, and billing",
    highlights: [
      "Live operational mix across invoices, payments, POs, and P&L",
      "Pay per app — license only the modules and platform engines you need",
      "Role rights inside each licensed app — view / add / update / delete",
      "Extra fields on every module form, plus company billing and packages",
      "Third-party integrations listed for later (email, SMS, bank feeds, PACS)"
    ],
    includes: [
      "Companies",
      "Users",
      "Roles & permissions",
      "Access Control",
      "Rule Engine",
      "Extra form fields",
      "Packages",
      "Billing",
      "Recycle bin",
      "Audit logs",
      "Third-party integrations"
    ]
  },
  {
    slug: "email-engine",
    title: "Email Engine",
    eyebrow: "Compose & templates",
    summary:
      "Gmail-style compose in every module, HTML and branded templates, merge fields, and attachments — the same library Rule Engine uses for automations.",
    image: moduleScreenshot["email-engine"],
    heroCaption: "Email Engine — compose, templates, and branded HTML sends",
    highlights: [
      "Module-wise compose — CRM, Sales, HRM, Finance, and more",
      "Template library with logo / picture layouts and HTML source editing",
      "Custom To, CC, BCC, and {{merge}} fields per send",
      "Shared with Rule Engine send-email actions"
    ],
    includes: [
      "Compose email (per module)",
      "Email templates",
      "HTML template editor",
      "Branded / picture templates",
      "Attachments",
      "Sender profiles",
      "Template preview"
    ]
  },
  {
    slug: "rule-engine",
    title: "Rule Engine",
    eyebrow: "Automation platform",
    summary:
      "When→then rules on real flow diagrams: email, in-app alerts, tasks, schedules, and approvals across every licensed module — backed by Postgres, not one browser.",
    image: moduleScreenshot["rule-engine"],
    heroCaption: "Rule Engine — process flows, events, and automation consoles",
    highlights: [
      "Per-module Rule Engine tab plus company-wide hub (requires Email Engine)",
      "Send email with every template in your library",
      "In-app bell, tasks, and multi-step approvals",
      "DB-backed rules — survives refresh and login"
    ],
    includes: [
      "When→then rules",
      "Event catalog",
      "Email templates",
      "Schedules",
      "Approval chains",
      "Event log & replay",
      "Email outbox",
      "Per-module consoles"
    ]
  }
];

export function getProductModule(slug: string) {
  return productModules.find((m) => m.slug === slug);
}

export const featuredProductSlugs = ["crm", "sales", "hrm", "healthcare", "operations", "finance"] as const;

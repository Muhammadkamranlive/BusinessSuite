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
      "See open leads, pipeline value, and follow-ups on one home screen. Score and convert leads, keep one primary contact per customer, and track campaign ROI and ticket SLA from the same login.",
    image: "/marketing/ERPCRM.png",
    heroCaption: "CRM home — open leads, pipeline, deals, campaigns, and tickets",
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
      "Quotations, orders, dispatch, invoices, and collections in one path. Price lists and credit hold sit on the customer; receipts cannot over-allocate; credit notes and RMAs close the loop.",
    image: "/marketing/erpsales.png",
    heroCaption: "Sales home — quotations, AR outstanding, collection rate, recent invoices",
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
    image: "/marketing/purchase.png",
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
    image: "/marketing/Erpinventroy.png",
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
      "Bills of materials and work orders for assembly, maintenance and fleet for assets, incoming inspections for quality, plus customer/vendor contracts and warranty claims — in the same login as stock and purchasing.",
    image: "/marketing/projects.png",
    heroCaption: "Operations — BOM, work orders, maintenance, inspections, fleet, and contracts",
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
      "Hire into a position, run attendance and leave with balances, generate payroll that posts to the books, and recover employee loans on the same cycle. Self-service for the worker; inbox approvals for the manager.",
    image: "/marketing/erphrm.png",
    heroCaption: "HRM overview — headcount, attendance, leave, payroll, loans, and open candidates",
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
      "Patient registration, OPD and IPD, pharmacy, lab, radiology orders, EMR, OT, nursing, insurance claims, and quality checklists — hospital CRUD in the same ERP as finance and HR. Imaging viewers, SMS, and e-sign stay on the integrations list.",
    image: "/marketing/erphrm.png",
    heroCaption: "Healthcare — patients, appointments, OPD/IPD, pharmacy, lab, and claims",
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
      "Chart of accounts, journals, banks, cheques, reconciliation, fiscal years, budgets, and withholding — plus trial balance, P&L, balance sheet, and cash flow from the same posted ledger the other modules already wrote.",
    image: "/marketing/erpfinance.png",
    heroCaption: "Finance home — income vs expenses, P&L, ledger statements, and chart of accounts",
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
    image: "/marketing/documentamangement.png",
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
      "Projects, tasks, and timesheets in the same login as sales and payroll — submit and approve time so delivery hours are not trapped in a separate tool.",
    image: "/marketing/projects.png",
    heroCaption: "Project management — projects, tasks, and timesheets",
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
      "Executive KPIs plus sales, inventory, HR, and finance analytics from the same company records. Save a snapshot when leadership needs a freeze of the week.",
    image: "/marketing/wherehouse.png",
    heroCaption: "Data warehouse / BI — executive KPIs and module analytics",
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
      "Users, roles, and pay-per-app licensing, extra form fields per tenant, packages and billing, recycle bin, and a written list of third-party integrations to wire later.",
    image: "/marketing/erpdashadmin.png",
    heroCaption: "Company dashboard — live operational mix, CRM funnel, and tenant controls",
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
      "Send from every module with a Gmail-style composer, merge fields, attachments, and a tenant template library. Build picture-branded layouts or write HTML templates as source code — the same templates Rule Engine uses for automations.",
    image: "/marketing/documentamangement.png",
    heroCaption: "Email Engine — compose, templates, HTML editor, and branded sends",
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
      "When→then rules across every module: email customers on overdue invoices, notify HR on leave, alert buyers on low stock, or send sign-in alerts to any address. Schedules, approvals, and a full event log — no code.",
    image: "/marketing/ERPCRM.png",
    heroCaption: "Rule Engine — events, conditions, email templates, and action results",
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

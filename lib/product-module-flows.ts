export type FlowIcon =
  | "shield"
  | "userPlus"
  | "users"
  | "briefcase"
  | "check"
  | "file"
  | "wallet"
  | "boxes"
  | "cart"
  | "truck"
  | "chart"
  | "building"
  | "key"
  | "bell"
  | "folder"
  | "spark";

export type ModuleFlowStep = {
  title: string;
  role: string;
  detail: string;
  icon: FlowIcon;
};

export type ModuleRoleGuide = {
  role: string;
  does: string;
};

export type ModuleFlow = {
  slug: string;
  promise: string;
  roles: ModuleRoleGuide[];
  steps: ModuleFlowStep[];
};

export const moduleFlows: ModuleFlow[] = [
  {
    slug: "crm",
    promise: "From a new lead to a won deal — with the right people seeing only their pipeline.",
    roles: [
      { role: "Company Admin", does: "Creates Sales Manager and Viewer roles, then invites the team." },
      { role: "Sales Manager", does: "Owns leads, deals, activities, and follow-ups." },
      { role: "Viewer", does: "Reads dashboards and reports without changing records." }
    ],
    steps: [
      { title: "Assign CRM rights", role: "Company Admin", detail: "Grant Sales Manager view/add/update on Leads, Customers, and Deals. Viewers get reports only.", icon: "shield" },
      { title: "Invite the sales desk", role: "Company Admin", detail: "Add people with a login password. Same email can also belong to another company.", icon: "userPlus" },
      { title: "Capture the lead", role: "Sales Manager", detail: "Create a lead, score it, and convert only when the score gate is met.", icon: "spark" },
      { title: "Move the pipeline", role: "Sales Manager", detail: "Qualify, propose, and negotiate. Win/loss reason is required when the deal closes.", icon: "briefcase" },
      { title: "Hand off to sales docs", role: "Sales Manager", detail: "Won deals become quotations and invoices without leaving the suite.", icon: "file" },
      { title: "Review the funnel", role: "Viewer / Admin", detail: "CRM reports and BI show conversion — no export to a second tool.", icon: "chart" }
    ]
  },
  {
    slug: "sales",
    promise: "Quote, invoice, and collect in one path so AR is never a spreadsheet.",
    roles: [
      { role: "Company Admin", does: "Unlocks Sales menus and extra invoice fields for the company." },
      { role: "Sales Manager", does: "Issues quotations, orders, invoices, and records receipts." },
      { role: "Finance Manager", does: "Sees collections, matches payments, and posts to the books." }
    ],
    steps: [
      { title: "Open Sales for the role", role: "Company Admin", detail: "Sales Manager gets quotations through payments. Finance gets invoices and receipts.", icon: "key" },
      { title: "Send a quotation", role: "Sales Manager", detail: "Price from the list and customer segment. Quotes expire; extra fields stay on that company’s form.", icon: "file" },
      { title: "Confirm the order", role: "Sales Manager", detail: "Convert the quote. Credit hold blocks the order if the customer is over limit.", icon: "check" },
      { title: "Invoice the customer", role: "Sales Manager", detail: "Tax from the catalog. AR outstanding updates on the Sales home the same day.", icon: "wallet" },
      { title: "Record the payment", role: "Finance / Sales", detail: "Receipts cannot exceed the open balance. Credit notes apply against invoices.", icon: "wallet" },
      { title: "Read the pack", role: "Leadership", detail: "Sales reports and BI snapshots freeze the week for the board.", icon: "chart" }
    ]
  },
  {
    slug: "purchases",
    promise: "Raise a PO, receive goods, and pay the vendor without losing the paper trail.",
    roles: [
      { role: "Company Admin", does: "Gives Purchase and Warehouse managers their menus." },
      { role: "Purchase Manager", does: "Suppliers, purchase orders, and vendor bills." },
      { role: "Warehouse Manager", does: "Goods receipts that update stock." }
    ],
    steps: [
      { title: "Split buy vs receive", role: "Company Admin", detail: "Purchase Manager writes POs. Warehouse receives. Finance pays bills.", icon: "shield" },
      { title: "Add the supplier", role: "Purchase Manager", detail: "Vendor card with buyer contact — not a row in a private sheet.", icon: "building" },
      { title: "Raise the PO", role: "Purchase Manager", detail: "From a requisition or awarded RFQ. Open pipeline value appears until goods land.", icon: "cart" },
      { title: "Receive the shipment", role: "Warehouse Manager", detail: "GRN with QC. Over-receipt is blocked. Stock and GRNI post together.", icon: "truck" },
      { title: "Book the vendor bill", role: "Finance / Purchase", detail: "Three-way match blocks variance outside the tolerance you set.", icon: "file" },
      { title: "Pay or debit", role: "Finance Manager", detail: "Payments close AP. Debit notes handle charge-backs without a side sheet.", icon: "wallet" }
    ]
  },
  {
    slug: "inventory",
    promise: "Stock matches the warehouse: movements, transfers, and low-stock before the floor runs out.",
    roles: [
      { role: "Company Admin", does: "Assigns Warehouse Manager to inventory and related purchases." },
      { role: "Warehouse Manager", does: "Products, locations, movements, transfers, adjustments." },
      { role: "Purchase Manager", does: "Replenishes from low-stock alerts." }
    ],
    steps: [
      { title: "Give warehouse the floor", role: "Company Admin", detail: "Inventory menus: products, warehouses, movements, low-stock. Purchases stay with buying.", icon: "key" },
      { title: "Set SKUs and bins", role: "Warehouse Manager", detail: "Products, brands, UOM, warehouses, and putaway bins on one board.", icon: "boxes" },
      { title: "Post a movement", role: "Warehouse Manager", detail: "Purchases in, sales out — lots and serials when the item is tracked.", icon: "truck" },
      { title: "Transfer between sites", role: "Warehouse Manager", detail: "Stock leaves one warehouse and lands in another without a side sheet.", icon: "boxes" },
      { title: "Act on low stock", role: "Purchase Manager", detail: "Alerts can raise a purchase requisition so replenishment is not tribal knowledge.", icon: "bell" },
      { title: "Adjust and report", role: "Warehouse / Admin", detail: "Adjustments stay audited. Inventory analytics live in BI.", icon: "chart" }
    ]
  },
  {
    slug: "operations",
    promise: "Build, maintain, inspect, and contract — without a plant spreadsheet next to the ERP.",
    roles: [
      { role: "Company Admin", does: "Opens Operations for plant, quality, and contract owners." },
      { role: "Operations / Warehouse", does: "BOM, work orders, inspections, and fleet." },
      { role: "Finance / Commercial", does: "Contracts and warranty value next to AP and AR." }
    ],
    steps: [
      { title: "Open the plant desk", role: "Company Admin", detail: "Operations sits beside Inventory and Procurement — not a second product.", icon: "key" },
      { title: "Define the BOM", role: "Operations", detail: "Finished item and components so a work order is not a guess.", icon: "boxes" },
      { title: "Release the work order", role: "Operations", detail: "Plan, release, and complete assembly against the BOM.", icon: "check" },
      { title: "Maintain the asset", role: "Maintenance", detail: "Preventive and breakdown orders on equipment and vehicles.", icon: "truck" },
      { title: "Inspect quality", role: "Quality", detail: "Incoming, in-process, and outgoing results stay with the item.", icon: "bell" },
      { title: "Hold the contract", role: "Commercial", detail: "AMC, lease, and warranty claims in the same company workspace.", icon: "file" }
    ]
  },
  {
    slug: "hrm",
    promise: "Hire, attend, approve leave, and pay — with self-service for the employee and control for HR.",
    roles: [
      { role: "Company Admin", does: "Creates HR Manager and Employee roles; never Super Admin (that is the platform operator)." },
      { role: "HR Manager", does: "Workers, jobs, leave, payroll, inbox approvals." },
      { role: "Employee", does: "Own timesheets, leave, pay, and documents." }
    ],
    steps: [
      { title: "Staff the people team", role: "Company Admin", detail: "HR Manager gets HRM + documents. Employees get self-service only.", icon: "shield" },
      { title: "Build the org", role: "HR Manager", detail: "Departments, jobs, positions, locations, cost centers — then hire into a seat.", icon: "building" },
      { title: "Onboard the worker", role: "HR Manager", detail: "Profile, IDs, compensation, and required documents in one worker record.", icon: "userPlus" },
      { title: "Run the week", role: "Employee / HR", detail: "Attendance and timesheets. Leave requests land in Inbox for approval.", icon: "check" },
      { title: "Change the job", role: "HR / Manager", detail: "Transfer, promote, or terminate with an effective date and inbox approval.", icon: "briefcase" },
      { title: "Pay the cycle", role: "HR Manager", detail: "Generate payroll with OT, LWP, PF/EOBI, and loan EMI; finalize posts the GL.", icon: "wallet" }
    ]
  },
  {
    slug: "healthcare",
    promise: "Register the patient, run OPD or IPD, dispense and report — hospital records in the same tenant as finance and HR.",
    roles: [
      { role: "Company Admin", does: "Opens Healthcare for clinic or hospital operators (Platinum / Professional)." },
      { role: "Front desk / clinicians", does: "Patients, appointments, OPD, IPD, EMR, pharmacy, lab." },
      { role: "Billing / quality", does: "Insurance claims, consents, infection and PHC audit." }
    ],
    steps: [
      { title: "Register the patient", role: "Front desk", detail: "MRN, demographics, and insurance policy on one master.", icon: "userPlus" },
      { title: "Book and see", role: "Clinic", detail: "Appointments, OPD tokens, ED triage, then EMR and vitals.", icon: "users" },
      { title: "Admit when needed", role: "IPD", detail: "Ward, bed, nursing notes, duty roster, and discharge.", icon: "building" },
      { title: "Order diagnostics", role: "Clinician", detail: "Lab catalog, sample tracking, radiology orders (PACS viewer later).", icon: "file" },
      { title: "Dispense and bill", role: "Pharmacy / Billing", detail: "Prescription, pharmacy stock, dispensing, then claim to the payer.", icon: "wallet" },
      { title: "Close quality", role: "Quality / Admin", detail: "Infection incidents, CQI, CSSD, equipment PM, PHC checklist.", icon: "check" }
    ]
  },
  {
    slug: "finance",
    promise: "Income, expenses, banks, journals, and statements from the same company records the other modules already posted.",
    roles: [
      { role: "Company Admin", does: "Opens Finance for the controller; keeps extra GL fields per company." },
      { role: "Finance Manager", does: "Accounts, banks, cheques, journals, tax, statements." },
      { role: "Viewer", does: "Reads finance reports without posting." }
    ],
    steps: [
      { title: "Hand the books", role: "Company Admin", detail: "Finance Manager: full finance menus. Sales/Purchase managers do not edit the chart of accounts.", icon: "key" },
      { title: "Chart of accounts", role: "Finance Manager", detail: "Cash, AR, revenue, payroll codes — plus currencies, terms, and voucher types.", icon: "file" },
      { title: "Bank the day", role: "Finance Manager", detail: "Bank accounts, PDC cheques, and statement reconciliation (auto-import later).", icon: "wallet" },
      { title: "Post and close", role: "Finance Manager", detail: "Journals from sales, purchases, payroll, and expenses. Fiscal year and period status.", icon: "chart" },
      { title: "Read statements", role: "Leadership", detail: "Ledger, trial balance, P&L, balance sheet, and cash flow from posted lines.", icon: "spark" },
      { title: "Board pack", role: "Leadership", detail: "Finance analytics and snapshots in Data Warehouse.", icon: "users" }
    ]
  },
  {
    slug: "documents",
    promise: "Required files live with the person or vendor — not in a shared drive nobody owns.",
    roles: [
      { role: "Company Admin", does: "Defines document types and who may assign files." },
      { role: "HR Manager", does: "Collects employee packs and checks expiry." },
      { role: "Employee", does: "Uploads their own required documents." }
    ],
    steps: [
      { title: "Set the types", role: "Company Admin", detail: "IDs, contracts, certificates — required vs optional for this company.", icon: "folder" },
      { title: "Invite with a password", role: "Company Admin / HR", detail: "The person signs in and sees only their upload list when they are an Employee.", icon: "userPlus" },
      { title: "Upload the pack", role: "Employee", detail: "Dropzone on Documents. Status shows what is still missing.", icon: "file" },
      { title: "Assign from the library", role: "HR Manager", detail: "Company files go to the right people instead of a blast email.", icon: "users" },
      { title: "Watch expiry", role: "HR Manager", detail: "Identity docs nearing expiry surface on the people desk.", icon: "bell" },
      { title: "Recycle, don’t lose", role: "Admin / HR", detail: "Trash is recoverable until you purge. Audit keeps the trail.", icon: "check" }
    ]
  },
  {
    slug: "projects",
    promise: "Delivery hours sit next to sales and payroll so project cost is not trapped in another app.",
    roles: [
      { role: "Company Admin", does: "Gives Project Manager the projects module." },
      { role: "Project Manager", does: "Projects, tasks, timesheets, reports." },
      { role: "Employee", does: "Logs time on assigned tasks." }
    ],
    steps: [
      { title: "Open Projects", role: "Company Admin", detail: "Project Manager sees projects and tasks. Employees see their timesheets.", icon: "shield" },
      { title: "Create the project", role: "Project Manager", detail: "Progress the sponsor can see without a status meeting deck.", icon: "briefcase" },
      { title: "Assign tasks", role: "Project Manager", detail: "Owners are the people doing the work — same directory as HR.", icon: "users" },
      { title: "Log time", role: "Employee", detail: "Timesheets can feed payroll and project cost in one login.", icon: "check" },
      { title: "Review delivery", role: "Project Manager", detail: "Project reports without exporting to a second system.", icon: "chart" },
      { title: "Close the loop", role: "Finance / PM", detail: "Hours and invoices stay in the same company workspace.", icon: "wallet" }
    ]
  },
  {
    slug: "reports",
    promise: "One set of numbers: KPIs and module analytics from live CRM, stock, people, and books.",
    roles: [
      { role: "Company Admin", does: "Lets managers view BI; keeps export in the audit log." },
      { role: "Managers", does: "Read their slice — sales, inventory, HR, or finance." },
      { role: "Viewer", does: "Dashboards and snapshots only." }
    ],
    steps: [
      { title: "Who may see BI", role: "Company Admin", detail: "Viewers and managers get reports. Export is logged.", icon: "key" },
      { title: "Executive board", role: "Leadership", detail: "KPIs from the same records the teams already posted.", icon: "chart" },
      { title: "Slice by module", role: "Department manager", detail: "Sales, inventory, HR, and finance analytics without a warehouse project.", icon: "boxes" },
      { title: "Custom report", role: "Analyst / Admin", detail: "When the standard pack is not enough, build a custom view.", icon: "spark" },
      { title: "Freeze a snapshot", role: "Leadership", detail: "Keep a board pack of the week so numbers do not move under you.", icon: "file" },
      { title: "Trust the tenant", role: "Company Admin", detail: "Figures are this company’s workspace — not a mix of other customers.", icon: "shield" }
    ]
  },
  {
    slug: "administration",
    promise: "Company Admin runs this workspace. Platform Super Admin is us — never a line item on a customer package.",
    roles: [
      { role: "Company Admin", does: "Users, roles, extra fields, billing — this company only." },
      { role: "Super Admin", does: "Platform: all companies, public blog, CMS, package catalog. Not sold with Silver–Platinum." },
      { role: "Invited users", does: "See only menus their role (and overrides) allow." }
    ],
    steps: [
      { title: "Create the company", role: "Signup", detail: "Website signup makes you Company Admin of a new tenant — not Super Admin.", icon: "building" },
      { title: "Pick a package", role: "Company Admin", detail: "Shared SaaS (Silver–Platinum) or Professional dedicated infrastructure.", icon: "spark" },
      { title: "Design roles", role: "Company Admin", detail: "Add HR, sales, warehouse… Super Admin cannot be assigned to a company user.", icon: "shield" },
      { title: "Invite with a password", role: "Company Admin", detail: "Same email can join another company. They switch workspace in the header.", icon: "userPlus" },
      { title: "Tune menus", role: "Company Admin", detail: "Access Control: view / add / update / delete. Blog and CMS stay platform-only.", icon: "key" },
      { title: "Run the company", role: "The team", detail: "Each person lands in CRM, HRM, stock, healthcare, operations, or finance according to their role.", icon: "check" }
    ]
  }
];

export function getModuleFlow(slug: string) {
  return moduleFlows.find((f) => f.slug === slug) ?? null;
}

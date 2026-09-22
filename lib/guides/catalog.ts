import type { ModuleKey } from "@/lib/permissions";
import type { GuideDefinition, GuideFlow, GuideStep } from "@/lib/guides/types";

function step(id: string, title: string, description: string, href?: string, tag?: string): GuideStep {
  return { id, title, description, href, tag };
}

function flow(id: string, title: string, summary: string, steps: GuideStep[]): GuideFlow {
  return { id, title, summary, steps };
}

/** Module + menu process guides — web flow diagrams for onboarding. */
export const guideCatalog: GuideDefinition[] = [
  /* ——— Dashboard ——— */
  {
    id: "dashboard.root",
    module: "dashboard",
    title: "Dashboard overview",
    purpose: "See company health at a glance — sales, AR, inventory, and HR signals for your tenant.",
    dataFlow: "Numbers are calculated from CRM, Sales, Inventory, Finance, and HRM records already saved for this company.",
    hrefs: ["/dashboard", "/dashboard/guide"],
    isModuleOverview: true,
    flows: [
      flow("dash.start", "First-time walkthrough", "Open the right modules in order so the dashboard fills with real data.", [
        step("1", "Confirm company & users", "Administration → Users / Roles so the right people can sign in.", "/settings/users", "Setup"),
        step("2", "Add customers & products", "CRM customers and Inventory products feed sales and stock KPIs.", "/crm/customers", "Master data"),
        step("3", "Create a quote or invoice", "Sales documents update revenue and AR tiles on this hub.", "/sales/quotations", "Transactions"),
        step("4", "Review this dashboard", "Return here to monitor KPIs; drill into module analytics for detail.", "/dashboard", "Review")
      ])
    ],
    tips: ["Employee / self-service roles see a personal home instead of executive KPIs.", "Switch company (if allowed) from the header — KPIs are tenant-scoped."]
  },

  /* ——— CRM ——— */
  {
    id: "crm.root",
    module: "crm",
    title: "CRM — how the module works",
    purpose: "Capture demand, nurture opportunities, and maintain the customer master used by Sales and Finance.",
    dataFlow: "Lead → qualify → Customer / Deal → Activities & Campaigns. Won deals feed Sales quotations. Tickets stay in CRM support.",
    hrefs: ["/crm", "/crm/guide"],
    isModuleOverview: true,
    flows: [
      flow("crm.pipeline", "Core commercial pipeline", "Follow this order so Sales can invoice against real customers.", [
        step("1", "Create a lead", "Log company, contact, source, and estimated value.", "/crm/leads", "1st"),
        step("2", "Work the lead", "Call / email / meeting activities move status toward Qualified.", "/crm/activities", "2nd"),
        step("3", "Convert to customer", "Create the customer (and contact) master record.", "/crm/customers", "3rd"),
        step("4", "Open an opportunity", "Track stage, amount, and probability until Won / Lost.", "/crm/deals", "4th"),
        step("5", "Hand off to Sales", "From a won deal, raise a quotation in Sales.", "/sales/quotations", "Next")
      ])
    ],
    tips: ["Segments group customers for campaigns.", "Recycle bin restores soft-deleted CRM rows."]
  },
  {
    id: "crm.leads",
    module: "crm",
    title: "Leads guide",
    purpose: "Inbound interest before someone becomes a paying customer.",
    dataFlow: "New lead → contact / qualify → convert to Customer + optional Deal. Lost leads stay for reporting.",
    hrefs: ["/crm/leads"],
    flows: [
      flow("crm.leads.work", "Working a lead", "Do not skip convert — Sales needs a customer name on quotes.", [
        step("1", "Add lead", "Capture company, contact, email, source, and value.", "/crm/leads", "Create"),
        step("2", "Log activities", "Every call or email updates the funnel.", "/crm/activities", "Follow-up"),
        step("3", "Mark qualified", "Update status when budget / need is confirmed.", "/crm/leads", "Qualify"),
        step("4", "Convert", "Create customer (and deal) so quoting can start.", "/crm/customers", "Convert")
      ])
    ]
  },
  {
    id: "crm.customers",
    module: "crm",
    title: "Customers guide",
    purpose: "Master list of accounts used by Sales invoices, receipts, and credit checks.",
    dataFlow: "Customer master → Sales documents reference name/id → AR and credit limits apply on invoice.",
    hrefs: ["/crm/customers"],
    flows: [
      flow("crm.cust", "Keep customer master clean", "One customer record powers quotes, orders, and invoices.", [
        step("1", "Create customer", "Legal name, email, credit limit, and billing address.", "/crm/customers", "1st"),
        step("2", "Add contacts", "People at the account for follow-ups.", "/crm/contacts", "2nd"),
        step("3", "Segment (optional)", "Assign groups for campaigns / price lists.", "/crm/groups", "3rd"),
        step("4", "Sell", "Create quotation or invoice against this customer.", "/sales/quotations", "4th")
      ])
    ]
  },
  {
    id: "crm.contacts",
    module: "crm",
    title: "Contacts guide",
    purpose: "People linked to customers or leads for outreach.",
    dataFlow: "Contact belongs to a customer/lead → used in activities and tickets.",
    hrefs: ["/crm/contacts"],
    flows: [
      flow("crm.contacts.f", "Maintain contacts", "Always attach a contact before logging heavy activity.", [
        step("1", "Open customer or lead", "Ensure the parent account exists.", "/crm/customers", "Prep"),
        step("2", "Add contact", "Name, email, phone, role.", "/crm/contacts", "Create"),
        step("3", "Log activity", "Link the contact on calls and meetings.", "/crm/activities", "Use")
      ])
    ]
  },
  {
    id: "crm.deals",
    module: "crm",
    title: "Opportunities (deals) guide",
    purpose: "Track pipeline value and probability until the deal is won or lost.",
    dataFlow: "Deal stages update pipeline KPIs → Won deals unlock Sales quoting.",
    hrefs: ["/crm/deals"],
    flows: [
      flow("crm.deals.f", "Move a deal through stages", "Update probability as you progress.", [
        step("1", "Create opportunity", "Link customer, amount, close date.", "/crm/deals", "Create"),
        step("2", "Advance stages", "Prospecting → proposal → negotiation.", "/crm/deals", "Pipeline"),
        step("3", "Mark won / lost", "Won: raise quotation. Lost: keep for analytics.", "/sales/quotations", "Close")
      ])
    ]
  },
  {
    id: "crm.activities",
    module: "crm",
    title: "Activities guide",
    purpose: "Calls, emails, meetings, and tasks against leads, deals, or customers.",
    dataFlow: "Activity logs progress on the parent record and appear on open follow-ups.",
    hrefs: ["/crm/activities", "/crm/follow-ups"],
    flows: [
      flow("crm.act.f", "Log and close follow-ups", "Open activities drive the Follow-ups menu.", [
        step("1", "Create activity", "Pick type, related record, and due date.", "/crm/activities", "1st"),
        step("2", "Work from Follow-ups", "Clear overdue items daily.", "/crm/follow-ups", "2nd"),
        step("3", "Update parent status", "After a good call, qualify the lead or advance the deal.", "/crm/leads", "3rd")
      ])
    ]
  },
  {
    id: "crm.campaigns",
    module: "crm",
    title: "Campaigns guide",
    purpose: "Plan outreach batches tied to segments or channels.",
    dataFlow: "Campaign → leads / activities attributed for CRM analytics.",
    hrefs: ["/crm/campaigns"],
    flows: [
      flow("crm.camp.f", "Run a simple campaign", "Keep one channel and one audience per campaign.", [
        step("1", "Define segment", "Customer groups or lead list.", "/crm/groups", "Audience"),
        step("2", "Create campaign", "Name, channel, dates, budget.", "/crm/campaigns", "Plan"),
        step("3", "Log responses", "New leads / activities with campaign source.", "/crm/leads", "Execute")
      ])
    ]
  },
  {
    id: "crm.tickets",
    module: "crm",
    title: "Tickets guide",
    purpose: "Post-sale support cases against a customer.",
    dataFlow: "Ticket → status workflow → closed for CRM service metrics.",
    hrefs: ["/crm/tickets"],
    flows: [
      flow("crm.tix.f", "Resolve a ticket", "Always link the customer.", [
        step("1", "Open ticket", "Subject, customer, priority.", "/crm/tickets", "Create"),
        step("2", "Work & update", "Add notes; change status.", "/crm/tickets", "Work"),
        step("3", "Close", "Resolve when the customer is satisfied.", "/crm/tickets", "Close")
      ])
    ]
  },

  /* ——— Sales ——— */
  {
    id: "sales.root",
    module: "sales",
    title: "Sales — how the module works",
    purpose: "Turn customers into quotes, orders, deliveries, invoices, and cash receipts.",
    dataFlow: "Quotation → Sales order → Delivery → Invoice → Customer receipt. Credit notes / RMA handle returns. Posts to Finance AR.",
    hrefs: ["/sales", "/sales/guide"],
    isModuleOverview: true,
    flows: [
      flow("sales.otc", "Order-to-cash (recommended)", "Do not invoice before the customer master and (ideally) a confirmed order exist.", [
        step("1", "Customer ready", "CRM customer with email and credit limit.", "/crm/customers", "1st"),
        step("2", "Quotation", "Price lines; send; get approval / accept.", "/sales/quotations", "2nd"),
        step("3", "Sales order", "Confirm order (watch credit hold).", "/sales/orders", "3rd"),
        step("4", "Dispatch", "Delivery note when goods leave warehouse.", "/sales/deliveries", "4th"),
        step("5", "Invoice", "Bill the customer; email template fires if configured.", "/sales/invoices", "5th"),
        step("6", "Receipt", "Record customer payment against the invoice.", "/sales/payments", "6th")
      ])
    ],
    tips: ["Price lists override list prices by customer group.", "Recycle bin restores trashed sales documents."]
  },
  {
    id: "sales.quotations",
    module: "sales",
    title: "Quotations guide",
    purpose: "Formal price offer before a sales order.",
    dataFlow: "Quote draft → sent / pending approval → accepted → convert to sales order.",
    hrefs: ["/sales/quotations"],
    flows: [
      flow("sales.q.f", "Quote to order", "Accept or approve before converting.", [
        step("1", "Create quotation", "Customer + product lines + validity.", "/sales/quotations", "Create"),
        step("2", "Approve / accept", "Internal approve then customer accept.", "/sales/quotations", "Approve"),
        step("3", "Convert to order", "Creates confirmed sales order.", "/sales/orders", "Convert")
      ])
    ]
  },
  {
    id: "sales.orders",
    module: "sales",
    title: "Sales orders guide",
    purpose: "Confirmed demand that drives dispatch and invoicing.",
    dataFlow: "Confirmed order → fulfill / delivery → invoice. Credit hold blocks fulfillment.",
    hrefs: ["/sales/orders"],
    flows: [
      flow("sales.so.f", "Confirm and fulfill", "Clear credit hold first if shown.", [
        step("1", "Create / confirm order", "Lines and warehouse.", "/sales/orders", "1st"),
        step("2", "Dispatch", "Delivery note depletes stock.", "/sales/deliveries", "2nd"),
        step("3", "Invoice", "Raise AR against the order / delivery.", "/sales/invoices", "3rd")
      ])
    ]
  },
  {
    id: "sales.deliveries",
    module: "sales",
    title: "Delivery notes guide",
    purpose: "Record physical dispatch of goods.",
    dataFlow: "Delivery reduces inventory and supports invoice quantities.",
    hrefs: ["/sales/deliveries"],
    flows: [
      flow("sales.dn.f", "Ship against an order", "Always pick the sales order when possible.", [
        step("1", "Open confirmed order", "Check stock availability.", "/sales/orders", "Prep"),
        step("2", "Create delivery", "Quantities and warehouse.", "/sales/deliveries", "Ship"),
        step("3", "Invoice shipped qty", "Bill what left the warehouse.", "/sales/invoices", "Bill")
      ])
    ]
  },
  {
    id: "sales.invoices",
    module: "sales",
    title: "Invoices guide",
    purpose: "Customer billing — creates accounts receivable.",
    dataFlow: "Invoice → ledger AR / revenue → balance due → payments reduce balance. Email template `invoice.generated` can notify the customer.",
    hrefs: ["/sales/invoices"],
    flows: [
      flow("sales.inv.f", "Bill and collect", "Prefer linking a sales order.", [
        step("1", "Create invoice", "Customer, lines, tax, due date.", "/sales/invoices", "Create"),
        step("2", "Send / confirm", "Customer receives document (and optional email).", "/sales/invoices", "Send"),
        step("3", "Record receipt", "Allocate payment to this invoice.", "/sales/payments", "Collect")
      ])
    ]
  },
  {
    id: "sales.payments",
    module: "sales",
    title: "Customer receipts guide",
    purpose: "Cash / bank received against invoices.",
    dataFlow: "Receipt reduces invoice balance_due and posts cash vs AR.",
    hrefs: ["/sales/payments"],
    flows: [
      flow("sales.pay.f", "Apply a receipt", "Never over-allocate beyond balance due.", [
        step("1", "Find open invoice", "Note balance due.", "/sales/invoices", "Find"),
        step("2", "Record payment", "Amount, method, date.", "/sales/payments", "Post"),
        step("3", "Verify status", "Invoice moves to paid / partially paid.", "/sales/invoices", "Check")
      ])
    ]
  },
  {
    id: "sales.returns",
    module: "sales",
    title: "Returns (RMA) & credit notes",
    purpose: "Authorize returns and credit the customer.",
    dataFlow: "RMA → stock return → credit note reduces AR.",
    hrefs: ["/sales/returns", "/sales/credit-notes"],
    flows: [
      flow("sales.rma.f", "Return and credit", "Credit note should reference the original invoice.", [
        step("1", "Open RMA", "Customer, invoice, reason.", "/sales/returns", "RMA"),
        step("2", "Receive stock", "Inventory adjustment / receipt as needed.", "/inventory/movements", "Stock"),
        step("3", "Issue credit note", "Reduce what the customer owes.", "/sales/credit-notes", "Credit")
      ])
    ]
  },

  /* ——— Purchases ——— */
  {
    id: "purchases.root",
    module: "purchases",
    title: "Procurement — how the module works",
    purpose: "Buy goods/services from suppliers with controlled spend and stock receipts.",
    dataFlow: "Requisition → RFQ → Purchase order → GRN → Supplier bill → Supplier payment. Debit notes for returns.",
    hrefs: ["/purchases", "/purchases/guide"],
    isModuleOverview: true,
    flows: [
      flow("pur.ptp", "Procure-to-pay", "Do not pay a bill without a PO / GRN trail when stock is involved.", [
        step("1", "Register supplier", "Contact and payment terms.", "/purchases/suppliers", "1st"),
        step("2", "Requisition", "Internal need request.", "/purchases/requisitions", "2nd"),
        step("3", "RFQ (optional)", "Compare supplier quotes.", "/purchases/rfq", "3rd"),
        step("4", "Purchase order", "Commit spend to a supplier.", "/purchases/orders", "4th"),
        step("5", "Goods receipt (GRN)", "Stock increases; match quantities.", "/purchases/receipts", "5th"),
        step("6", "Supplier invoice", "Book AP liability.", "/purchases/bills", "6th"),
        step("7", "Pay supplier", "Clear AP.", "/purchases/payments", "7th")
      ])
    ]
  },
  {
    id: "purchases.suppliers",
    module: "purchases",
    title: "Suppliers guide",
    purpose: "Vendor master for POs, GRNs, and bills.",
    dataFlow: "Supplier → PO / bill references → AP and payments.",
    hrefs: ["/purchases/suppliers"],
    flows: [
      flow("pur.sup.f", "Onboard a supplier", "Complete before first PO.", [
        step("1", "Create supplier", "Name, email, tax id.", "/purchases/suppliers", "Create"),
        step("2", "Raise PO", "Buy against this vendor.", "/purchases/orders", "Buy"),
        step("3", "Receive & bill", "GRN then supplier invoice.", "/purchases/receipts", "Close")
      ])
    ]
  },
  {
    id: "purchases.orders",
    module: "purchases",
    title: "Purchase orders guide",
    purpose: "Formal buy commitment to a supplier.",
    dataFlow: "PO → GRN matches lines → bill matches PO/GRN.",
    hrefs: ["/purchases/orders"],
    flows: [
      flow("pur.po.f", "PO to receipt", "Keep line items aligned with products.", [
        step("1", "Create PO", "Supplier + lines + dates.", "/purchases/orders", "Create"),
        step("2", "Receive GRN", "Confirm quantities arrived.", "/purchases/receipts", "Receive"),
        step("3", "Enter bill", "Match invoice to PO.", "/purchases/bills", "Bill")
      ])
    ]
  },
  {
    id: "purchases.receipts",
    module: "purchases",
    title: "Goods receipt (GRN) guide",
    purpose: "Confirm physical receipt into a warehouse.",
    dataFlow: "GRN increases inventory and supports 3-way match with PO and bill.",
    hrefs: ["/purchases/receipts"],
    flows: [
      flow("pur.grn.f", "Receive against PO", "Short receipts stay visible for follow-up.", [
        step("1", "Open PO", "Know expected quantities.", "/purchases/orders", "Prep"),
        step("2", "Post GRN", "Warehouse and received qty.", "/purchases/receipts", "Post"),
        step("3", "Check stock", "Inventory products / movements.", "/inventory/products", "Verify")
      ])
    ]
  },
  {
    id: "purchases.bills",
    module: "purchases",
    title: "Supplier invoices (bills) guide",
    purpose: "Accounts payable from suppliers.",
    dataFlow: "Bill → AP ledger → supplier payment clears balance.",
    hrefs: ["/purchases/bills", "/purchases/payments"],
    flows: [
      flow("pur.bill.f", "Book and pay AP", "Match to PO/GRN when stock items.", [
        step("1", "Enter bill", "Supplier, amounts, due date.", "/purchases/bills", "Enter"),
        step("2", "Approve / post", "Confirm liability.", "/purchases/bills", "Post"),
        step("3", "Pay", "Supplier payment allocation.", "/purchases/payments", "Pay")
      ])
    ]
  },

  /* ——— Inventory ——— */
  {
    id: "inventory.root",
    module: "inventory",
    title: "Inventory — how the module works",
    purpose: "Products, warehouses, and stock quantity control for Sales and Purchases.",
    dataFlow: "Product + warehouse → GRN / delivery / transfer / adjustment movements → on-hand qty and valuation.",
    hrefs: ["/inventory", "/inventory/guide"],
    isModuleOverview: true,
    flows: [
      flow("inv.setup", "Stock setup then movements", "Never sell or buy stock SKUs before products and warehouses exist.", [
        step("1", "Categories & UOM", "Structure the catalog.", "/inventory/categories", "1st"),
        step("2", "Warehouses / bins", "Where stock lives.", "/inventory/warehouses", "2nd"),
        step("3", "Products", "SKU, cost, reorder level.", "/inventory/products", "3rd"),
        step("4", "Receive stock", "Purchasing GRN or opening adjustment.", "/purchases/receipts", "4th"),
        step("5", "Issue stock", "Sales delivery or transfer.", "/sales/deliveries", "5th"),
        step("6", "Monitor", "Low stock alerts and reports.", "/inventory/low-stock", "6th")
      ])
    ]
  },
  {
    id: "inventory.products",
    module: "inventory",
    title: "Products guide",
    purpose: "SKU master used on sales and purchase lines.",
    dataFlow: "Product → document lines → stock movements update qty.",
    hrefs: ["/inventory/products"],
    flows: [
      flow("inv.prod.f", "Add a sellable / buyable item", "Set cost and reorder point early.", [
        step("1", "Create product", "Code, name, UOM, cost/price.", "/inventory/products", "Create"),
        step("2", "Assign warehouse stock", "Opening qty via adjustment or GRN.", "/inventory/adjustments", "Stock"),
        step("3", "Use on documents", "Quotes, POs, invoices.", "/sales/quotations", "Use")
      ])
    ]
  },
  {
    id: "inventory.movements",
    module: "inventory",
    title: "Stock movements guide",
    purpose: "Audit trail of every qty change.",
    dataFlow: "Source document (GRN, delivery, transfer, adjustment) → movement row → on-hand.",
    hrefs: ["/inventory/movements", "/inventory/transfers", "/inventory/adjustments"],
    flows: [
      flow("inv.mov.f", "Correct stock safely", "Prefer document-driven moves over blind adjustments.", [
        step("1", "Identify cause", "Missing GRN vs wrong delivery.", "/inventory/movements", "Review"),
        step("2", "Transfer or adjust", "Transfer between warehouses; adjust with reason.", "/inventory/transfers", "Fix"),
        step("3", "Re-check low stock", "Alerts refresh from on-hand.", "/inventory/low-stock", "Check")
      ])
    ]
  },

  /* ——— Operations ——— */
  {
    id: "operations.root",
    module: "operations",
    title: "Operations — how the module works",
    purpose: "Manufacturing BOMs/work orders plus maintenance, fleet, quality, and contracts.",
    dataFlow: "BOM → work order consumes / produces stock. Maintenance / inspections are operational logs. Contracts are commercial records.",
    hrefs: ["/operations", "/operations/guide"],
    isModuleOverview: true,
    flows: [
      flow("ops.mfg", "Make-to-stock / make-to-order", "Define BOM before releasing work orders.", [
        step("1", "Bill of materials", "Components per finished good.", "/operations/bom", "1st"),
        step("2", "Work order", "Quantity and schedule.", "/operations/work-orders", "2nd"),
        step("3", "Issue components", "Stock moves from warehouse.", "/inventory/movements", "3rd"),
        step("4", "Complete WO", "Finished goods increase stock.", "/operations/work-orders", "4th"),
        step("5", "Quality check", "Inspection against the output.", "/operations/inspections", "5th")
      ]),
      flow("ops.maint", "Asset care loop", "Fleet and warranty sit beside maintenance orders.", [
        step("1", "Log maintenance order", "Asset / vehicle and due date.", "/operations/maintenance", "Plan"),
        step("2", "Execute & close", "Record work done.", "/operations/maintenance", "Do"),
        step("3", "Warranty if needed", "Claim against vendor warranty.", "/operations/warranties", "Claim")
      ])
    ]
  },

  /* ——— HRM ——— */
  {
    id: "hrm.root",
    module: "hrm",
    title: "HRM — how the module works",
    purpose: "Hire, organize, attend, leave, pay, and develop people.",
    dataFlow: "Org setup → employee → attendance/leave → payroll & benefits. Forms/surveys assign to employees and can email them.",
    hrefs: ["/hrm", "/hrm/guide"],
    isModuleOverview: true,
    flows: [
      flow("hrm.setup", "Foundation (do this first)", "Employees need departments, jobs, and pay structures.", [
        step("1", "Company & org", "Company profile, locations, cost centers.", "/hrm/company", "1st"),
        step("2", "Departments & jobs", "Structure reporting lines.", "/hrm/departments", "2nd"),
        step("3", "Pay grades / benefits", "Compensation framework.", "/hrm/pay-grades", "3rd"),
        step("4", "Create employees", "Link dept, manager, salary.", "/hrm/employees", "4th"),
        step("5", "Shifts & holidays", "Attendance calendar.", "/hrm/shifts", "5th")
      ]),
      flow("hrm.hire", "Hire-to-pay", "From requisition to first payroll.", [
        step("1", "Requisition", "Open headcount need.", "/hrm/requisitions", "Req"),
        step("2", "Recruitment", "Candidates and stages.", "/hrm/recruitment", "Hire"),
        step("3", "Employee record", "Onboard to roster.", "/hrm/employees", "Onboard"),
        step("4", "Attendance / leave", "Time data for pay.", "/hrm/attendance", "Time"),
        step("5", "Run payroll", "Then disburse.", "/hrm/payroll", "Pay")
      ]),
      flow("hrm.leave", "Leave approval path", "Emails notify managers and employees when configured.", [
        step("1", "Employee submits leave", "Type, dates, reason.", "/hrm/leaves", "Submit"),
        step("2", "Manager / HR approve", "Both may be required.", "/hrm/leaves", "Approve"),
        step("3", "Attendance updated", "Leave days marked.", "/hrm/attendance", "Reflect")
      ])
    ],
    tips: ["Inbox holds Workday-style approvals.", "Custom forms: publish → assign → employee My forms."]
  },
  {
    id: "hrm.employees",
    module: "hrm",
    title: "Employees guide",
    purpose: "Core people master for attendance, leave, and payroll.",
    dataFlow: "Employee → leave/attendance/payroll items. Optional login via Administration invite.",
    hrefs: ["/hrm/employees"],
    flows: [
      flow("hrm.emp.f", "Add an employee correctly", "Fill org + pay fields before first payroll.", [
        step("1", "Create employee", "Name, email, dept, salary components.", "/hrm/employees", "Create"),
        step("2", "Assign position / manager", "Org chart and approvals.", "/hrm/positions", "Org"),
        step("3", "Invite login (optional)", "Administration → Users with credentials email.", "/settings/users", "Access")
      ])
    ]
  },
  {
    id: "hrm.leaves",
    module: "hrm",
    title: "Leave requests guide",
    purpose: "Request and approve time off.",
    dataFlow: "Submit → manager/HR status → approved updates attendance; email templates leave.* notify parties.",
    hrefs: ["/hrm/leaves"],
    flows: [
      flow("hrm.leave.f", "Submit → approve → reflect", "Check leave type balance first.", [
        step("1", "Choose leave type", "Annual, sick, etc.", "/hrm/leaves", "Type"),
        step("2", "Submit request", "Dates and reason.", "/hrm/leaves", "Submit"),
        step("3", "Approve or reject", "Manager then HR as configured.", "/hrm/leaves", "Decide"),
        step("4", "Confirm calendar", "Attendance / team views.", "/hrm/attendance", "Confirm")
      ])
    ]
  },
  {
    id: "hrm.payroll",
    module: "hrm",
    title: "Payroll guide",
    purpose: "Calculate and post period pay.",
    dataFlow: "Employee pay fields + attendance/leave → payroll run → items → disbursement / PF / EOBI.",
    hrefs: ["/hrm/payroll", "/hrm/payments", "/hrm/provident-fund", "/hrm/eobi"],
    flows: [
      flow("hrm.pay.f", "Close a pay period", "Lock attendance before running.", [
        step("1", "Verify employees & pay", "Salaries and enrollments.", "/hrm/employees", "Prep"),
        step("2", "Attendance complete", "No open gaps for the period.", "/hrm/attendance", "Time"),
        step("3", "Run payroll", "Generate items.", "/hrm/payroll", "Run"),
        step("4", "Disburse", "Salary payments / bank file process.", "/hrm/payments", "Pay")
      ])
    ]
  },
  {
    id: "hrm.forms",
    module: "hrm",
    title: "Custom forms / surveys guide",
    purpose: "Build HR paperwork and assign to staff.",
    dataFlow: "Design form → publish → assign employees → My forms submit → review. Email `survey.assigned` can notify.",
    hrefs: ["/hrm/forms", "/hrm/my-forms"],
    flows: [
      flow("hrm.form.f", "Publish and collect responses", "Only published forms can be sent.", [
        step("1", "Design form", "Fields and required flags.", "/hrm/forms", "Design"),
        step("2", "Publish", "Status must be published.", "/hrm/forms", "Publish"),
        step("3", "Assign", "One employee, department, or all.", "/hrm/forms", "Assign"),
        step("4", "Employee submits", "My forms.", "/hrm/my-forms", "Submit"),
        step("5", "Review", "HR reviews responses.", "/hrm/forms", "Review")
      ])
    ]
  },

  /* ——— Healthcare ——— */
  {
    id: "healthcare.root",
    module: "healthcare",
    title: "Healthcare (HMS) — how the module works",
    purpose: "Hospital front desk through clinical, diagnostics, pharmacy, payer, and quality.",
    dataFlow: "Patient → appointment / OPD or IPD admission → clinical notes & orders → pharmacy / claims → quality logs.",
    hrefs: ["/healthcare", "/healthcare/guide"],
    isModuleOverview: true,
    flows: [
      flow("hc.opd", "OPD visit path", "Register the patient before the visit.", [
        step("1", "Register patient", "Demographics and contacts.", "/healthcare/patients", "1st"),
        step("2", "Book appointment", "Doctor and slot.", "/healthcare/appointments", "2nd"),
        step("3", "OPD visit", "Chief complaint and encounter.", "/healthcare/opd", "3rd"),
        step("4", "Clinical orders", "Rx, lab, radiology as needed.", "/healthcare/prescriptions", "4th"),
        step("5", "Dispense / results", "Pharmacy and lab workflows.", "/healthcare/dispensing", "5th")
      ]),
      flow("hc.ipd", "IPD admission path", "Bed must be free before admit.", [
        step("1", "Wards & beds", "Capacity ready.", "/healthcare/wards", "Setup"),
        step("2", "Admit patient", "Ward/bed assignment.", "/healthcare/admissions", "Admit"),
        step("3", "Nursing & vitals", "Ongoing care chart.", "/healthcare/nursing", "Care"),
        step("4", "OT / EMR", "Procedures and notes.", "/healthcare/ot", "Clinical"),
        step("5", "Claims", "Insurance if applicable.", "/healthcare/claims", "Bill")
      ])
    ]
  },
  {
    id: "healthcare.patients",
    module: "healthcare",
    title: "Patients guide",
    purpose: "MPI — master patient index for all encounters.",
    dataFlow: "Patient → appointments, OPD, IPD, orders, claims.",
    hrefs: ["/healthcare/patients"],
    flows: [
      flow("hc.pat.f", "Register then schedule", "Avoid duplicate patients — search first.", [
        step("1", "Search existing", "Name / phone / MRN.", "/healthcare/patients", "Search"),
        step("2", "Register if new", "Required demographics.", "/healthcare/patients", "Register"),
        step("3", "Book or admit", "Appointment or IPD.", "/healthcare/appointments", "Next")
      ])
    ]
  },

  /* ——— Documents ——— */
  {
    id: "documents.root",
    module: "documents",
    title: "Documents — how the module works",
    purpose: "Controlled uploads, library, and assignments to users.",
    dataFlow: "Document types → required uploads / library files → assign to users → recycle bin for removed blobs.",
    hrefs: ["/documents", "/documents/library", "/documents/assign", "/documents/types", "/documents/guide"],
    isModuleOverview: true,
    flows: [
      flow("doc.flow", "Define types then collect files", "Types drive what users must upload.", [
        step("1", "Document types", "Categories and rules.", "/documents/types", "1st"),
        step("2", "Required uploads", "Track outstanding files.", "/documents", "2nd"),
        step("3", "Library", "Store reusable files.", "/documents/library", "3rd"),
        step("4", "Assign", "Push docs to specific users.", "/documents/assign", "4th")
      ])
    ]
  },

  /* ——— Finance ——— */
  {
    id: "finance.root",
    module: "finance",
    title: "Finance — how the module works",
    purpose: "Books of account: COA, journals, banks, tax, period close, and statements.",
    dataFlow: "Operational docs (invoices/bills) post ledger pairs → journals / reconciliation → reports & close.",
    hrefs: ["/finance", "/finance/guide"],
    isModuleOverview: true,
    flows: [
      flow("fin.setup", "Books setup then daily postings", "Chart of accounts before manual journals.", [
        step("1", "Chart of accounts", "Assets, liability, income, expense.", "/finance/accounts", "1st"),
        step("2", "Opening / journals", "Manual entries when needed.", "/finance/journals", "2nd"),
        step("3", "Bank & recon", "Match statements.", "/finance/reconciliation", "3rd"),
        step("4", "Tax & reports", "Returns and P&L / BS.", "/finance/taxes", "4th"),
        step("5", "Period close", "Lock the month when ready.", "/finance/periods", "5th")
      ])
    ]
  },

  /* ——— Projects ——— */
  {
    id: "projects.root",
    module: "projects",
    title: "Projects — how the module works",
    purpose: "Plan delivery work: projects, tasks, timesheets, and project reporting.",
    dataFlow: "Project → tasks / milestones → timesheets → project cost / progress reports.",
    hrefs: ["/projects", "/projects/guide"],
    isModuleOverview: true,
    flows: [
      flow("proj.flow", "Plan → track → report", "Create the project before tasks or time.", [
        step("1", "Create project", "Customer, dates, budget.", "/projects", "1st"),
        step("2", "Break down tasks", "Owners and due dates.", "/projects/tasks", "2nd"),
        step("3", "Log timesheets", "Effort against tasks.", "/projects/timesheets", "3rd"),
        step("4", "Review reports", "Burn and progress.", "/projects/reports", "4th")
      ])
    ]
  },

  /* ——— Reports ——— */
  {
    id: "reports.root",
    module: "reports",
    title: "Data warehouse / BI guide",
    purpose: "Cross-module KPIs and analytics snapshots.",
    dataFlow: "Reads CRM, Sales, Inventory, HR, Finance aggregates — does not create master data.",
    hrefs: ["/reports", "/reports/custom", "/reports/guide"],
    isModuleOverview: true,
    flows: [
      flow("bi.flow", "Use analytics after transactions exist", "Empty charts usually mean missing source docs.", [
        step("1", "Load operational data", "Sales, stock, HR as needed.", "/sales", "Data"),
        step("2", "Open executive KPIs", "Hub tiles and charts.", "/reports", "View"),
        step("3", "Jump to module analytics", "Open CRM / Sales / HR / Finance reports inside each module.", "/reports#modules", "Drill"),
        step("4", "Custom / snapshots", "Save views for leadership.", "/reports/custom", "Save")
      ])
    ]
  },

  /* ——— Settings / Administration ——— */
  {
    id: "settings.root",
    module: "settings",
    title: "Administration — how the module works",
    purpose: "Tenant, users, roles, menu rights, billing, content, email templates, and system defaults.",
    dataFlow: "Roles + ACL → what menus users see. Users get credentials email. Theme and packages affect the whole tenant.",
    hrefs: ["/settings", "/settings/guide"],
    isModuleOverview: true,
    flows: [
      flow("adm.start", "Secure the company workspace", "Do access control before inviting many users.", [
        step("1", "Company / tenant", "Profile and plan.", "/settings/tenants", "1st"),
        step("2", "Roles & access", "Module and menu rights.", "/settings/access", "2nd"),
        step("3", "Invite users", "Password + role; credentials email.", "/settings/users", "3rd"),
        step("4", "Email templates", "Shared Nodemailer templates.", "/settings/email-templates", "4th"),
        step("5", "System settings", "Prefixes, locale, security toggles.", "/settings/system", "5th")
      ])
    ],
    tips: ["Open Guides hub anytime from Administration → Process guides.", "Recycle bin restores soft-deleted admin entities."]
  },
  {
    id: "settings.users",
    module: "settings",
    title: "Users guide",
    purpose: "Invite people into the company with a role and optional login password.",
    dataFlow: "Invite → account + directory user → `user.credentials` email → sign-in.",
    hrefs: ["/settings/users"],
    flows: [
      flow("adm.users.f", "Invite safely", "Role cannot be Super Admin inside a tenant package.", [
        step("1", "Pick role", "Least privilege.", "/settings/roles", "Role"),
        step("2", "Invite user", "Name, email, temporary password.", "/settings/users", "Invite"),
        step("3", "Confirm email / login", "User signs in and changes password.", "/login", "Login"),
        step("4", "Tighten ACL if needed", "Per-user menu overrides.", "/settings/access", "ACL")
      ])
    ]
  },
  {
    id: "settings.email_templates",
    module: "settings",
    title: "Email templates guide",
    purpose: "Shared templates for invites, leave, invoices, orders, surveys.",
    dataFlow: "Edit template → modules call `/api/email/send` → Nodemailer/Gmail API.",
    hrefs: ["/settings/email-templates"],
    flows: [
      flow("adm.mail.f", "Configure then test", "Run email-api locally or point EMAIL_API_URL to Firebase.", [
        step("1", "Start email API", "Gmail app password or dry-run.", "/settings/email-templates", "API"),
        step("2", "Edit template", "Subject/HTML variables.", "/settings/email-templates", "Edit"),
        step("3", "Send test", "Use Test send on the page.", "/settings/email-templates", "Test"),
        step("4", "Trigger from modules", "Invite user, leave, invoice, etc.", "/settings/users", "Live")
      ])
    ]
  },
  {
    id: "settings.guides",
    module: "settings",
    title: "Process guides hub",
    purpose: "Central library of module and menu flow diagrams.",
    dataFlow: "Guides are documentation only — they link into live menus but do not change data.",
    hrefs: ["/guides", "/settings/guides"],
    flows: [
      flow("guides.use", "How to use guides", "Every menu also has a Guide button in the page header area.", [
        step("1", "Pick a module", "Start with the module overview flow.", "/guides", "Browse"),
        step("2", "Follow numbered steps", "First → second → third with short descriptions.", "/guides", "Learn"),
        step("3", "Open the live menu", "Use step links to jump into the screen.", "/guides", "Do"),
        step("4", "Use Guide on any page", "Same content opens in view mode from the Guide button.", "/guides", "Anywhere")
      ])
    ]
  }
];

const byId = new Map(guideCatalog.map((g) => [g.id, g]));

export function getGuideById(id: string) {
  return byId.get(id) ?? null;
}

export function listModuleOverviewGuides() {
  return guideCatalog.filter((g) => g.isModuleOverview);
}

export function listGuidesForModule(module: ModuleKey) {
  return guideCatalog.filter((g) => g.module === module);
}

/** Longest href prefix match for the current path. */
export function resolveGuideForPath(pathname: string): GuideDefinition | null {
  const path = (pathname.split("#")[0] || "/").replace(/\/$/, "") || "/";
  let best: GuideDefinition | null = null;
  let bestLen = -1;
  for (const guide of guideCatalog) {
    for (const href of guide.hrefs) {
      const base = href.replace(/\/$/, "") || "/";
      const match = path === base || path.startsWith(`${base}/`);
      if (!match) continue;
      if (base.length > bestLen) {
        best = guide;
        bestLen = base.length;
      }
    }
  }
  return best;
}

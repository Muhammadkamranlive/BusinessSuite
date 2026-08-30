import type { ModuleKey } from "@/lib/permissions";

export type Tenant = {
  id: string;
  name: string;
  industry: string;
  region: string;
  plan: string;
};

export const tenants: Tenant[] = [
  { id: "alpha", name: "Alpha Trading LLC", industry: "Wholesale distribution", region: "UAE", plan: "Demo Pro" },
  { id: "medix", name: "Medix Pharmacy Supplies", industry: "Healthcare supply", region: "Pakistan", plan: "Demo Growth" },
  { id: "autoparts", name: "AutoParts Distribution", industry: "Automotive parts", region: "Saudi Arabia", plan: "Demo Pro" },
  { id: "textile", name: "Textile Manufacturing Co.", industry: "Textile manufacturing", region: "Pakistan", plan: "Demo Enterprise" }
];

export const kpis = [
  { label: "Monthly revenue", value: 428000, change: 18, tone: "teal" },
  { label: "Open pipeline", value: 812000, change: 11, tone: "coral" },
  { label: "Inventory value", value: 1265000, change: -3, tone: "amber" },
  { label: "Payroll run", value: 176000, change: 4, tone: "mint" }
];

export const revenueByMonth = [
  { month: "Jan", revenue: 210000, expenses: 148000 },
  { month: "Feb", revenue: 240000, expenses: 151000 },
  { month: "Mar", revenue: 295000, expenses: 175000 },
  { month: "Apr", revenue: 318000, expenses: 188000 },
  { month: "May", revenue: 372000, expenses: 205000 },
  { month: "Jun", revenue: 428000, expenses: 226000 }
];

export const salesFunnel = [
  { stage: "Leads", count: 124, value: 940000 },
  { stage: "Qualified", count: 71, value: 702000 },
  { stage: "Proposal", count: 36, value: 481000 },
  { stage: "Negotiation", count: 18, value: 269000 },
  { stage: "Won", count: 11, value: 148000 }
];

export const leads = [
  { company: "Eastern Retail Group", owner: "Bilal Ahmed", source: "Referral", score: 91, status: "Qualified" },
  { company: "BlueLine Clinics", owner: "Hira Noor", source: "Website", score: 84, status: "Follow-up" },
  { company: "Makkah Auto Hub", owner: "Bilal Ahmed", source: "Campaign", score: 78, status: "New" },
  { company: "Urban Fashion Mills", owner: "Sara Iqbal", source: "LinkedIn", score: 73, status: "Proposal" }
];

export const deals = [
  { name: "Wholesale ERP rollout", customer: "Eastern Retail Group", stage: "Proposal", amount: 125000, probability: 62 },
  { name: "Pharmacy procurement portal", customer: "BlueLine Clinics", stage: "Negotiation", amount: 94000, probability: 71 },
  { name: "Fleet stock automation", customer: "Makkah Auto Hub", stage: "Qualified", amount: 78000, probability: 49 },
  { name: "Manufacturing HRM suite", customer: "Urban Fashion Mills", stage: "Won", amount: 148000, probability: 100 }
];

export const activities = [
  { time: "09:20", actor: "Bilal Ahmed", text: "Converted lead Eastern Retail Group to deal", module: "CRM" },
  { time: "10:15", actor: "Sana Malik", text: "Approved 4 leave requests for production shift", module: "HRM" },
  { time: "11:05", actor: "Nadia Raza", text: "Posted stock-in GRN for warehouse B", module: "Inventory" },
  { time: "12:40", actor: "Ayesha Khan", text: "Changed sales role permission for invoice export", module: "Admin" }
];

export const departments = [
  { name: "Sales", employees: 18, attendance: 94, openLeaves: 3 },
  { name: "Warehouse", employees: 26, attendance: 88, openLeaves: 5 },
  { name: "Finance", employees: 9, attendance: 96, openLeaves: 1 },
  { name: "HR", employees: 6, attendance: 100, openLeaves: 0 },
  { name: "Production", employees: 44, attendance: 91, openLeaves: 7 }
];

export const employees = [
  { name: "Sana Malik", department: "HR", status: "Present", checkIn: "08:52", payroll: 4200 },
  { name: "Bilal Ahmed", department: "Sales", status: "Present", checkIn: "09:05", payroll: 5100 },
  { name: "Nadia Raza", department: "Warehouse", status: "Late", checkIn: "09:34", payroll: 3900 },
  { name: "Hamza Shah", department: "Production", status: "Leave", checkIn: "-", payroll: 3100 },
  { name: "Mariam Ali", department: "Finance", status: "Present", checkIn: "08:48", payroll: 4700 }
];

export const attendanceTrend = [
  { day: "Mon", present: 96, late: 7, leave: 4 },
  { day: "Tue", present: 92, late: 11, leave: 5 },
  { day: "Wed", present: 99, late: 4, leave: 3 },
  { day: "Thu", present: 94, late: 9, leave: 6 },
  { day: "Fri", present: 88, late: 13, leave: 8 }
];

export const products = [
  { sku: "MED-GLV-001", name: "Nitrile Gloves Box", warehouse: "Main Warehouse", stock: 420, reorder: 180, supplier: "Prime Medical" },
  { sku: "AP-BRK-442", name: "Brake Pad Set", warehouse: "Jeddah DC", stock: 73, reorder: 90, supplier: "Gulf Motors" },
  { sku: "TXT-COT-89", name: "Cotton Roll 40kg", warehouse: "Factory Store", stock: 34, reorder: 60, supplier: "Karachi Cotton" },
  { sku: "OFF-PRN-110", name: "Thermal Receipt Printer", warehouse: "Main Warehouse", stock: 18, reorder: 25, supplier: "Orbit Tech" },
  { sku: "FOOD-PKG-21", name: "Food-grade cartons", warehouse: "Warehouse B", stock: 310, reorder: 140, supplier: "PackRight" }
];

export const stockMovements = [
  { date: "2026-06-28", ref: "GRN-1048", product: "Nitrile Gloves Box", type: "Stock In", qty: 240, warehouse: "Main Warehouse" },
  { date: "2026-06-28", ref: "SO-2081", product: "Brake Pad Set", type: "Stock Out", qty: 27, warehouse: "Jeddah DC" },
  { date: "2026-06-29", ref: "ADJ-0091", product: "Cotton Roll 40kg", type: "Adjustment", qty: -6, warehouse: "Factory Store" },
  { date: "2026-06-30", ref: "SO-2094", product: "Thermal Receipt Printer", type: "Stock Out", qty: 8, warehouse: "Main Warehouse" }
];

export const stockMovementChart = [
  { day: "Jun 24", in: 160, out: 104 },
  { day: "Jun 25", in: 92, out: 119 },
  { day: "Jun 26", in: 210, out: 131 },
  { day: "Jun 27", in: 74, out: 88 },
  { day: "Jun 28", in: 240, out: 147 },
  { day: "Jun 29", in: 64, out: 121 },
  { day: "Jun 30", in: 118, out: 96 }
];

export const invoices = [
  { no: "INV-2026-184", customer: "Eastern Retail Group", status: "Paid", amount: 48200, due: "2026-07-08" },
  { no: "INV-2026-185", customer: "BlueLine Clinics", status: "Partially Paid", amount: 31800, due: "2026-07-12" },
  { no: "INV-2026-186", customer: "Makkah Auto Hub", status: "Unpaid", amount: 22450, due: "2026-07-16" },
  { no: "INV-2026-187", customer: "Urban Fashion Mills", status: "Draft", amount: 59200, due: "2026-07-22" }
];

export const invoiceItems = [
  { item: "ERP implementation sprint", qty: 1, price: 18000 },
  { item: "Inventory module license", qty: 12, price: 850 },
  { item: "User onboarding pack", qty: 25, price: 120 },
  { item: "Priority support", qty: 1, price: 3800 }
];

export const purchaseOrders = [
  { no: "PO-6214", supplier: "Prime Medical", status: "Approved", amount: 27600, eta: "2026-07-04" },
  { no: "PO-6215", supplier: "Gulf Motors", status: "Pending Approval", amount: 19400, eta: "2026-07-09" },
  { no: "PO-6216", supplier: "Karachi Cotton", status: "Received", amount: 33800, eta: "2026-06-29" },
  { no: "PO-6217", supplier: "Orbit Tech", status: "Draft", amount: 9100, eta: "2026-07-13" }
];

export const reportSnapshots = [
  { title: "Sales dashboard", owner: "Omar Farooq", format: "PDF", generated: "2026-06-30 09:00" },
  { title: "HR analytics", owner: "Sana Malik", format: "CSV", generated: "2026-06-30 10:30" },
  { title: "Stock movement", owner: "Nadia Raza", format: "CSV", generated: "2026-06-30 11:15" },
  { title: "Revenue by month", owner: "Finance", format: "PDF", generated: "2026-06-30 12:00" }
];

export const auditLogs: Array<{ time: string; actor: string; module: ModuleKey; action: string; severity: "Info" | "Warning" | "Critical" }> = [
  { time: "2026-06-30 12:40", actor: "Ayesha Khan", module: "settings", action: "Updated role permission: Sales can export invoices", severity: "Info" },
  { time: "2026-06-30 11:05", actor: "Nadia Raza", module: "inventory", action: "Posted stock-in movement GRN-1048", severity: "Info" },
  { time: "2026-06-30 10:15", actor: "Sana Malik", module: "hrm", action: "Approved leave request LR-3321", severity: "Info" },
  { time: "2026-06-30 09:58", actor: "Omar Farooq", module: "sales", action: "Changed invoice INV-2026-185 payment status", severity: "Warning" },
  { time: "2026-06-29 17:20", actor: "System", module: "settings", action: "Failed login attempt for unknown account", severity: "Critical" }
];

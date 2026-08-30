import { getSupabaseAdminClient, hasSecretKey } from "@/lib/supabase/server";
import { toDbTenantId, toUiTenantId } from "@/lib/tenants/ids";

export type OpsRemoteSnapshot = {
  version: number;
  sequences: Record<string, unknown>[];
  leads: Record<string, unknown>[];
  customers: Record<string, unknown>[];
  deals: Record<string, unknown>[];
  contacts: Record<string, unknown>[];
  activities: Record<string, unknown>[];
  campaigns: Record<string, unknown>[];
  tickets: Record<string, unknown>[];
  customerGroups: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  quotations: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  salesOrders: Record<string, unknown>[];
  salesReturns: Record<string, unknown>[];
  deliveryNotes: Record<string, unknown>[];
  creditNotes: Record<string, unknown>[];
  debitNotes: Record<string, unknown>[];
  salespeople: Record<string, unknown>[];
  priceLists: Record<string, unknown>[];
  priceListItems: Record<string, unknown>[];
  discountSchemes: Record<string, unknown>[];
  suppliers: Record<string, unknown>[];
  purchaseOrders: Record<string, unknown>[];
  goodsReceipts: Record<string, unknown>[];
  vendorBills: Record<string, unknown>[];
  vendorPayments: Record<string, unknown>[];
  requisitions: Record<string, unknown>[];
  rfqs: Record<string, unknown>[];
  vendorQuotes: Record<string, unknown>[];
  matchTolerances: Record<string, unknown>[];
  products: Record<string, unknown>[];
  warehouses: Record<string, unknown>[];
  stockMovements: Record<string, unknown>[];
  stockBalances: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  transfers: Record<string, unknown>[];
  adjustments: Record<string, unknown>[];
  accounts: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  income: Record<string, unknown>[];
  journals: Record<string, unknown>[];
  taxes: Record<string, unknown>[];
  approvals: Record<string, unknown>[];
  projects: Record<string, unknown>[];
  projectTasks: Record<string, unknown>[];
  projectTimesheets: Record<string, unknown>[];
  catalogRecords: Record<string, unknown>[];
};

type TableMap = {
  key: keyof OpsRemoteSnapshot;
  table: string;
  onConflict?: string;
  omit?: string[];
};

const TABLES: TableMap[] = [
  { key: "sequences", table: "document_sequences", onConflict: "tenant_id,module_code" },
  { key: "customerGroups", table: "customer_groups" },
  { key: "leads", table: "leads", omit: ["created_by", "updated_by", "assigned_to"] },
  { key: "customers", table: "customers", omit: ["created_by", "updated_by"] },
  { key: "deals", table: "deals", omit: ["created_by", "updated_by", "assigned_to"] },
  { key: "contacts", table: "crm_contacts" },
  { key: "activities", table: "crm_activities", omit: ["assigned_to"] },
  { key: "campaigns", table: "crm_campaigns" },
  { key: "tickets", table: "crm_tickets" },
  { key: "salespeople", table: "salespeople" },
  { key: "priceLists", table: "price_lists" },
  { key: "priceListItems", table: "price_list_items" },
  { key: "discountSchemes", table: "discount_schemes" },
  { key: "products", table: "products" },
  { key: "warehouses", table: "warehouses" },
  { key: "categories", table: "product_categories" },
  { key: "stockBalances", table: "stock_balances", onConflict: "tenant_id,product_id,warehouse_id" },
  { key: "stockMovements", table: "stock_movements", omit: ["created_by"] },
  { key: "transfers", table: "stock_transfers" },
  { key: "adjustments", table: "stock_adjustments" },
  { key: "quotations", table: "quotations", omit: ["created_by"] },
  { key: "salesOrders", table: "sales_orders" },
  { key: "invoices", table: "invoices", omit: ["created_by"] },
  { key: "payments", table: "payments_received", omit: ["created_by"] },
  { key: "deliveryNotes", table: "delivery_notes" },
  { key: "salesReturns", table: "sales_returns" },
  { key: "creditNotes", table: "credit_notes" },
  { key: "debitNotes", table: "debit_notes" },
  { key: "suppliers", table: "suppliers", omit: ["created_by"] },
  { key: "requisitions", table: "purchase_requisitions" },
  { key: "rfqs", table: "purchase_rfqs" },
  { key: "vendorQuotes", table: "vendor_quotes" },
  { key: "purchaseOrders", table: "purchase_orders", omit: ["created_by"] },
  { key: "goodsReceipts", table: "goods_receipts" },
  { key: "vendorBills", table: "vendor_bills" },
  { key: "vendorPayments", table: "vendor_payments" },
  { key: "matchTolerances", table: "match_tolerances", onConflict: "tenant_id" },
  { key: "accounts", table: "chart_of_accounts" },
  { key: "expenses", table: "expenses", omit: ["created_by", "account_id"] },
  { key: "income", table: "income_entries" },
  { key: "journals", table: "journal_entries" },
  { key: "taxes", table: "tax_rates" },
  { key: "approvals", table: "ops_approvals" },
  { key: "projects", table: "projects", omit: ["customer_id"] },
  { key: "projectTasks", table: "project_tasks" },
  { key: "projectTimesheets", table: "project_timesheets" },
  { key: "catalogRecords", table: "catalog_records" }
];

function remapTenantId(row: Record<string, unknown>, toDb: boolean) {
  const next = { ...row };
  if (typeof next.tenant_id === "string") {
    next.tenant_id = toDb ? toDbTenantId(next.tenant_id) : toUiTenantId(next.tenant_id);
  }
  return next;
}

function prepareRows(rows: Record<string, unknown>[] | undefined, map: TableMap, toDb: boolean) {
  if (!rows?.length) return [];
  return rows.map((row) => {
    const next = remapTenantId(row, toDb);
    if (map.omit) {
      for (const key of map.omit) delete next[key];
    }
    if (toDb && map.table === "stock_balances" && !next.id) {
      next.id = crypto.randomUUID();
    }
    if (toDb && map.table === "match_tolerances" && !next.id) {
      next.id = crypto.randomUUID();
    }
    return next;
  });
}

export function isOpsSupabaseEnabled() {
  return hasSecretKey() && process.env.NEXT_PUBLIC_OPS_USE_SUPABASE !== "false";
}

function emptySnapshot(): OpsRemoteSnapshot {
  return {
    version: 3,
    sequences: [],
    leads: [],
    customers: [],
    deals: [],
    contacts: [],
    activities: [],
    campaigns: [],
    tickets: [],
    customerGroups: [],
    invoices: [],
    quotations: [],
    payments: [],
    salesOrders: [],
    salesReturns: [],
    deliveryNotes: [],
    creditNotes: [],
    debitNotes: [],
    salespeople: [],
    priceLists: [],
    priceListItems: [],
    discountSchemes: [],
    suppliers: [],
    purchaseOrders: [],
    goodsReceipts: [],
    vendorBills: [],
    vendorPayments: [],
    requisitions: [],
    rfqs: [],
    vendorQuotes: [],
    matchTolerances: [],
    products: [],
    warehouses: [],
    stockMovements: [],
    stockBalances: [],
    categories: [],
    transfers: [],
    adjustments: [],
    accounts: [],
    expenses: [],
    income: [],
    journals: [],
    taxes: [],
    approvals: [],
    projects: [],
    projectTasks: [],
    projectTimesheets: [],
    catalogRecords: []
  };
}

export async function pushOpsSnapshot(snapshot: OpsRemoteSnapshot) {
  if (!isOpsSupabaseEnabled()) {
    return { ok: false as const, reason: "Supabase secret key missing or ops sync disabled" };
  }

  const admin = getSupabaseAdminClient();
  const errors: string[] = [];

  for (const map of TABLES) {
    const rows = prepareRows(snapshot[map.key] as Record<string, unknown>[], map, true);
    if (!rows.length) continue;
    const { error } = await admin.from(map.table).upsert(rows, { onConflict: map.onConflict ?? "id" });
    if (error) errors.push(`${map.table}: ${error.message}`);
  }

  return { ok: errors.length === 0, errors };
}

export async function pullOpsSnapshot(uiTenantId?: string): Promise<{
  ok: boolean;
  snapshot?: OpsRemoteSnapshot;
  reason?: string;
  errors?: string[];
}> {
  if (!isOpsSupabaseEnabled()) {
    return { ok: false, reason: "Supabase secret key missing or ops sync disabled" };
  }

  const admin = getSupabaseAdminClient();
  const dbTenant = uiTenantId ? toDbTenantId(uiTenantId) : null;
  const errors: string[] = [];
  const snapshot = emptySnapshot();

  await Promise.all(
    TABLES.map(async (map) => {
      let query = admin.from(map.table).select("*");
      if (dbTenant) query = query.eq("tenant_id", dbTenant);
      const { data, error } = await query;
      if (error) {
        errors.push(`${map.table}: ${error.message}`);
        return;
      }
      snapshot[map.key] = prepareRows((data ?? []) as Record<string, unknown>[], map, false) as never;
    })
  );

  return { ok: true, snapshot, errors: errors.length ? errors : undefined };
}

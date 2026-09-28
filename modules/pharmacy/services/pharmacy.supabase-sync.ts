import { getSupabaseAdminClient, hasSecretKey } from "@/lib/supabase/server";
import { toDbTenantId, toUiTenantId } from "@/lib/tenants/ids";
import type {
  PharmacyBatch,
  PharmacyCustomer,
  PharmacyProduct,
  PharmacySale,
  PharmacySaleLine
} from "@/modules/pharmacy/services/pharmacy.store";

export type PharmacyRemoteSnapshot = {
  version: number;
  tenantId?: string;
  products: PharmacyProduct[];
  batches: PharmacyBatch[];
  customers: PharmacyCustomer[];
  sales: PharmacySale[];
};

function remap(row: Record<string, unknown>, toDb: boolean) {
  const next = { ...row };
  if (typeof next.tenant_id === "string") {
    next.tenant_id = toDb ? toDbTenantId(next.tenant_id) : toUiTenantId(next.tenant_id);
  }
  return next;
}

function num(v: unknown, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function str(v: unknown, d = "") {
  return v == null ? d : String(v);
}

function entityBase(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at ?? r.created_at),
    is_active: r.is_active !== false
  };
}

export function isPharmacySupabaseSyncEnabled() {
  return (
    hasSecretKey() &&
    process.env.NEXT_PUBLIC_PHARMACY_USE_SUPABASE !== "false" &&
    process.env.NEXT_PUBLIC_HMS_USE_SUPABASE !== "false"
  );
}

async function upsert(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  table: string,
  rows: Record<string, unknown>[],
  errors: string[]
) {
  if (!rows.length) return;
  const { error } = await admin.from(table).upsert(rows, { onConflict: "id" });
  if (error) errors.push(`${table}: ${error.message}`);
}

function productToDb(p: PharmacyProduct) {
  return remap(
    {
      id: p.id,
      tenant_id: p.tenant_id,
      sku: p.sku,
      barcode: p.barcode ?? "",
      name: p.name,
      generic_name: p.generic_name ?? "",
      strength: p.strength ?? "",
      pack_size: p.pack_size ?? "",
      category: p.category,
      unit: p.unit,
      cost_price: p.cost_price,
      sale_price: p.sale_price,
      reorder_level: p.reorder_level,
      requires_rx: p.requires_rx,
      created_at: p.created_at,
      updated_at: p.updated_at,
      is_active: p.is_active !== false
    },
    true
  );
}

function productFromDb(row: Record<string, unknown>): PharmacyProduct {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    sku: str(r.sku),
    barcode: str(r.barcode),
    name: str(r.name),
    generic_name: str(r.generic_name),
    strength: str(r.strength),
    pack_size: str(r.pack_size),
    category: (str(r.category, "medicine") as PharmacyProduct["category"]) || "medicine",
    unit: str(r.unit, "pack"),
    cost_price: num(r.cost_price),
    sale_price: num(r.sale_price),
    reorder_level: num(r.reorder_level),
    requires_rx: Boolean(r.requires_rx)
  };
}

function batchToDb(b: PharmacyBatch) {
  return remap(
    {
      id: b.id,
      tenant_id: b.tenant_id,
      product_id: b.product_id,
      batch_no: b.batch_no,
      expiry_date: b.expiry_date,
      quantity: b.quantity,
      location: b.location ?? "",
      created_at: b.created_at,
      updated_at: b.updated_at,
      is_active: b.is_active !== false
    },
    true
  );
}

function batchFromDb(row: Record<string, unknown>): PharmacyBatch {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    product_id: str(r.product_id),
    batch_no: str(r.batch_no),
    expiry_date: str(r.expiry_date).slice(0, 10),
    quantity: num(r.quantity),
    location: str(r.location)
  };
}

function customerToDb(c: PharmacyCustomer) {
  return remap(
    {
      id: c.id,
      tenant_id: c.tenant_id,
      code: c.code,
      name: c.name,
      phone: c.phone ?? "",
      national_id: c.national_id ?? "",
      address: c.address ?? "",
      notes: c.notes ?? "",
      created_at: c.created_at,
      updated_at: c.updated_at,
      is_active: c.is_active !== false
    },
    true
  );
}

function customerFromDb(row: Record<string, unknown>): PharmacyCustomer {
  const r = remap(row, false);
  return {
    ...entityBase(r),
    code: str(r.code),
    name: str(r.name),
    phone: str(r.phone),
    national_id: str(r.national_id),
    address: str(r.address),
    notes: str(r.notes)
  };
}

function saleToDb(s: PharmacySale) {
  return remap(
    {
      id: s.id,
      tenant_id: s.tenant_id,
      sale_no: s.sale_no,
      customer_id: s.customer_id ?? null,
      customer_name: s.customer_name,
      customer_phone: s.customer_phone ?? "",
      customer_national_id: s.customer_national_id ?? "",
      lines: s.lines ?? [],
      subtotal: s.subtotal,
      discount: s.discount,
      total: s.total,
      tender: s.tender,
      amount_paid: s.amount_paid,
      change_due: s.change_due,
      cashier: s.cashier ?? "",
      sold_at: s.sold_at,
      created_at: s.created_at,
      updated_at: s.updated_at,
      is_active: s.is_active !== false
    },
    true
  );
}

function saleFromDb(row: Record<string, unknown>): PharmacySale {
  const r = remap(row, false);
  const lines = Array.isArray(r.lines) ? (r.lines as PharmacySaleLine[]) : [];
  return {
    ...entityBase(r),
    sale_no: str(r.sale_no),
    customer_id: r.customer_id ? str(r.customer_id) : null,
    customer_name: str(r.customer_name, "Walk-in"),
    customer_phone: str(r.customer_phone),
    customer_national_id: str(r.customer_national_id),
    lines,
    subtotal: num(r.subtotal),
    discount: num(r.discount),
    total: num(r.total),
    tender: (str(r.tender, "cash") as PharmacySale["tender"]) || "cash",
    amount_paid: num(r.amount_paid),
    change_due: num(r.change_due),
    cashier: str(r.cashier),
    sold_at: str(r.sold_at)
  };
}

export async function pushPharmacySnapshot(snapshot: PharmacyRemoteSnapshot) {
  if (!isPharmacySupabaseSyncEnabled()) {
    return { ok: false as const, reason: "Supabase secret missing or pharmacy sync disabled" };
  }
  const admin = getSupabaseAdminClient();
  const errors: string[] = [];

  // Products before batches (FK)
  await upsert(admin, "alif_pharmacy_products", snapshot.products.map(productToDb), errors);
  await upsert(admin, "alif_pharmacy_batches", snapshot.batches.map(batchToDb), errors);
  await upsert(admin, "alif_pharmacy_customers", snapshot.customers.map(customerToDb), errors);
  await upsert(admin, "alif_pharmacy_sales", snapshot.sales.map(saleToDb), errors);

  return { ok: errors.length === 0, errors };
}

export async function pullPharmacySnapshot(uiTenantId?: string): Promise<{
  ok: boolean;
  snapshot?: PharmacyRemoteSnapshot;
  reason?: string;
  errors?: string[];
}> {
  if (!isPharmacySupabaseSyncEnabled()) {
    return { ok: false, reason: "Supabase secret missing or pharmacy sync disabled" };
  }

  const admin = getSupabaseAdminClient();
  const dbTenant = uiTenantId ? toDbTenantId(uiTenantId) : null;
  const errors: string[] = [];

  let productsQ = admin.from("alif_pharmacy_products").select("*");
  let batchesQ = admin.from("alif_pharmacy_batches").select("*");
  let customersQ = admin.from("alif_pharmacy_customers").select("*");
  let salesQ = admin.from("alif_pharmacy_sales").select("*").order("sold_at", { ascending: false }).limit(2000);

  if (dbTenant) {
    productsQ = productsQ.eq("tenant_id", dbTenant);
    batchesQ = batchesQ.eq("tenant_id", dbTenant);
    customersQ = customersQ.eq("tenant_id", dbTenant);
    salesQ = salesQ.eq("tenant_id", dbTenant);
  }

  const [productsRes, batchesRes, customersRes, salesRes] = await Promise.all([
    productsQ,
    batchesQ,
    customersQ,
    salesQ
  ]);

  if (productsRes.error) errors.push(`alif_pharmacy_products: ${productsRes.error.message}`);
  if (batchesRes.error) errors.push(`alif_pharmacy_batches: ${batchesRes.error.message}`);
  if (customersRes.error) errors.push(`alif_pharmacy_customers: ${customersRes.error.message}`);
  if (salesRes.error) errors.push(`alif_pharmacy_sales: ${salesRes.error.message}`);

  const snapshot: PharmacyRemoteSnapshot = {
    version: 1,
    tenantId: uiTenantId,
    products: (productsRes.data ?? []).map((r) => productFromDb(r as Record<string, unknown>)),
    batches: (batchesRes.data ?? []).map((r) => batchFromDb(r as Record<string, unknown>)),
    customers: (customersRes.data ?? []).map((r) => customerFromDb(r as Record<string, unknown>)),
    sales: (salesRes.data ?? []).map((r) => saleFromDb(r as Record<string, unknown>))
  };

  return {
    ok: errors.length === 0 || snapshot.products.length > 0 || snapshot.sales.length > 0,
    snapshot,
    errors: errors.length ? errors : undefined
  };
}

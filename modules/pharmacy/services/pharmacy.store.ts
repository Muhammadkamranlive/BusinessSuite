import type { TenantEntity, UUID } from "@/modules/core/types";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";
import { DEMO_TENANT_IDS, isDemoTenant } from "@/lib/demo-tenants";
import type { PharmacyRemoteSnapshot } from "@/modules/pharmacy/services/pharmacy.supabase-sync";

function now() {
  return new Date().toISOString();
}
function id() {
  return crypto.randomUUID();
}

const STORAGE_KEY = "businesssuite:alif-pharmacy:v1";
const STORAGE_VERSION = 1;

export type PharmacyProduct = TenantEntity & {
  sku: string;
  barcode: string;
  name: string;
  generic_name: string;
  strength: string;
  pack_size: string;
  category: "medicine" | "otc" | "surgical" | "other";
  unit: string;
  cost_price: number;
  sale_price: number;
  reorder_level: number;
  requires_rx: boolean;
};

export type PharmacyBatch = TenantEntity & {
  product_id: UUID;
  batch_no: string;
  expiry_date: string;
  quantity: number;
  location: string;
};

export type PharmacyCustomer = TenantEntity & {
  code: string;
  name: string;
  phone: string;
  national_id: string;
  address: string;
  notes: string;
};

export type PharmacySaleLine = {
  product_id: UUID;
  batch_id: UUID;
  sku: string;
  name: string;
  batch_no: string;
  qty: number;
  unit_price: number;
  line_total: number;
};

export type PharmacySale = TenantEntity & {
  sale_no: string;
  customer_id?: UUID | null;
  customer_name: string;
  customer_phone: string;
  customer_national_id: string;
  lines: PharmacySaleLine[];
  subtotal: number;
  discount: number;
  total: number;
  tender: "cash" | "card" | "mixed";
  amount_paid: number;
  change_due: number;
  cashier: string;
  sold_at: string;
};

type Snapshot = {
  version: number;
  products: PharmacyProduct[];
  batches: PharmacyBatch[];
  customers: PharmacyCustomer[];
  sales: PharmacySale[];
};

let products: PharmacyProduct[] = [];
let batches: PharmacyBatch[] = [];
let customers: PharmacyCustomer[] = [];
let sales: PharmacySale[] = [];
let hydrated = false;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let pendingTenantId: string | undefined;

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function subscribePharmacy(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function syncEnabled() {
  return process.env.NEXT_PUBLIC_PHARMACY_USE_SUPABASE !== "false";
}

export function buildPharmacySnapshot(tenantId?: string): PharmacyRemoteSnapshot {
  const f = <T extends { tenant_id: string }>(rows: T[]) =>
    tenantId ? rows.filter((r) => r.tenant_id === tenantId) : rows;
  return {
    version: STORAGE_VERSION,
    tenantId,
    products: f(products),
    batches: f(batches),
    customers: f(customers),
    sales: f(sales)
  };
}

export function queuePharmacyRemoteSync(tenantId?: string, immediate = false) {
  if (typeof window === "undefined" || !syncEnabled()) return;
  if (tenantId) pendingTenantId = tenantId;
  const push = () => {
    const tid = pendingTenantId;
    pendingTenantId = undefined;
    void fetch("/api/pharmacy/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPharmacySnapshot(tid))
    }).catch(() => undefined);
  };
  if (immediate) {
    if (syncTimer) clearTimeout(syncTimer);
    push();
    return;
  }
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(push, 600);
}

function persist(tenantId?: string, immediate = false) {
  savePersisted(STORAGE_KEY, {
    version: STORAGE_VERSION,
    products,
    batches,
    customers,
    sales
  } satisfies Snapshot);
  emit();
  queuePharmacyRemoteSync(tenantId, immediate);
}

/** Pull durable Alif Pharmacy rows from Supabase (session cache is not durable). */
export async function pullPharmacyFromSupabase(tenantId: string) {
  if (typeof window === "undefined" || !syncEnabled()) return false;
  ensureHydrated();
  try {
    const res = await fetch(`/api/pharmacy/sync?tenantId=${encodeURIComponent(tenantId)}`);
    const json = (await res.json()) as {
      ok?: boolean;
      skipped?: boolean;
      snapshot?: PharmacyRemoteSnapshot;
    };
    if (!json.ok || json.skipped || !json.snapshot) return false;
    const s = json.snapshot;
    const keep = <T extends { tenant_id: string }>(rows: T[], incoming: T[]) => [
      ...incoming,
      ...rows.filter((r) => r.tenant_id !== tenantId)
    ];
    products = keep(products, s.products);
    batches = keep(batches, s.batches);
    customers = keep(customers, s.customers);
    sales = keep(sales, s.sales);
    if (!products.some((p) => p.tenant_id === tenantId)) {
      seedPharmacyIfEmpty(tenantId);
      savePersisted(STORAGE_KEY, {
        version: STORAGE_VERSION,
        products,
        batches,
        customers,
        sales
      } satisfies Snapshot);
      queuePharmacyRemoteSync(tenantId, true);
    } else {
      savePersisted(STORAGE_KEY, {
        version: STORAGE_VERSION,
        products,
        batches,
        customers,
        sales
      } satisfies Snapshot);
    }
    emit();
    return true;
  } catch {
    return false;
  }
}

function seedPharmacyIfEmpty(tenantId: string): boolean {
  if (!isDemoTenant(tenantId)) return false;
  if (products.some((p) => p.tenant_id === tenantId && p.is_active !== false)) return false;

  const p1 = id();
  const p2 = id();
  const p3 = id();
  const p4 = id();
  const p5 = id();
  const ts = now();

  products.push(
    {
      id: p1,
      tenant_id: tenantId,
      sku: "MED-PCM-500",
      barcode: "8901001100011",
      name: "Panadol 500mg",
      generic_name: "Paracetamol",
      strength: "500mg",
      pack_size: "1x10 tab",
      category: "medicine",
      unit: "pack",
      cost_price: 35,
      sale_price: 55,
      reorder_level: 20,
      requires_rx: false,
      created_at: ts,
      updated_at: ts,
      is_active: true
    },
    {
      id: p2,
      tenant_id: tenantId,
      sku: "MED-AMX-500",
      barcode: "8901001100028",
      name: "Amoxil 500mg",
      generic_name: "Amoxicillin",
      strength: "500mg",
      pack_size: "1x10 cap",
      category: "medicine",
      unit: "pack",
      cost_price: 180,
      sale_price: 260,
      reorder_level: 10,
      requires_rx: true,
      created_at: ts,
      updated_at: ts,
      is_active: true
    },
    {
      id: p3,
      tenant_id: tenantId,
      sku: "OTC-ORS",
      barcode: "8901001100035",
      name: "ORS Sachet",
      generic_name: "Oral rehydration salts",
      strength: "21g",
      pack_size: "1 sachet",
      category: "otc",
      unit: "sachet",
      cost_price: 18,
      sale_price: 30,
      reorder_level: 50,
      requires_rx: false,
      created_at: ts,
      updated_at: ts,
      is_active: true
    },
    {
      id: p4,
      tenant_id: tenantId,
      sku: "MED-MET-500",
      barcode: "8901001100042",
      name: "Glucophage 500mg",
      generic_name: "Metformin",
      strength: "500mg",
      pack_size: "1x30 tab",
      category: "medicine",
      unit: "pack",
      cost_price: 220,
      sale_price: 340,
      reorder_level: 8,
      requires_rx: true,
      created_at: ts,
      updated_at: ts,
      is_active: true
    },
    {
      id: p5,
      tenant_id: tenantId,
      sku: "SUR-GLV-M",
      barcode: "8901001100059",
      name: "Nitrile gloves M",
      generic_name: "Exam gloves",
      strength: "—",
      pack_size: "1x100",
      category: "surgical",
      unit: "box",
      cost_price: 450,
      sale_price: 650,
      reorder_level: 5,
      requires_rx: false,
      created_at: ts,
      updated_at: ts,
      is_active: true
    }
  );

  const today = new Date();
  const inMonths = (m: number) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + m);
    return d.toISOString().slice(0, 10);
  };

  batches.push(
    {
      id: id(),
      tenant_id: tenantId,
      product_id: p1,
      batch_no: "PCM-A2401",
      expiry_date: inMonths(14),
      quantity: 80,
      location: "Shelf A1",
      created_at: ts,
      updated_at: ts,
      is_active: true
    },
    {
      id: id(),
      tenant_id: tenantId,
      product_id: p1,
      batch_no: "PCM-A2309",
      expiry_date: inMonths(2),
      quantity: 12,
      location: "Shelf A1",
      created_at: ts,
      updated_at: ts,
      is_active: true
    },
    {
      id: id(),
      tenant_id: tenantId,
      product_id: p2,
      batch_no: "AMX-B1102",
      expiry_date: inMonths(8),
      quantity: 35,
      location: "Shelf B2",
      created_at: ts,
      updated_at: ts,
      is_active: true
    },
    {
      id: id(),
      tenant_id: tenantId,
      product_id: p3,
      batch_no: "ORS-C01",
      expiry_date: inMonths(18),
      quantity: 200,
      location: "Counter",
      created_at: ts,
      updated_at: ts,
      is_active: true
    },
    {
      id: id(),
      tenant_id: tenantId,
      product_id: p4,
      batch_no: "MET-D77",
      expiry_date: inMonths(11),
      quantity: 22,
      location: "Shelf C1",
      created_at: ts,
      updated_at: ts,
      is_active: true
    },
    {
      id: id(),
      tenant_id: tenantId,
      product_id: p5,
      batch_no: "GLV-E02",
      expiry_date: inMonths(24),
      quantity: 9,
      location: "Store",
      created_at: ts,
      updated_at: ts,
      is_active: true
    }
  );

  customers.push(
    {
      id: id(),
      tenant_id: tenantId,
      code: "C-001",
      name: "Walk-in",
      phone: "",
      national_id: "",
      address: "",
      notes: "Counter default",
      created_at: ts,
      updated_at: ts,
      is_active: true
    },
    {
      id: id(),
      tenant_id: tenantId,
      code: "C-002",
      name: "Ahmed Raza",
      phone: "03001234567",
      national_id: "35202-1234567-1",
      address: "Gulberg, Lahore",
      notes: "Regular",
      created_at: ts,
      updated_at: ts,
      is_active: true
    },
    {
      id: id(),
      tenant_id: tenantId,
      code: "C-003",
      name: "Sana Iqbal",
      phone: "03217654321",
      national_id: "",
      address: "DHA Phase 5",
      notes: "",
      created_at: ts,
      updated_at: ts,
      is_active: true
    }
  );

  return true;
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === "undefined") return;
  const snap = loadPersisted<Snapshot>(STORAGE_KEY);
  if (snap?.version === STORAGE_VERSION) {
    products = snap.products ?? [];
    batches = snap.batches ?? [];
    customers = (snap.customers ?? []).map((c) => ({
      ...c,
      national_id: (c as PharmacyCustomer).national_id ?? ""
    }));
    sales = (snap.sales ?? []).map((s) => ({
      ...s,
      customer_phone: (s as PharmacySale).customer_phone ?? "",
      customer_national_id: (s as PharmacySale).customer_national_id ?? ""
    }));
  }
  // Session cache only — durable rows come from Supabase pull. Seed only when sync is off.
  if (!syncEnabled()) {
    for (const t of DEMO_TENANT_IDS) seedPharmacyIfEmpty(t);
  }
  savePersisted(STORAGE_KEY, {
    version: STORAGE_VERSION,
    products,
    batches,
    customers,
    sales
  } satisfies Snapshot);
  emit();
}

function nextSaleNo(tenantId: string) {
  const n = sales.filter((s) => s.tenant_id === tenantId).length + 1;
  return `RXS-${String(n).padStart(5, "0")}`;
}

function nextCustomerCode(tenantId: string) {
  const n = customers.filter((c) => c.tenant_id === tenantId).length + 1;
  return `C-${String(n).padStart(3, "0")}`;
}

export function listPharmacyProducts(tenantId: string) {
  ensureHydrated();
  return products.filter((p) => p.tenant_id === tenantId && p.is_active !== false);
}

export function listPharmacyBatches(tenantId: string, productId?: string) {
  ensureHydrated();
  return batches
    .filter((b) => b.tenant_id === tenantId && b.is_active !== false && (!productId || b.product_id === productId))
    .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));
}

export function stockOnHand(tenantId: string, productId: string) {
  return listPharmacyBatches(tenantId, productId).reduce((sum, b) => sum + b.quantity, 0);
}

export function listLowStockProducts(tenantId: string) {
  return listPharmacyProducts(tenantId).filter((p) => stockOnHand(tenantId, p.id) <= p.reorder_level);
}

export function listNearExpiryBatches(tenantId: string, withinDays = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);
  const cut = cutoff.toISOString().slice(0, 10);
  return listPharmacyBatches(tenantId).filter((b) => b.quantity > 0 && b.expiry_date <= cut);
}

export function createPharmacyProduct(
  tenantId: string,
  input: Omit<PharmacyProduct, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active">
) {
  ensureHydrated();
  const row: PharmacyProduct = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  products.unshift(row);
  persist(tenantId);
  return row;
}

export function updatePharmacyProduct(idRow: string, patch: Partial<PharmacyProduct>) {
  ensureHydrated();
  const i = products.findIndex((p) => p.id === idRow);
  if (i < 0) return null;
  products[i] = { ...products[i]!, ...patch, updated_at: now() };
  persist(products[i]!.tenant_id);
  return products[i]!;
}

export function trashPharmacyProduct(idRow: string) {
  ensureHydrated();
  const i = products.findIndex((p) => p.id === idRow);
  if (i < 0) return;
  products[i] = { ...products[i]!, is_active: false, updated_at: now() };
  persist(products[i]!.tenant_id);
}

export function createPharmacyBatch(
  tenantId: string,
  input: Omit<PharmacyBatch, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active">
) {
  ensureHydrated();
  const row: PharmacyBatch = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  batches.unshift(row);
  persist(tenantId);
  return row;
}

export function updatePharmacyBatch(idRow: string, patch: Partial<PharmacyBatch>) {
  ensureHydrated();
  const i = batches.findIndex((b) => b.id === idRow);
  if (i < 0) return null;
  batches[i] = { ...batches[i]!, ...patch, updated_at: now() };
  persist(batches[i]!.tenant_id);
  return batches[i]!;
}

export function listPharmacyCustomers(tenantId: string) {
  ensureHydrated();
  return customers.filter((c) => c.tenant_id === tenantId && c.is_active !== false);
}

export function normalizePkPhone(phone: string) {
  return phone.replace(/\D/g, "").trim();
}

/** Digits-only phone key for lookup (country-aware normalizer preferred at call sites). */
export function normalizePhoneKey(phone: string) {
  return phone.replace(/\D/g, "").trim();
}

export function findCustomerByPhone(tenantId: string, phone: string) {
  ensureHydrated();
  const needle = normalizePhoneKey(phone);
  if (!needle) return null;
  return (
    listPharmacyCustomers(tenantId).find((c) => {
      const stored = normalizePhoneKey(c.phone);
      if (!stored) return false;
      return stored === needle || stored.endsWith(needle) || needle.endsWith(stored);
    }) ?? null
  );
}

/** Upsert customer from POS fields (phone is the key most shops use). */
export function upsertCustomerFromPos(
  tenantId: string,
  input: { name: string; phone: string; national_id?: string }
) {
  ensureHydrated();
  const phone = normalizePhoneKey(input.phone);
  const name = input.name.trim() || (phone ? "Customer" : "Walk-in");
  const national_id = (input.national_id ?? "").replace(/\D/g, "").trim();
  const existing = phone ? findCustomerByPhone(tenantId, phone) : null;
  if (existing) {
    const i = customers.findIndex((c) => c.id === existing.id);
    if (i >= 0) {
      customers[i] = {
        ...customers[i]!,
        name: name !== "Customer" ? name : customers[i]!.name || name,
        phone: phone || customers[i]!.phone,
        national_id: national_id || customers[i]!.national_id,
        updated_at: now()
      };
      persist(tenantId);
      return customers[i]!;
    }
  }
  if (!phone && !input.name.trim()) {
    return null;
  }
  const row: PharmacyCustomer = {
    id: id(),
    tenant_id: tenantId,
    code: nextCustomerCode(tenantId),
    name,
    phone,
    national_id,
    address: "",
    notes: "Captured at POS",
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  customers.unshift(row);
  persist(tenantId);
  return row;
}

export function createPharmacyCustomer(
  tenantId: string,
  input: Omit<PharmacyCustomer, "id" | "tenant_id" | "code" | "created_at" | "updated_at" | "is_active">
) {
  ensureHydrated();
  const row: PharmacyCustomer = {
    ...input,
    phone: normalizePhoneKey(input.phone),
    national_id: (input.national_id ?? "").replace(/\D/g, ""),
    id: id(),
    tenant_id: tenantId,
    code: nextCustomerCode(tenantId),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  customers.unshift(row);
  persist(tenantId);
  return row;
}

export function listPharmacySales(tenantId: string) {
  ensureHydrated();
  return sales
    .filter((s) => s.tenant_id === tenantId && s.is_active !== false)
    .sort((a, b) => b.sold_at.localeCompare(a.sold_at));
}

export function pharmacyDashboardStats(tenantId: string) {
  ensureHydrated();
  const day = now().slice(0, 10);
  const todaySales = listPharmacySales(tenantId).filter((s) => s.sold_at.slice(0, 10) === day);
  return {
    todaySalesTotal: todaySales.reduce((n, s) => n + s.total, 0),
    todayTicketCount: todaySales.length,
    lowStock: listLowStockProducts(tenantId).length,
    nearExpiry: listNearExpiryBatches(tenantId).length
  };
}

/** Pick earliest-expiring batch with stock (FEFO). */
export function pickFefoBatch(tenantId: string, productId: string, qty: number) {
  const available = listPharmacyBatches(tenantId, productId).filter((b) => b.quantity > 0);
  let need = qty;
  const picks: Array<{ batch: PharmacyBatch; qty: number }> = [];
  for (const batch of available) {
    if (need <= 0) break;
    const take = Math.min(batch.quantity, need);
    picks.push({ batch, qty: take });
    need -= take;
  }
  if (need > 0) return null;
  return picks;
}

export function completePharmacySale(
  tenantId: string,
  input: {
    customer_id?: string | null;
    customer_name: string;
    customer_phone?: string;
    customer_national_id?: string;
    lines: Array<{ product_id: string; batch_id: string; qty: number }>;
    discount: number;
    tender: PharmacySale["tender"];
    amount_paid: number;
    cashier: string;
  }
) {
  ensureHydrated();
  if (!input.lines.length) throw new Error("Cart is empty");

  const lines: PharmacySaleLine[] = [];
  for (const line of input.lines) {
    const product = products.find((p) => p.id === line.product_id && p.tenant_id === tenantId);
    const batch = batches.find((b) => b.id === line.batch_id && b.tenant_id === tenantId);
    if (!product || !batch) throw new Error("Product or batch missing");
    if (batch.product_id !== product.id) throw new Error("Batch does not match product");
    if (batch.quantity < line.qty) throw new Error(`Insufficient stock for ${product.name}`);
    const unit_price = product.sale_price;
    lines.push({
      product_id: product.id,
      batch_id: batch.id,
      sku: product.sku,
      name: product.name,
      batch_no: batch.batch_no,
      qty: line.qty,
      unit_price,
      line_total: unit_price * line.qty
    });
  }

  const subtotal = lines.reduce((n, l) => n + l.line_total, 0);
  const discount = Math.max(0, Math.min(input.discount, subtotal));
  const total = subtotal - discount;
  if (input.amount_paid + 0.001 < total) throw new Error("Amount paid is less than total");

  for (const line of lines) {
    const i = batches.findIndex((b) => b.id === line.batch_id);
    if (i < 0) throw new Error("Batch missing");
    batches[i] = {
      ...batches[i]!,
      quantity: batches[i]!.quantity - line.qty,
      updated_at: now()
    };
  }

  const sale: PharmacySale = {
    id: id(),
    tenant_id: tenantId,
    sale_no: nextSaleNo(tenantId),
    customer_id: input.customer_id ?? null,
    customer_name: input.customer_name || "Walk-in",
    customer_phone: normalizePhoneKey(input.customer_phone ?? ""),
    customer_national_id: (input.customer_national_id ?? "").replace(/\D/g, "").trim(),
    lines,
    subtotal,
    discount,
    total,
    tender: input.tender,
    amount_paid: input.amount_paid,
    change_due: Math.max(0, input.amount_paid - total),
    cashier: input.cashier,
    sold_at: now(),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  sales.unshift(sale);
  persist(tenantId, true);
  return sale;
}

export function findProductByBarcodeOrSku(tenantId: string, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return null;
  return (
    listPharmacyProducts(tenantId).find(
      (p) => p.barcode.toLowerCase() === needle || p.sku.toLowerCase() === needle || p.name.toLowerCase().includes(needle)
    ) ?? null
  );
}

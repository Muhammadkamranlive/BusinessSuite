import type { UUID } from "@/modules/core/types";
import { generateDocumentNumber } from "@/modules/core/services/numbering.service";
import { logCreate } from "@/modules/core/services/audit.service";
import { bindTrashRestore, trashEntityInCollection, updateEntityInCollection } from "@/modules/core/services/entity-crud";
import {
  MARKETPLACE_CATEGORIES,
  type ClinicOrder,
  type ClinicOrderLine,
  type ClinicOrderStatus,
  type ComplianceEvent,
  type MarketplaceProduct,
  type PharmacyPartner,
  type ProviderCredential,
  type ProviderVerifyStatus
} from "@/modules/healthcare/model/pharmacy-marketplace";
import type { MarketplaceRemoteSnapshot } from "@/modules/healthcare/services/pharmacy-marketplace.supabase-sync";

export type {
  ClinicOrder,
  ClinicOrderLine,
  ClinicOrderStatus,
  ComplianceEvent,
  MarketplaceProduct,
  PharmacyPartner,
  ProviderCredential,
  ProviderVerifyStatus
} from "@/modules/healthcare/model/pharmacy-marketplace";

function now() {
  return new Date().toISOString();
}
function today() {
  return now().slice(0, 10);
}
function id() {
  return crypto.randomUUID();
}

/** In-memory session cache only — durable source of truth is Postgres via /api/healthcare/marketplace-sync. */
let pharmacies: PharmacyPartner[] = [];
let products: MarketplaceProduct[] = [];
let providers: ProviderCredential[] = [];
let orders: ClinicOrder[] = [];
let compliance: ComplianceEvent[] = [];
let seededTenants: string[] = [];
let hydrated = false;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let pendingTenantId: string | undefined;

const EVENT = "businesssuite:healthcare-marketplace-changed";

function emitChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT));
  }
}

function isClientSyncEnabled() {
  return process.env.NEXT_PUBLIC_HEALTHCARE_MARKETPLACE_USE_SUPABASE !== "false";
}

export function buildMarketplaceSnapshot(tenantId?: string): MarketplaceRemoteSnapshot {
  const filterTenant = <T extends { tenant_id: string }>(rows: T[]) =>
    tenantId ? rows.filter((r) => r.tenant_id === tenantId) : rows;
  return {
    version: 1,
    tenantId,
    pharmacies: filterTenant(pharmacies),
    products: filterTenant(products),
    providers: filterTenant(providers),
    orders: filterTenant(orders),
    compliance: filterTenant(compliance).slice(0, 500)
  };
}

/** Debounced push of marketplace entities to Postgres (DB persistence). */
export function queueMarketplaceRemoteSync(tenantId?: string, immediate = false) {
  if (typeof window === "undefined") return;
  if (!isClientSyncEnabled()) return;
  if (tenantId) pendingTenantId = tenantId;

  const push = () => {
    const tid = pendingTenantId;
    pendingTenantId = undefined;
    const snapshot = buildMarketplaceSnapshot(tid);
    void fetch("/api/healthcare/marketplace-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot)
    }).catch(() => {
      /* offline — retry on next mutation / pull */
    });
  };

  if (immediate) {
    if (syncTimer) clearTimeout(syncTimer);
    push();
    return;
  }
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(push, 600);
}

function persist(tenantId?: string) {
  emitChange();
  queueMarketplaceRemoteSync(tenantId, false);
}

/** Pull marketplace data from Postgres — DB wins for that tenant. */
export async function pullMarketplaceFromSupabase(tenantId: string) {
  if (typeof window === "undefined") return false;
  if (!isClientSyncEnabled()) return false;
  try {
    const res = await fetch(`/api/healthcare/marketplace-sync?tenantId=${encodeURIComponent(tenantId)}`);
    const json = (await res.json()) as {
      ok?: boolean;
      skipped?: boolean;
      snapshot?: MarketplaceRemoteSnapshot;
    };
    if (!json.ok || json.skipped || !json.snapshot) return false;

    const snap = json.snapshot;
    pharmacies = [...snap.pharmacies, ...pharmacies.filter((r) => r.tenant_id !== tenantId)];
    products = [...snap.products, ...products.filter((r) => r.tenant_id !== tenantId)];
    providers = [...snap.providers, ...providers.filter((r) => r.tenant_id !== tenantId)];
    orders = [...snap.orders, ...orders.filter((r) => r.tenant_id !== tenantId)];
    compliance = [...snap.compliance, ...compliance.filter((r) => r.tenant_id !== tenantId)].slice(0, 500);
    if (snap.pharmacies.length || snap.products.length || snap.providers.length) {
      if (!seededTenants.includes(tenantId)) seededTenants.push(tenantId);
    } else {
      // Empty DB for this tenant — seed once and push to Postgres.
      seedDemoTenant(tenantId);
    }
    hydrated = true;
    emitChange();
    return true;
  } catch {
    return false;
  }
}

export function subscribeMarketplace(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

function ensureHydrated() {
  hydrated = true;
}

function touchCompliance(
  tenantId: UUID,
  actor: string,
  action: string,
  entity_type: string,
  detail: string,
  opts?: { entity_id?: string; phi_touch?: boolean }
) {
  ensureHydrated();
  compliance.unshift({
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    actor,
    action,
    entity_type,
    entity_id: opts?.entity_id ?? null,
    detail,
    phi_touch: opts?.phi_touch ?? false
  });
  if (compliance.length > 500) compliance.length = 500;
  persist(tenantId);
}

function seedDemoTenant(tenantId: UUID) {
  if (seededTenants.includes(tenantId)) return;
  if (pharmacies.some((p) => p.tenant_id === tenantId)) {
    seededTenants.push(tenantId);
    return;
  }

  const ph1 = id();
  const ph2 = id();
  const t = now();

  pharmacies.unshift(
    {
      id: ph1,
      tenant_id: tenantId,
      created_at: t,
      updated_at: t,
      is_active: true,
      name: "Apex Compounding Pharmacy",
      code: "APEX",
      npi: "1234567890",
      license_no: "PH-TX-44021",
      email: "orders@apexcompound.example",
      phone: "+1-512-555-0101",
      address: "1200 Medical Plaza, Austin, TX",
      api_mode: "api",
      status: "active",
      notes: "Primary peptide & hormone partner"
    },
    {
      id: ph2,
      tenant_id: tenantId,
      created_at: t,
      updated_at: t,
      is_active: true,
      name: "Summit Wellness Rx",
      code: "SUMMIT",
      npi: "1098765432",
      license_no: "PH-FL-88210",
      email: "fulfillment@summitrx.example",
      phone: "+1-305-555-0199",
      address: "88 Harbor Blvd, Miami, FL",
      api_mode: "manual",
      status: "active",
      notes: "Manual secure workflow partner"
    }
  );

  const mkProduct = (
    pharmacy_id: string,
    pharmacy_name: string,
    sku: string,
    name: string,
    category: string,
    unit_price: number,
    strength: string,
    form: string,
    featured: boolean,
    controlled: boolean,
    warning?: string
  ): MarketplaceProduct => ({
    id: id(),
    tenant_id: tenantId,
    created_at: t,
    updated_at: t,
    is_active: true,
    pharmacy_id,
    pharmacy_name,
    sku,
    name,
    category,
    description: `${name} for licensed professional ordering.`,
    strength,
    form,
    unit_price,
    compare_price: Math.round(unit_price * 1.15 * 100) / 100,
    stock_qty: 120,
    featured,
    controlled,
    warning: warning ?? null,
    education: "Prescriber attestation and patient documentation required before fulfillment.",
    image_url: null,
    status: "active"
  });

  products.unshift(
    mkProduct(ph1, "Apex Compounding Pharmacy", "SEM-025", "Semaglutide", "Weight management", 189, "2.5 mg/mL", "Injectable", true, false),
    mkProduct(ph1, "Apex Compounding Pharmacy", "TIR-050", "Tirzepatide", "Weight management", 249, "5 mg/mL", "Injectable", true, false),
    mkProduct(ph1, "Apex Compounding Pharmacy", "BPC-157", "BPC-157", "Recovery and healing", 129, "5 mg", "Injectable", false, false),
    mkProduct(
      ph1,
      "Apex Compounding Pharmacy",
      "TES-CYP",
      "Testosterone Cypionate",
      "Hormone optimization",
      78,
      "200 mg/mL",
      "Injectable",
      true,
      true,
      "Controlled substance — DEA / state prescribing rules apply."
    ),
    mkProduct(ph1, "Apex Compounding Pharmacy", "NAD-500", "NAD+", "Longevity and wellness", 165, "500 mg", "Injectable", false, false),
    mkProduct(ph2, "Summit Wellness Rx", "SILD-50", "Sildenafil", "Sexual wellness", 42, "50 mg", "Tablet", true, false),
    mkProduct(ph2, "Summit Wellness Rx", "TADA-5", "Tadalafil", "Sexual wellness", 48, "5 mg", "Tablet", false, false),
    mkProduct(ph2, "Summit Wellness Rx", "MIC-B12", "MIC + B12", "Injectable nutrients", 55, "10 mL vial", "Injectable", false, false),
    mkProduct(ph2, "Summit Wellness Rx", "GHK-CU", "GHK-Cu", "Recovery and healing", 98, "50 mg", "Injectable", false, false),
    mkProduct(ph2, "Summit Wellness Rx", "SERM-CL", "Clomiphene", "Hormone optimization", 36, "50 mg", "Capsule", false, false)
  );

  providers.unshift(
    {
      id: id(),
      tenant_id: tenantId,
      created_at: t,
      updated_at: t,
      is_active: true,
      full_name: "Dr. Maya Chen",
      role_type: "physician",
      clinic_name: "Lumen Longevity Clinic",
      email: "maya.chen@lumen.example",
      phone: "+1-415-555-0144",
      npi: "1876543210",
      license_no: "A-98211",
      license_state: "CA",
      dea_number: "BC1234567",
      document_note: "Medical license + DEA uploaded",
      verification_status: "approved",
      can_order: true,
      mfa_enabled: true,
      reviewed_by: "Platform Admin",
      reviewed_at: t
    },
    {
      id: id(),
      tenant_id: tenantId,
      created_at: t,
      updated_at: t,
      is_active: true,
      full_name: "Jordan Ellis, NP",
      role_type: "np",
      clinic_name: "Harbor Wellness Group",
      email: "j.ellis@harbor.example",
      phone: "+1-617-555-0177",
      npi: "1567890123",
      license_no: "NP-44120",
      license_state: "MA",
      dea_number: null,
      document_note: "Awaiting license PDF",
      verification_status: "submitted",
      can_order: false,
      mfa_enabled: false
    }
  );

  compliance.unshift({
    id: id(),
    tenant_id: tenantId,
    created_at: t,
    actor: "system",
    action: "seed",
    entity_type: "marketplace",
    detail: "Seeded demo pharmacies, catalog, and provider credentials into Postgres",
    phi_touch: false
  });

  seededTenants.push(tenantId);
  emitChange();
  queueMarketplaceRemoteSync(tenantId, true);
}

function ensureSeed(tenantId: UUID) {
  ensureHydrated();
  if (seededTenants.includes(tenantId)) return;
  if (pharmacies.some((p) => p.tenant_id === tenantId)) {
    seededTenants.push(tenantId);
    return;
  }
  // With DB sync on, seed only after pull confirms empty (see pullMarketplaceFromSupabase).
  // Offline / sync-disabled: seed into session memory only.
  if (!isClientSyncEnabled()) {
    seedDemoTenant(tenantId);
  }
}

const pharmacyRef = {
  get: () => pharmacies,
  set: (rows: PharmacyPartner[]) => {
    pharmacies = rows;
  },
  persist: () => persist(),
  module: "healthcare",
  entityName: "pharmacy_partner",
  labelOf: (row: PharmacyPartner) => row.name
};

const productRef = {
  get: () => products,
  set: (rows: MarketplaceProduct[]) => {
    products = rows;
  },
  persist: () => persist(),
  module: "healthcare",
  entityName: "marketplace_product",
  labelOf: (row: MarketplaceProduct) => `${row.sku} · ${row.name}`
};

const providerRef = {
  get: () => providers,
  set: (rows: ProviderCredential[]) => {
    providers = rows;
  },
  persist: () => persist(),
  module: "healthcare",
  entityName: "provider_credential",
  labelOf: (row: ProviderCredential) => `${row.full_name} · ${row.npi}`
};

const orderRef = {
  get: () => orders,
  set: (rows: ClinicOrder[]) => {
    orders = rows;
  },
  persist: () => persist(),
  module: "healthcare",
  entityName: "clinic_order",
  labelOf: (row: ClinicOrder) => `${row.order_no} · ${row.patient_name}`
};

bindTrashRestore(pharmacyRef);
bindTrashRestore(productRef);
bindTrashRestore(providerRef);
bindTrashRestore(orderRef);

export { MARKETPLACE_CATEGORIES };

export function listPharmacies(tenantId: UUID): PharmacyPartner[] {
  ensureSeed(tenantId);
  return pharmacies.filter((p) => p.tenant_id === tenantId && p.is_active !== false).sort((a, b) => a.name.localeCompare(b.name));
}

export function createPharmacy(
  tenantId: UUID,
  input: Omit<PharmacyPartner, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active">
): PharmacyPartner {
  ensureSeed(tenantId);
  const row: PharmacyPartner = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  pharmacies.unshift(row);
  persist(tenantId);
  logCreate({
    tenantId,
    module: "healthcare",
    entityName: "pharmacy_partner",
    entityId: row.id,
    newData: row as unknown as Record<string, unknown>
  });
  touchCompliance(tenantId, "admin", "create", "pharmacy_partner", `Added pharmacy ${row.name}`, { entity_id: row.id });
  return row;
}

export function updatePharmacy(entityId: UUID, patch: Partial<PharmacyPartner>) {
  ensureHydrated();
  const updated = updateEntityInCollection(pharmacyRef, entityId, patch);
  if (updated) {
    queueMarketplaceRemoteSync(updated.tenant_id, true);
    touchCompliance(updated.tenant_id, "admin", "update", "pharmacy_partner", `Updated pharmacy ${updated.name}`, {
      entity_id: entityId
    });
  }
  return updated;
}

export function trashPharmacy(entityId: UUID) {
  ensureHydrated();
  const row = trashEntityInCollection(pharmacyRef, entityId);
  if (row) queueMarketplaceRemoteSync(row.tenant_id, true);
  return row;
}

export function listMarketplaceProducts(
  tenantId: UUID,
  opts?: { pharmacyId?: string; category?: string; featuredOnly?: boolean }
): MarketplaceProduct[] {
  ensureSeed(tenantId);
  let rows = products.filter((p) => p.tenant_id === tenantId && p.is_active !== false);
  if (opts?.pharmacyId) rows = rows.filter((p) => p.pharmacy_id === opts.pharmacyId);
  if (opts?.category && opts.category !== "all") rows = rows.filter((p) => p.category === opts.category);
  if (opts?.featuredOnly) rows = rows.filter((p) => p.featured);
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export function createMarketplaceProduct(
  tenantId: UUID,
  input: Omit<MarketplaceProduct, "id" | "tenant_id" | "created_at" | "updated_at" | "is_active">
): MarketplaceProduct {
  ensureSeed(tenantId);
  const row: MarketplaceProduct = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  products.unshift(row);
  persist(tenantId);
  logCreate({
    tenantId,
    module: "healthcare",
    entityName: "marketplace_product",
    entityId: row.id,
    newData: row as unknown as Record<string, unknown>
  });
  touchCompliance(tenantId, "admin", "create", "marketplace_product", `Added product ${row.name}`, { entity_id: row.id });
  return row;
}

export function updateMarketplaceProduct(entityId: UUID, patch: Partial<MarketplaceProduct>) {
  ensureHydrated();
  const updated = updateEntityInCollection(productRef, entityId, patch);
  if (updated) queueMarketplaceRemoteSync(updated.tenant_id, true);
  return updated;
}

export function trashMarketplaceProduct(entityId: UUID) {
  ensureHydrated();
  const row = trashEntityInCollection(productRef, entityId);
  if (row) queueMarketplaceRemoteSync(row.tenant_id, true);
  return row;
}

export function listProviders(tenantId: UUID): ProviderCredential[] {
  ensureSeed(tenantId);
  return providers
    .filter((p) => p.tenant_id === tenantId && p.is_active !== false)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export function createProvider(
  tenantId: UUID,
  input: Omit<
    ProviderCredential,
    "id" | "tenant_id" | "created_at" | "updated_at" | "is_active" | "can_order" | "reviewed_by" | "reviewed_at"
  >
): ProviderCredential {
  ensureSeed(tenantId);
  const row: ProviderCredential = {
    ...input,
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    can_order: input.verification_status === "approved",
    reviewed_by: null,
    reviewed_at: null
  };
  providers.unshift(row);
  persist(tenantId);
  logCreate({
    tenantId,
    module: "healthcare",
    entityName: "provider_credential",
    entityId: row.id,
    newData: row as unknown as Record<string, unknown>
  });
  touchCompliance(tenantId, "admin", "create", "provider_credential", `Registered provider ${row.full_name} (NPI ${row.npi})`, {
    entity_id: row.id
  });
  return row;
}

export function updateProvider(entityId: UUID, patch: Partial<ProviderCredential>) {
  ensureHydrated();
  const updated = updateEntityInCollection(providerRef, entityId, patch);
  if (updated) {
    queueMarketplaceRemoteSync(updated.tenant_id, true);
    touchCompliance(updated.tenant_id, "admin", "update", "provider_credential", `Updated provider ${updated.full_name}`, {
      entity_id: entityId
    });
  }
  return updated;
}

export function setProviderVerification(
  providerId: UUID,
  status: ProviderVerifyStatus,
  actor: string,
  rejectReason?: string
) {
  ensureHydrated();
  const updated = updateEntityInCollection(providerRef, providerId, {
    verification_status: status,
    can_order: status === "approved",
    reviewed_by: actor,
    reviewed_at: now(),
    reject_reason: status === "rejected" ? rejectReason ?? "Documentation incomplete" : null
  });
  if (updated) {
    queueMarketplaceRemoteSync(updated.tenant_id, true);
    touchCompliance(updated.tenant_id, actor, status, "provider_credential", `Provider ${updated.full_name} → ${status}`, {
      entity_id: providerId
    });
  }
  return updated;
}

export function trashProvider(entityId: UUID) {
  ensureHydrated();
  const row = trashEntityInCollection(providerRef, entityId);
  if (row) queueMarketplaceRemoteSync(row.tenant_id, true);
  return row;
}

function lineTotal(qty: number, price: number) {
  return Math.round(qty * price * 100) / 100;
}

export function listClinicOrders(tenantId: UUID, opts?: { pharmacyId?: string; status?: string }): ClinicOrder[] {
  ensureSeed(tenantId);
  let rows = orders.filter((o) => o.tenant_id === tenantId && o.is_active !== false);
  if (opts?.pharmacyId) rows = rows.filter((o) => o.pharmacy_id === opts.pharmacyId);
  if (opts?.status && opts.status !== "all") rows = rows.filter((o) => o.status === opts.status);
  return rows.sort((a, b) => b.order_date.localeCompare(a.order_date) || b.created_at.localeCompare(a.created_at));
}

export function createClinicOrder(
  tenantId: UUID,
  input: {
    provider_id: UUID;
    provider_name: string;
    clinic_name: string;
    patient_name: string;
    patient_dob?: string | null;
    patient_mrn?: string | null;
    pharmacy_id: UUID;
    pharmacy_name: string;
    shipping_address?: string | null;
    dosage_notes?: string | null;
    medical_necessity?: string | null;
    attestation_signed: boolean;
    consent_acknowledged: boolean;
    shipping_fee?: number;
    platform_fee?: number;
    tax_amount?: number;
    lines: Omit<ClinicOrderLine, "id" | "line_total">[];
    status?: ClinicOrderStatus;
    payment_status?: ClinicOrder["payment_status"];
  }
): ClinicOrder {
  ensureSeed(tenantId);
  const lines: ClinicOrderLine[] = input.lines.map((l) => ({
    ...l,
    id: id(),
    line_total: lineTotal(l.quantity, l.unit_price)
  }));
  const subtotal = Math.round(lines.reduce((s, l) => s + l.line_total, 0) * 100) / 100;
  const shipping_fee = input.shipping_fee ?? 12;
  const platform_fee = input.platform_fee ?? Math.round(subtotal * 0.03 * 100) / 100;
  const tax_amount = input.tax_amount ?? 0;
  const total_amount = Math.round((subtotal + shipping_fee + platform_fee + tax_amount) * 100) / 100;
  const order_no = generateDocumentNumber(tenantId, "clinic_order");
  const row: ClinicOrder = {
    id: id(),
    tenant_id: tenantId,
    created_at: now(),
    updated_at: now(),
    is_active: true,
    order_no,
    provider_id: input.provider_id,
    provider_name: input.provider_name,
    clinic_name: input.clinic_name,
    patient_name: input.patient_name,
    patient_dob: input.patient_dob ?? null,
    patient_mrn: input.patient_mrn ?? null,
    pharmacy_id: input.pharmacy_id,
    pharmacy_name: input.pharmacy_name,
    status: input.status ?? "pending",
    payment_status: input.payment_status ?? "unpaid",
    order_date: today(),
    shipping_address: input.shipping_address ?? null,
    dosage_notes: input.dosage_notes ?? null,
    medical_necessity: input.medical_necessity ?? null,
    attestation_signed: input.attestation_signed,
    consent_acknowledged: input.consent_acknowledged,
    subtotal,
    shipping_fee,
    platform_fee,
    tax_amount,
    total_amount,
    tracking_no: null,
    lines,
    invoice_no: null
  };
  orders.unshift(row);
  persist(tenantId);
  logCreate({
    tenantId,
    module: "healthcare",
    entityName: "clinic_order",
    entityId: row.id,
    newData: row as unknown as Record<string, unknown>
  });
  touchCompliance(tenantId, input.provider_name, "submit", "clinic_order", `Order ${order_no} for patient ${input.patient_name}`, {
    entity_id: row.id,
    phi_touch: true
  });
  return row;
}

export function updateClinicOrder(entityId: UUID, patch: Partial<ClinicOrder>) {
  ensureHydrated();
  const updated = updateEntityInCollection(orderRef, entityId, patch);
  if (updated) {
    queueMarketplaceRemoteSync(updated.tenant_id, true);
    touchCompliance(updated.tenant_id, "system", "update", "clinic_order", `Order ${updated.order_no} updated`, {
      entity_id: entityId,
      phi_touch: true
    });
  }
  return updated;
}

export function setOrderStatus(orderId: UUID, status: ClinicOrderStatus, actor: string, extra?: Partial<ClinicOrder>) {
  ensureHydrated();
  const existing = orders.find((o) => o.id === orderId);
  const patch: Partial<ClinicOrder> = { status, ...extra };
  if (status === "shipped" && !extra?.tracking_no) {
    patch.tracking_no = `TRK-${Date.now().toString(36).toUpperCase()}`;
  }
  if (status === "completed" && existing) {
    if (!extra?.invoice_no) patch.invoice_no = generateDocumentNumber(existing.tenant_id, "invoice");
    patch.payment_status = extra?.payment_status ?? "paid";
  }
  const updated = updateEntityInCollection(orderRef, orderId, patch);
  if (updated) {
    queueMarketplaceRemoteSync(updated.tenant_id, true);
    touchCompliance(updated.tenant_id, actor, status, "clinic_order", `Order ${updated.order_no} → ${status}`, {
      entity_id: orderId,
      phi_touch: true
    });
  }
  return updated;
}

export function markOrderPaid(orderId: UUID) {
  return updateClinicOrder(orderId, { payment_status: "paid" });
}

export function reorderClinicOrder(tenantId: UUID, sourceId: UUID): ClinicOrder | null {
  const src = listClinicOrders(tenantId).find((o) => o.id === sourceId);
  if (!src) return null;
  return createClinicOrder(tenantId, {
    provider_id: src.provider_id,
    provider_name: src.provider_name,
    clinic_name: src.clinic_name,
    patient_name: src.patient_name,
    patient_dob: src.patient_dob,
    patient_mrn: src.patient_mrn,
    pharmacy_id: src.pharmacy_id,
    pharmacy_name: src.pharmacy_name,
    shipping_address: src.shipping_address,
    dosage_notes: src.dosage_notes,
    medical_necessity: src.medical_necessity,
    attestation_signed: true,
    consent_acknowledged: true,
    shipping_fee: src.shipping_fee,
    platform_fee: src.platform_fee,
    tax_amount: src.tax_amount,
    lines: src.lines.map((l) => ({
      product_id: l.product_id,
      product_name: l.product_name,
      pharmacy_id: l.pharmacy_id,
      pharmacy_name: l.pharmacy_name,
      sku: l.sku,
      strength: l.strength,
      quantity: l.quantity,
      unit_price: l.unit_price,
      controlled: l.controlled
    })),
    status: "pending"
  });
}

export function trashClinicOrder(entityId: UUID) {
  ensureHydrated();
  const row = trashEntityInCollection(orderRef, entityId);
  if (row) queueMarketplaceRemoteSync(row.tenant_id, true);
  return row;
}

export function listComplianceEvents(tenantId: UUID): ComplianceEvent[] {
  ensureSeed(tenantId);
  return compliance
    .filter((e) => e.tenant_id === tenantId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function marketplaceAnalytics(tenantId: UUID) {
  const orderRows = listClinicOrders(tenantId);
  const productRows = listMarketplaceProducts(tenantId);
  const providerRows = listProviders(tenantId);
  const pharmacyRows = listPharmacies(tenantId);
  const paid = orderRows.filter((o) => o.payment_status === "paid" || o.status === "completed");
  const revenue = paid.reduce((s, o) => s + o.total_amount, 0);
  const byPharmacy = pharmacyRows.map((p) => ({
    name: p.name,
    orders: orderRows.filter((o) => o.pharmacy_id === p.id).length,
    revenue: paid.filter((o) => o.pharmacy_id === p.id).reduce((s, o) => s + o.total_amount, 0)
  }));
  const productCounts = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of orderRows) {
    for (const l of o.lines) {
      const cur = productCounts.get(l.product_id) ?? { name: l.product_name, qty: 0, revenue: 0 };
      cur.qty += l.quantity;
      cur.revenue += l.line_total;
      productCounts.set(l.product_id, cur);
    }
  }
  const topProducts = [...productCounts.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);
  const pending = orderRows.filter((o) => ["pending", "processing", "accepted"].includes(o.status)).length;
  const avgOrder = paid.length ? revenue / paid.length : 0;
  const clinicCounts = orderRows.reduce<Record<string, number>>((acc, o) => {
    acc[o.clinic_name] = (acc[o.clinic_name] ?? 0) + 1;
    return acc;
  }, {});
  const repeatClinics = Object.values(clinicCounts).filter((n) => n > 1).length;

  return {
    totalOrders: orderRows.length,
    revenue,
    avgOrder,
    pending,
    approvedProviders: providerRows.filter((p) => p.verification_status === "approved").length,
    pendingProviders: providerRows.filter((p) => p.verification_status === "submitted").length,
    activePharmacies: pharmacyRows.filter((p) => p.status === "active").length,
    catalogSize: productRows.length,
    byPharmacy,
    topProducts,
    repeatClinics,
    paymentFailed: orderRows.filter((o) => o.payment_status === "failed").length
  };
}

import { getSupabaseAdminClient, hasSecretKey } from "@/lib/supabase/server";
import { toDbTenantId, toUiTenantId } from "@/lib/tenants/ids";
import type {
  ClinicOrder,
  ComplianceEvent,
  MarketplaceProduct,
  PharmacyPartner,
  ProviderCredential
} from "@/modules/healthcare/model/pharmacy-marketplace";

export type MarketplaceRemoteSnapshot = {
  version: number;
  tenantId?: string;
  pharmacies: PharmacyPartner[];
  products: MarketplaceProduct[];
  providers: ProviderCredential[];
  orders: ClinicOrder[];
  compliance: ComplianceEvent[];
};

function remapTenant(row: Record<string, unknown>, toDb: boolean): Record<string, unknown> {
  const next = { ...row };
  if (typeof next.tenant_id === "string") {
    next.tenant_id = toDb ? toDbTenantId(next.tenant_id) : toUiTenantId(next.tenant_id);
  }
  return next;
}

function num(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function pharmacyToDb(p: PharmacyPartner): Record<string, unknown> {
  return remapTenant(
    {
      id: p.id,
      tenant_id: p.tenant_id,
      name: p.name,
      code: p.code,
      npi: p.npi ?? null,
      license_no: p.license_no ?? null,
      email: p.email ?? null,
      phone: p.phone ?? null,
      address: p.address ?? null,
      api_mode: p.api_mode,
      status: p.status,
      notes: p.notes ?? null,
      created_at: p.created_at,
      updated_at: p.updated_at,
      is_active: p.is_active !== false
    },
    true
  );
}

function pharmacyFromDb(row: Record<string, unknown>): PharmacyPartner {
  const r = remapTenant(row, false);
  return {
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    name: String(r.name),
    code: String(r.code),
    npi: r.npi ? String(r.npi) : null,
    license_no: r.license_no ? String(r.license_no) : null,
    email: r.email ? String(r.email) : null,
    phone: r.phone ? String(r.phone) : null,
    address: r.address ? String(r.address) : null,
    api_mode: (r.api_mode as PharmacyPartner["api_mode"]) ?? "manual",
    status: (r.status as PharmacyPartner["status"]) ?? "pending",
    notes: r.notes ? String(r.notes) : null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
    is_active: r.is_active !== false
  };
}

function productToDb(p: MarketplaceProduct): Record<string, unknown> {
  return remapTenant(
    {
      id: p.id,
      tenant_id: p.tenant_id,
      pharmacy_id: p.pharmacy_id,
      pharmacy_name: p.pharmacy_name,
      sku: p.sku,
      name: p.name,
      category: p.category,
      description: p.description ?? null,
      strength: p.strength ?? null,
      form: p.form ?? null,
      unit_price: p.unit_price,
      compare_price: p.compare_price ?? null,
      stock_qty: p.stock_qty,
      featured: p.featured,
      controlled: p.controlled,
      warning: p.warning ?? null,
      education: p.education ?? null,
      image_url: p.image_url ?? null,
      status: p.status,
      created_at: p.created_at,
      updated_at: p.updated_at,
      is_active: p.is_active !== false
    },
    true
  );
}

function productFromDb(row: Record<string, unknown>): MarketplaceProduct {
  const r = remapTenant(row, false);
  return {
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    pharmacy_id: String(r.pharmacy_id),
    pharmacy_name: String(r.pharmacy_name),
    sku: String(r.sku),
    name: String(r.name),
    category: String(r.category),
    description: r.description ? String(r.description) : null,
    strength: r.strength ? String(r.strength) : null,
    form: r.form ? String(r.form) : null,
    unit_price: num(r.unit_price),
    compare_price: r.compare_price != null ? num(r.compare_price) : null,
    stock_qty: num(r.stock_qty),
    featured: Boolean(r.featured),
    controlled: Boolean(r.controlled),
    warning: r.warning ? String(r.warning) : null,
    education: r.education ? String(r.education) : null,
    image_url: r.image_url ? String(r.image_url) : null,
    status: (r.status as MarketplaceProduct["status"]) ?? "active",
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
    is_active: r.is_active !== false
  };
}

function providerToDb(p: ProviderCredential): Record<string, unknown> {
  return remapTenant(
    {
      id: p.id,
      tenant_id: p.tenant_id,
      full_name: p.full_name,
      role_type: p.role_type,
      clinic_name: p.clinic_name,
      email: p.email,
      phone: p.phone ?? null,
      npi: p.npi,
      license_no: p.license_no,
      license_state: p.license_state ?? null,
      dea_number: p.dea_number ?? null,
      document_note: p.document_note ?? null,
      verification_status: p.verification_status,
      can_order: p.can_order,
      mfa_enabled: p.mfa_enabled,
      reviewed_by: p.reviewed_by ?? null,
      reviewed_at: p.reviewed_at ?? null,
      reject_reason: p.reject_reason ?? null,
      created_at: p.created_at,
      updated_at: p.updated_at,
      is_active: p.is_active !== false
    },
    true
  );
}

function providerFromDb(row: Record<string, unknown>): ProviderCredential {
  const r = remapTenant(row, false);
  return {
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    full_name: String(r.full_name),
    role_type: r.role_type as ProviderCredential["role_type"],
    clinic_name: String(r.clinic_name),
    email: String(r.email),
    phone: r.phone ? String(r.phone) : null,
    npi: String(r.npi),
    license_no: String(r.license_no),
    license_state: r.license_state ? String(r.license_state) : null,
    dea_number: r.dea_number ? String(r.dea_number) : null,
    document_note: r.document_note ? String(r.document_note) : null,
    verification_status: r.verification_status as ProviderCredential["verification_status"],
    can_order: Boolean(r.can_order),
    mfa_enabled: Boolean(r.mfa_enabled),
    reviewed_by: r.reviewed_by ? String(r.reviewed_by) : null,
    reviewed_at: r.reviewed_at ? String(r.reviewed_at) : null,
    reject_reason: r.reject_reason ? String(r.reject_reason) : null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
    is_active: r.is_active !== false
  };
}

function orderToDb(o: ClinicOrder): Record<string, unknown> {
  return remapTenant(
    {
      id: o.id,
      tenant_id: o.tenant_id,
      order_no: o.order_no,
      provider_id: o.provider_id,
      provider_name: o.provider_name,
      clinic_name: o.clinic_name,
      patient_name: o.patient_name,
      patient_dob: o.patient_dob ?? null,
      patient_mrn: o.patient_mrn ?? null,
      pharmacy_id: o.pharmacy_id,
      pharmacy_name: o.pharmacy_name,
      status: o.status,
      payment_status: o.payment_status,
      order_date: o.order_date,
      shipping_address: o.shipping_address ?? null,
      dosage_notes: o.dosage_notes ?? null,
      medical_necessity: o.medical_necessity ?? null,
      attestation_signed: o.attestation_signed,
      consent_acknowledged: o.consent_acknowledged,
      subtotal: o.subtotal,
      shipping_fee: o.shipping_fee,
      platform_fee: o.platform_fee,
      tax_amount: o.tax_amount,
      total_amount: o.total_amount,
      tracking_no: o.tracking_no ?? null,
      invoice_no: o.invoice_no ?? null,
      lines: o.lines ?? [],
      created_at: o.created_at,
      updated_at: o.updated_at,
      is_active: o.is_active !== false
    },
    true
  );
}

function orderFromDb(row: Record<string, unknown>): ClinicOrder {
  const r = remapTenant(row, false);
  return {
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    order_no: String(r.order_no),
    provider_id: String(r.provider_id),
    provider_name: String(r.provider_name),
    clinic_name: String(r.clinic_name),
    patient_name: String(r.patient_name),
    patient_dob: r.patient_dob ? String(r.patient_dob).slice(0, 10) : null,
    patient_mrn: r.patient_mrn ? String(r.patient_mrn) : null,
    pharmacy_id: String(r.pharmacy_id),
    pharmacy_name: String(r.pharmacy_name),
    status: r.status as ClinicOrder["status"],
    payment_status: r.payment_status as ClinicOrder["payment_status"],
    order_date: String(r.order_date).slice(0, 10),
    shipping_address: r.shipping_address ? String(r.shipping_address) : null,
    dosage_notes: r.dosage_notes ? String(r.dosage_notes) : null,
    medical_necessity: r.medical_necessity ? String(r.medical_necessity) : null,
    attestation_signed: Boolean(r.attestation_signed),
    consent_acknowledged: Boolean(r.consent_acknowledged),
    subtotal: num(r.subtotal),
    shipping_fee: num(r.shipping_fee),
    platform_fee: num(r.platform_fee),
    tax_amount: num(r.tax_amount),
    total_amount: num(r.total_amount),
    tracking_no: r.tracking_no ? String(r.tracking_no) : null,
    invoice_no: r.invoice_no ? String(r.invoice_no) : null,
    lines: Array.isArray(r.lines) ? (r.lines as ClinicOrder["lines"]) : [],
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
    is_active: r.is_active !== false
  };
}

function complianceToDb(e: ComplianceEvent): Record<string, unknown> {
  return remapTenant(
    {
      id: e.id,
      tenant_id: e.tenant_id,
      created_at: e.created_at,
      actor: e.actor,
      action: e.action,
      entity_type: e.entity_type,
      entity_id: e.entity_id ?? null,
      detail: e.detail,
      phi_touch: e.phi_touch
    },
    true
  );
}

function complianceFromDb(row: Record<string, unknown>): ComplianceEvent {
  const r = remapTenant(row, false);
  return {
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    created_at: String(r.created_at),
    actor: String(r.actor),
    action: String(r.action),
    entity_type: String(r.entity_type),
    entity_id: r.entity_id ? String(r.entity_id) : null,
    detail: String(r.detail),
    phi_touch: Boolean(r.phi_touch)
  };
}

export function isMarketplaceSupabaseSyncEnabled() {
  return hasSecretKey() && process.env.NEXT_PUBLIC_HEALTHCARE_MARKETPLACE_USE_SUPABASE !== "false";
}

async function upsertTable(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  table: string,
  rows: Record<string, unknown>[],
  errors: string[]
) {
  if (!rows.length) return;
  const { error } = await admin.from(table).upsert(rows, { onConflict: "id" });
  if (error) errors.push(`${table} upsert: ${error.message}`);
}

export async function pushMarketplaceSnapshot(snapshot: MarketplaceRemoteSnapshot) {
  if (!isMarketplaceSupabaseSyncEnabled()) {
    return { ok: false as const, reason: "Supabase secret key missing or marketplace sync disabled" };
  }

  const admin = getSupabaseAdminClient();
  const errors: string[] = [];

  await upsertTable(admin, "pharmacy_partners", snapshot.pharmacies.map(pharmacyToDb), errors);
  await upsertTable(admin, "marketplace_products", snapshot.products.map(productToDb), errors);
  await upsertTable(admin, "provider_credentials", snapshot.providers.map(providerToDb), errors);
  await upsertTable(admin, "clinic_orders", snapshot.orders.map(orderToDb), errors);
  await upsertTable(admin, "marketplace_compliance_events", snapshot.compliance.map(complianceToDb), errors);

  return { ok: errors.length === 0, errors };
}

export async function pullMarketplaceSnapshot(uiTenantId?: string): Promise<{
  ok: boolean;
  snapshot?: MarketplaceRemoteSnapshot;
  reason?: string;
  errors?: string[];
}> {
  if (!isMarketplaceSupabaseSyncEnabled()) {
    return { ok: false, reason: "Supabase secret key missing or marketplace sync disabled" };
  }

  const admin = getSupabaseAdminClient();
  const dbTenant = uiTenantId ? toDbTenantId(uiTenantId) : null;
  const errors: string[] = [];

  let pharmaciesQ = admin.from("pharmacy_partners").select("*");
  let productsQ = admin.from("marketplace_products").select("*");
  let providersQ = admin.from("provider_credentials").select("*");
  let ordersQ = admin.from("clinic_orders").select("*");
  let complianceQ = admin
    .from("marketplace_compliance_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (dbTenant) {
    pharmaciesQ = pharmaciesQ.eq("tenant_id", dbTenant);
    productsQ = productsQ.eq("tenant_id", dbTenant);
    providersQ = providersQ.eq("tenant_id", dbTenant);
    ordersQ = ordersQ.eq("tenant_id", dbTenant);
    complianceQ = complianceQ.eq("tenant_id", dbTenant);
  }

  const [pharmaciesRes, productsRes, providersRes, ordersRes, complianceRes] = await Promise.all([
    pharmaciesQ,
    productsQ,
    providersQ,
    ordersQ,
    complianceQ
  ]);

  if (pharmaciesRes.error) errors.push(`pharmacy_partners: ${pharmaciesRes.error.message}`);
  if (productsRes.error) errors.push(`marketplace_products: ${productsRes.error.message}`);
  if (providersRes.error) errors.push(`provider_credentials: ${providersRes.error.message}`);
  if (ordersRes.error) errors.push(`clinic_orders: ${ordersRes.error.message}`);
  if (complianceRes.error) errors.push(`marketplace_compliance_events: ${complianceRes.error.message}`);

  const snapshot: MarketplaceRemoteSnapshot = {
    version: 1,
    tenantId: uiTenantId,
    pharmacies: (pharmaciesRes.data ?? []).map((r) => pharmacyFromDb(r as Record<string, unknown>)),
    products: (productsRes.data ?? []).map((r) => productFromDb(r as Record<string, unknown>)),
    providers: (providersRes.data ?? []).map((r) => providerFromDb(r as Record<string, unknown>)),
    orders: (ordersRes.data ?? []).map((r) => orderFromDb(r as Record<string, unknown>)),
    compliance: (complianceRes.data ?? []).map((r) => complianceFromDb(r as Record<string, unknown>))
  };

  return { ok: errors.length === 0 || Boolean(snapshot.pharmacies.length || snapshot.products.length), snapshot, errors: errors.length ? errors : undefined };
}

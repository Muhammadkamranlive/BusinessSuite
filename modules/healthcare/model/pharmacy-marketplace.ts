import type { TenantEntity, UUID } from "@/modules/core/types";

/** Marketplace product categories (provider ordering). */
export const MARKETPLACE_CATEGORIES = [
  "Weight management",
  "Recovery and healing",
  "Hormone optimization",
  "Sexual wellness",
  "Performance and body composition",
  "Longevity and wellness",
  "Injectable nutrients",
  "Additional treatments"
] as const;

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number];

export type PharmacyPartnerStatus = "pending" | "active" | "suspended";
export type ProviderVerifyStatus = "draft" | "submitted" | "approved" | "rejected" | "suspended";
export type ClinicOrderStatus =
  | "draft"
  | "pending"
  | "processing"
  | "accepted"
  | "rejected"
  | "shipped"
  | "completed"
  | "canceled";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded";

export type PharmacyPartner = TenantEntity & {
  name: string;
  code: string;
  npi?: string | null;
  license_no?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  api_mode: "api" | "manual";
  status: PharmacyPartnerStatus;
  notes?: string | null;
};

export type MarketplaceProduct = TenantEntity & {
  pharmacy_id: UUID;
  pharmacy_name: string;
  sku: string;
  name: string;
  category: MarketplaceCategory | string;
  description?: string | null;
  strength?: string | null;
  form?: string | null;
  unit_price: number;
  compare_price?: number | null;
  stock_qty: number;
  featured: boolean;
  controlled: boolean;
  warning?: string | null;
  education?: string | null;
  image_url?: string | null;
  status: "active" | "inactive" | "out_of_stock";
};

export type ProviderCredential = TenantEntity & {
  full_name: string;
  role_type: "physician" | "np" | "pa" | "clinic_staff" | "clinic_admin";
  clinic_name: string;
  email: string;
  phone?: string | null;
  npi: string;
  license_no: string;
  license_state?: string | null;
  dea_number?: string | null;
  document_note?: string | null;
  verification_status: ProviderVerifyStatus;
  can_order: boolean;
  mfa_enabled: boolean;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  reject_reason?: string | null;
};

export type ClinicOrderLine = {
  id: string;
  product_id: UUID;
  product_name: string;
  pharmacy_id: UUID;
  pharmacy_name: string;
  sku: string;
  strength?: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  controlled?: boolean;
};

export type ClinicOrder = TenantEntity & {
  order_no: string;
  provider_id: UUID;
  provider_name: string;
  clinic_name: string;
  patient_name: string;
  patient_dob?: string | null;
  patient_mrn?: string | null;
  pharmacy_id: UUID;
  pharmacy_name: string;
  status: ClinicOrderStatus;
  payment_status: PaymentStatus;
  order_date: string;
  shipping_address?: string | null;
  dosage_notes?: string | null;
  medical_necessity?: string | null;
  attestation_signed: boolean;
  consent_acknowledged: boolean;
  subtotal: number;
  shipping_fee: number;
  platform_fee: number;
  tax_amount: number;
  total_amount: number;
  tracking_no?: string | null;
  lines: ClinicOrderLine[];
  invoice_no?: string | null;
};

export type ComplianceEvent = {
  id: UUID;
  tenant_id: UUID;
  created_at: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  detail: string;
  phi_touch: boolean;
};

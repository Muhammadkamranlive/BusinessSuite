import { tenants } from "@/lib/demo-data";
import type { UUID } from "@/modules/core/types";
import type { TenantBranding } from "@/modules/reporting/model";
import { getCompanyProfile } from "@/modules/hrm/services/hrm.store";

/** Resolve multi-tenant letterhead for PDFs and report headers. */
export function getTenantBranding(tenantId: UUID): TenantBranding {
  const profile = getCompanyProfile(tenantId);
  const demo = tenants.find((t) => t.id === tenantId);
  const legalName = profile?.legal_name?.trim() || demo?.name || `Tenant ${tenantId}`;

  return {
    tenantId,
    legalName,
    title: profile?.letterhead_title?.trim() || legalName,
    tagline: profile?.letterhead_tagline ?? demo?.industry ?? null,
    address: profile?.address ?? null,
    phone: profile?.phone ?? null,
    email: profile?.email ?? null,
    taxId: profile?.ntn ?? null,
    logoDataUrl: profile?.logo_data_url ?? null,
    footer: profile?.letterhead_footer ?? "Confidential — BusinessSuite ERP",
    brandColor: profile?.brand_color?.trim() || "#1877f2"
  };
}

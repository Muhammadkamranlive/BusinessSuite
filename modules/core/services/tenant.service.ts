import { tenants } from "@/lib/demo-data";
import type { Tenant, UUID } from "@/modules/core/types";

export function getTenants(): Tenant[] {
  return tenants.map((t) => ({
    id: t.id,
    name: t.name,
    industry: t.industry,
    status: "active" as const,
    created_at: new Date().toISOString()
  }));
}

export function getTenantById(id: UUID): Tenant | undefined {
  return getTenants().find((t) => t.id === id);
}

export function filterByTenant<T extends { tenant_id: UUID }>(items: T[], tenantId: UUID) {
  return items.filter((item) => item.tenant_id === tenantId);
}

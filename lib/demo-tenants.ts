import { tenants } from "@/lib/demo-data";

/** Demo workspaces that should receive starter registers when Postgres is empty. */
export const DEMO_TENANT_IDS = tenants.map((t) => t.id);

export function isDemoTenant(tenantId: string) {
  return DEMO_TENANT_IDS.includes(tenantId) || tenantId === "alpha";
}

/**
 * Maps demo UI tenant slugs ↔ Supabase `tenants.id` UUIDs from seed migration.
 * Local stores keep short slugs; remote sync remaps before upsert / after pull.
 */

export const TENANT_SLUG_TO_UUID: Record<string, string> = {
  alpha: "00000000-0000-0000-0000-000000000101",
  medix: "00000000-0000-0000-0000-000000000102",
  autoparts: "00000000-0000-0000-0000-000000000103",
  textile: "00000000-0000-0000-0000-000000000104",
  /** Local HRM seed “beta” maps to Medix until a dedicated beta tenant exists in SQL. */
  beta: "00000000-0000-0000-0000-000000000102"
};

export const TENANT_UUID_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(TENANT_SLUG_TO_UUID)
    .filter(([slug]) => slug !== "beta" && slug !== "textile")
    .map(([slug, uuid]) => [uuid, slug])
);

export function toDbTenantId(slugOrUuid: string): string {
  if (TENANT_SLUG_TO_UUID[slugOrUuid]) return TENANT_SLUG_TO_UUID[slugOrUuid];
  return slugOrUuid;
}

export function toUiTenantId(uuidOrSlug: string): string {
  if (TENANT_UUID_TO_SLUG[uuidOrSlug]) return TENANT_UUID_TO_SLUG[uuidOrSlug];
  if (TENANT_SLUG_TO_UUID[uuidOrSlug]) return uuidOrSlug;
  return uuidOrSlug;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** When true, Supabase Postgres is the source of truth (not browser localStorage seeds). */
export function isDatabasePrimary(): boolean {
  if (process.env.NEXT_PUBLIC_DB_PRIMARY === "false") return false;
  if (process.env.NEXT_PUBLIC_DB_PRIMARY === "true") return true;
  // Default: primary when server secret is configured (local .env or Vercel).
  return Boolean(
    process.env.SUPABASE_SECRET_KEY?.trim() ||
      process.env.NEXT_PUBLIC_OPS_USE_SUPABASE === "true" ||
      process.env.NEXT_PUBLIC_HRM_USE_SUPABASE === "true" ||
      process.env.NEXT_PUBLIC_AUTOMATION_USE_SUPABASE === "true"
  );
}

export function isClientDatabasePrimary(): boolean {
  if (typeof window === "undefined") return isDatabasePrimary();
  return process.env.NEXT_PUBLIC_DB_PRIMARY === "true";
}

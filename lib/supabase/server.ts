import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serverClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

function getUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
}

/** Server secret key (new) or legacy service_role alias. Never expose to the browser. */
export function getSecretKey() {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

function getPublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

/** Prefer secret key for privileged server work; fall back to publishable for read-only. */
export function getSupabaseServerClient() {
  const url = getUrl();
  const key = getSecretKey() || getPublishableKey();

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY / publishable key.");
  }

  if (!serverClient) {
    serverClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return serverClient;
}

/** Privileged client — requires SUPABASE_SECRET_KEY. Bypasses RLS. */
export function getSupabaseAdminClient() {
  const url = getUrl();
  const key = getSecretKey();

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY. Paste the full sb_secret_... key into .env.local (server-only)."
    );
  }

  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return adminClient;
}

export function hasSecretKey() {
  return Boolean(getSecretKey());
}

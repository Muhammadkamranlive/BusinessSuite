import { getSupabaseClient, getSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/client";

export type ConnectionCheckResult = {
  configured: boolean;
  ok: boolean;
  url?: string;
  message: string;
  tables?: string[];
};

export async function checkSupabaseConnection(): Promise<ConnectionCheckResult> {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      ok: false,
      message: "Supabase env vars are missing. Add them to .env.local."
    };
  }

  const { url } = getSupabaseEnv();
  const supabase = getSupabaseClient();

  try {
    const { error } = await supabase.from("tenants").select("id").limit(1);

    if (error) {
      // Relation missing still proves API auth works
      if (error.code === "PGRST205" || error.message.toLowerCase().includes("could not find the table") || error.code === "42P01") {
        return {
          configured: true,
          ok: true,
          url,
          message: "Connected to Supabase API. Platform tables not migrated yet — run npm run db:migrate.",
          tables: []
        };
      }

      return {
        configured: true,
        ok: false,
        url,
        message: `Supabase responded with an error: ${error.message}`
      };
    }

    return {
      configured: true,
      ok: true,
      url,
      message: "Connected to Supabase and tenants table is reachable.",
      tables: ["tenants"]
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      url,
      message: error instanceof Error ? error.message : "Unknown connection error"
    };
  }
}

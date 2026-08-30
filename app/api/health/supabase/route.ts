import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishable =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const secret =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return { url, publishable, secret };
}

export async function GET() {
  const { url, publishable, secret } = getEnv();

  if (!url || !publishable) {
    return NextResponse.json(
      { ok: false, configured: false, message: "Missing NEXT_PUBLIC_SUPABASE_URL or publishable key in .env.local" },
      { status: 500 }
    );
  }

  try {
    const supabase = createClient(url, publishable, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data, error } = await supabase.from("tenants").select("id, name").limit(3);

    if (error) {
      const missingTable =
        error.code === "PGRST205" ||
        error.message.toLowerCase().includes("could not find the table") ||
        error.message.toLowerCase().includes("does not exist");

      return NextResponse.json({
        ok: true,
        configured: true,
        url,
        keys: {
          publishable: true,
          secret: Boolean(secret)
        },
        migrated: !missingTable,
        message: missingTable
          ? "Connected with publishable key. Run npm run db:migrate (or SQL Editor) for initial schema."
          : `Connected with warning: ${error.message}`,
        error: missingTable ? null : error.message
      });
    }

    return NextResponse.json({
      ok: true,
      configured: true,
      url,
      keys: {
        publishable: true,
        secret: Boolean(secret)
      },
      migrated: true,
      message: "Connected to Supabase. tenants table is reachable.",
      tenants: data
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        url,
        keys: {
          publishable: true,
          secret: Boolean(secret)
        },
        message: error instanceof Error ? error.message : "Connection failed"
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { validatePassword } from "@/lib/auth/server/password-policy";
import { getSupabaseAdminClient, hasSecretKey } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Ensures a Supabase Auth user exists for demo/local accounts so MFA can be enrolled.
 * Requires SUPABASE_SECRET_KEY.
 */
export async function POST(request: Request) {
  if (!hasSecretKey()) {
    return NextResponse.json(
      { ok: false, reason: "Set SUPABASE_SECRET_KEY in .env.local to enable Auth + MFA" },
      { status: 503 }
    );
  }

  let body: { email?: string; password?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ ok: false, reason: "email and password required" }, { status: 400 });
  }
  const policyCheck = validatePassword(password);
  if (!policyCheck.ok) {
    return NextResponse.json({ ok: false, reason: policyCheck.error }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();

  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listed.error) {
    return NextResponse.json({ ok: false, reason: listed.error.message }, { status: 502 });
  }

  const existing = listed.data.users.find((u) => u.email?.toLowerCase() === email);
  if (existing) {
    return NextResponse.json({ ok: true, userId: existing.id, created: false });
  }

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: body.name ?? email }
  });

  if (created.error) {
    return NextResponse.json({ ok: false, reason: created.error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, userId: created.data.user.id, created: true });
}

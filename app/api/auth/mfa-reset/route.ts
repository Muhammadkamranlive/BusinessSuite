import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/auth/server/api-guard";
import { getSupabaseAdminClient, getSupabaseAuthClient, hasSecretKey } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Reset TOTP MFA after the user lost their authenticator app.
 * Requires email + password proof, then deletes all MFA factors via service role
 * so they can re-scan a new QR on /login/mfa.
 */
export async function POST(request: Request) {
  const rate = enforceRateLimit(request, "login");
  if (rate) return rate.response;

  if (!hasSecretKey()) {
    return NextResponse.json(
      { ok: false, error: "SUPABASE_SECRET_KEY is required to reset MFA." },
      { status: 503 }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Email and password are required." }, { status: 400 });
  }

  // Prove identity with password before wiping factors
  const auth = getSupabaseAuthClient();
  const signedIn = await auth.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.user) {
    return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
  }

  const userId = signedIn.data.user.id;
  const admin = getSupabaseAdminClient();

  const listed = await admin.auth.admin.mfa.listFactors({ userId });
  if (listed.error) {
    return NextResponse.json({ ok: false, error: listed.error.message }, { status: 502 });
  }

  const factors = listed.data?.factors ?? [];
  const removed: string[] = [];
  for (const factor of factors) {
    const del = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
    if (del.error) {
      return NextResponse.json(
        { ok: false, error: `Could not remove factor: ${del.error.message}` },
        { status: 502 }
      );
    }
    removed.push(factor.id);
  }

  return NextResponse.json({
    ok: true,
    removedCount: removed.length,
    message:
      removed.length === 0
        ? "No authenticator was enrolled. You can set up a new one."
        : "Old authenticator removed. Scan a new QR code to continue."
  });
}

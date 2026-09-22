import { NextResponse } from "next/server";
import {
  clearFailedLogins,
  getLockoutStatus,
  recordFailedLogin
} from "@/lib/auth/server/account-lockout";
import { enforceRateLimit } from "@/lib/auth/server/api-guard";
import { DEFAULT_PASSWORD_MIN } from "@/lib/auth/server/password-policy";
import { isServerAuthEnabled, loginPlatformUser } from "@/lib/auth/server/platform-users";
import { applySessionCookies } from "@/lib/auth/server/session-cookies";
import { hasSecretKey } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rate = enforceRateLimit(request, "login");
  if (rate) return rate.response;

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

  const lock = await getLockoutStatus(email);
  if (lock.locked) {
    const mins = lock.lockedUntil
      ? Math.max(1, Math.ceil((lock.lockedUntil - Date.now()) / 60000))
      : 30;
    return NextResponse.json(
      {
        ok: false,
        error: `Account locked after failed attempts. Try again in ~${mins} minutes or contact an administrator.`,
        locked: true
      },
      { status: 423 }
    );
  }

  // Soft check on length for login attempts (full complexity enforced on set/change)
  if (password.length < 8) {
    await recordFailedLogin(email);
    return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
  }

  if (!hasSecretKey()) {
    return NextResponse.json(
      { ok: false, error: "Server auth requires SUPABASE_SECRET_KEY. Configure Supabase on Vercel." },
      { status: 503 }
    );
  }

  try {
    const profile = await loginPlatformUser(email, password);
    await clearFailedLogins(email);
    const response = NextResponse.json({
      ok: true,
      profile: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        title: profile.title,
        tenantId: profile.tenantId,
        status: profile.status
      },
      passwordPolicyHint: {
        minLength: DEFAULT_PASSWORD_MIN,
        rotationDays: 90
      }
    });
    applySessionCookies(response, profile.email, profile.tenantId);
    return response;
  } catch (err) {
    const fail = await recordFailedLogin(email);
    const message = err instanceof Error ? err.message : "Login failed";
    const suffix =
      fail.locked
        ? " Account locked after too many failed attempts."
        : fail.remainingAttempts <= 2
          ? ` ${fail.remainingAttempts} attempt(s) remaining before lockout.`
          : "";
    return NextResponse.json(
      { ok: false, error: `${message}${suffix}`, locked: fail.locked },
      { status: fail.locked ? 423 : 401 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    serverAuth: isServerAuthEnabled(),
    passwordMinLength: DEFAULT_PASSWORD_MIN
  });
}

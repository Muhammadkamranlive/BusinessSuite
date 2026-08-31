import { NextResponse } from "next/server";
import { isServerAuthEnabled, loginPlatformUser } from "@/lib/auth/server/platform-users";
import { applySessionCookies } from "@/lib/auth/server/session-cookies";
import { hasSecretKey } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  if (!hasSecretKey()) {
    return NextResponse.json(
      { ok: false, error: "Server auth requires SUPABASE_SECRET_KEY. Configure Supabase on Vercel." },
      { status: 503 }
    );
  }

  try {
    const profile = await loginPlatformUser(email, password);
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
      }
    });
    applySessionCookies(response, profile.email, profile.tenantId);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, serverAuth: isServerAuthEnabled() });
}

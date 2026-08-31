import { NextResponse } from "next/server";
import { invitePlatformUser, listProfilesForTenant } from "@/lib/auth/server/platform-users";
import { sessionCookieName } from "@/lib/auth/server/session-cookies";
import type { RoleKey } from "@/lib/permissions";
import { hasSecretKey } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!hasSecretKey()) {
    return NextResponse.json({ ok: false, error: "SUPABASE_SECRET_KEY required" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId") ?? "alpha";

  try {
    const users = await listProfilesForTenant(tenantId);
    return NextResponse.json({ ok: true, users });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to list users" },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  if (!hasSecretKey()) {
    return NextResponse.json({ ok: false, error: "SUPABASE_SECRET_KEY required" }, { status: 503 });
  }

  const jar = await cookies();
  const actorEmail = jar.get(sessionCookieName)?.value ?? "admin";

  let body: {
    name?: string;
    email?: string;
    role?: RoleKey;
    title?: string;
    tenantId?: string;
    password?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const role = body.role;
  const tenantId = body.tenantId ?? "alpha";
  const password = body.password ?? "";

  if (!name || !email || !role) {
    return NextResponse.json({ ok: false, error: "name, email, and role are required" }, { status: 400 });
  }

  try {
    const user = await invitePlatformUser({
      name,
      email,
      role,
      title: body.title,
      tenantId,
      password
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        tenantId: user.tenantId,
        status: user.status
      },
      actorEmail,
      existingLogin: false,
      password: password || null
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Invite failed" },
      { status: 400 }
    );
  }
}

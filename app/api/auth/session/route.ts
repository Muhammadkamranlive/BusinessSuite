import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionCookieName, tenantCookieName } from "@/lib/auth/server/session-cookies";
import { findProfileByEmail, listMembershipsByEmailServer } from "@/lib/auth/server/platform-users";
import { hasSecretKey } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  const email = jar.get(sessionCookieName)?.value?.trim().toLowerCase();
  const tenantId = jar.get(tenantCookieName)?.value ?? null;

  if (!email) {
    return NextResponse.json({ ok: false, authenticated: false });
  }

  if (!hasSecretKey()) {
    return NextResponse.json({
      ok: true,
      authenticated: true,
      email,
      tenantId,
      profile: null,
      memberships: []
    });
  }

  try {
    const memberships = await listMembershipsByEmailServer(email);
    const profile =
      memberships.find((m) => m.tenantId === tenantId) ?? memberships[0] ?? (await findProfileByEmail(email));

    return NextResponse.json({
      ok: true,
      authenticated: true,
      email,
      tenantId: tenantId ?? profile?.tenantId ?? null,
      profile: profile
        ? {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role,
            title: profile.title,
            tenantId: profile.tenantId,
            status: profile.status
          }
        : null,
      memberships: memberships.map((m) => ({
        id: m.id,
        email: m.email,
        name: m.name,
        role: m.role,
        title: m.title,
        tenantId: m.tenantId,
        status: m.status
      }))
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      authenticated: Boolean(email),
      email,
      tenantId,
      error: err instanceof Error ? err.message : "Session lookup failed"
    });
  }
}

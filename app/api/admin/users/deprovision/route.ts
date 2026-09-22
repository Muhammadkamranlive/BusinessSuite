import { NextResponse } from "next/server";
import { requireApiSession, requireCompanyAdmin } from "@/lib/auth/server/api-guard";
import { deprovisionPlatformUser, findProfileByEmail } from "@/lib/auth/server/platform-users";
import { hasSecretKey } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasSecretKey()) {
    return NextResponse.json({ ok: false, error: "SUPABASE_SECRET_KEY required" }, { status: 503 });
  }

  const sessionResult = await requireApiSession(request);
  if (!sessionResult.ok) return sessionResult.response;

  const adminGate = requireCompanyAdmin(sessionResult.session);
  if (adminGate) return adminGate.response;

  let body: { email?: string; id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const profileId = body.id?.trim();
  const email = body.email?.trim().toLowerCase();

  if (!profileId && !email) {
    return NextResponse.json({ ok: false, error: "email or id required" }, { status: 400 });
  }

  try {
    let targetId = profileId;
    if (!targetId && email) {
      const profile = await findProfileByEmail(email);
      if (!profile) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
      targetId = profile.id;
    }

    const result = await deprovisionPlatformUser(targetId!, sessionResult.session.email);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Deprovision failed" },
      { status: 400 }
    );
  }
}

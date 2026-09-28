import { NextResponse } from "next/server";
import { assertTenantMatch, requireApiSession } from "@/lib/auth/server/api-guard";
import {
  isPharmacySupabaseSyncEnabled,
  pullPharmacySnapshot,
  pushPharmacySnapshot,
  type PharmacyRemoteSnapshot
} from "@/modules/pharmacy/services/pharmacy.supabase-sync";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const tenantParam = new URL(request.url).searchParams.get("tenantId");
  const guard = await requireApiSession(request);
  if (!guard.ok) return guard.response;
  const mismatch = assertTenantMatch(guard.session, tenantParam);
  if (mismatch) return mismatch.response;

  if (!isPharmacySupabaseSyncEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "Alif Pharmacy Supabase sync is off. Set SUPABASE_SECRET_KEY."
    });
  }

  try {
    const result = await pullPharmacySnapshot(tenantParam ?? guard.session.tenantId);
    if (!result.ok && !result.snapshot) {
      return NextResponse.json(result, { status: 502 });
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: err instanceof Error ? err.message : "Pharmacy sync failed" },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  let body: PharmacyRemoteSnapshot;
  try {
    body = (await request.json()) as PharmacyRemoteSnapshot;
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || body.version == null) {
    return NextResponse.json({ ok: false, reason: "Expected pharmacy snapshot payload" }, { status: 400 });
  }

  const tenantHint =
    body.tenantId ??
    body.products?.[0]?.tenant_id ??
    body.sales?.[0]?.tenant_id ??
    null;

  const guard = await requireApiSession(request);
  if (!guard.ok) return guard.response;
  const mismatch = assertTenantMatch(guard.session, tenantHint);
  if (mismatch) return mismatch.response;

  if (!isPharmacySupabaseSyncEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "Alif Pharmacy Supabase sync is off. Set SUPABASE_SECRET_KEY."
    });
  }

  try {
    const result = await pushPharmacySnapshot(body);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: err instanceof Error ? err.message : "Pharmacy sync push failed" },
      { status: 502 }
    );
  }
}

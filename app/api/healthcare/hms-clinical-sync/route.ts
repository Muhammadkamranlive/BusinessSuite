import { NextResponse } from "next/server";
import { guardHealthcarePhiRoute } from "@/lib/auth/server/api-guard";
import {
  isHmsClinicalSupabaseSyncEnabled,
  pullHmsClinicalSnapshot,
  pushHmsClinicalSnapshot,
  type HmsClinicalRemoteSnapshot
} from "@/modules/healthcare/services/hms-clinical.supabase-sync";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const tenantId = new URL(request.url).searchParams.get("tenantId") ?? undefined;
  const guard = await guardHealthcarePhiRoute(request, tenantId);
  if (!guard.ok) return guard.response;

  if (!isHmsClinicalSupabaseSyncEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "HMS clinical Supabase sync is off. Set SUPABASE_SECRET_KEY."
    });
  }
  const result = await pullHmsClinicalSnapshot(tenantId ?? guard.session.tenantId);
  if (!result.ok && !result.snapshot) return NextResponse.json(result, { status: 502 });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  let body: HmsClinicalRemoteSnapshot;
  try {
    body = (await request.json()) as HmsClinicalRemoteSnapshot;
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || body.version == null) {
    return NextResponse.json({ ok: false, reason: "Expected HMS clinical snapshot payload" }, { status: 400 });
  }

  const tenantHint =
    (body as { wards?: Array<{ tenant_id?: string }> }).wards?.[0]?.tenant_id ??
    (body as { tenantId?: string }).tenantId ??
    null;
  const guard = await guardHealthcarePhiRoute(request, tenantHint);
  if (!guard.ok) return guard.response;

  if (!isHmsClinicalSupabaseSyncEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "HMS clinical Supabase sync is off. Set SUPABASE_SECRET_KEY."
    });
  }
  const result = await pushHmsClinicalSnapshot(body);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

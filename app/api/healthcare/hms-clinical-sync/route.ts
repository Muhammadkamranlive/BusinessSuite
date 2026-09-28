import { NextResponse } from "next/server";
import { guardHealthcarePhiRoute } from "@/lib/auth/server/api-guard";
import {
  assertJsonObject,
  invalidRequestResponse,
  requireTenantId
} from "@/lib/healthcare/hms-request-validate";
import { safeLog } from "@/lib/healthcare/phi-redact";
import {
  isHmsClinicalSupabaseSyncEnabled,
  pullHmsClinicalSnapshot,
  pushHmsClinicalSnapshot,
  type HmsClinicalRemoteSnapshot
} from "@/modules/healthcare/services/hms-clinical.supabase-sync";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const tenantParam = new URL(request.url).searchParams.get("tenantId");
  const tenantId = tenantParam ?? undefined;
  if (tenantParam) {
    const check = requireTenantId(tenantParam);
    if (!check.ok) return invalidRequestResponse(check.error);
  }
  const guard = await guardHealthcarePhiRoute(request, tenantId);
  if (!guard.ok) return guard.response;

  if (!isHmsClinicalSupabaseSyncEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "HMS clinical Supabase sync is off. Set SUPABASE_SECRET_KEY."
    });
  }
  try {
    const result = await pullHmsClinicalSnapshot(tenantId ?? guard.session.tenantId);
    if (!result.ok && !result.snapshot) return NextResponse.json(result, { status: 502 });
    return NextResponse.json(result);
  } catch (err) {
    safeLog("hms-clinical-sync GET failed", { error: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json({ ok: false, reason: "HMS clinical sync failed" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  let body: HmsClinicalRemoteSnapshot;
  try {
    body = (await request.json()) as HmsClinicalRemoteSnapshot;
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON body" }, { status: 400 });
  }
  if (!assertJsonObject(body) || body.version == null) {
    return NextResponse.json({ ok: false, reason: "Expected HMS clinical snapshot payload" }, { status: 400 });
  }

  const tenantHint =
    (body as { wards?: Array<{ tenant_id?: string }> }).wards?.[0]?.tenant_id ??
    (body as { tenantId?: string }).tenantId ??
    null;
  if (tenantHint) {
    const check = requireTenantId(String(tenantHint));
    if (!check.ok) return invalidRequestResponse(check.error);
  }
  const guard = await guardHealthcarePhiRoute(request, tenantHint);
  if (!guard.ok) return guard.response;

  if (!isHmsClinicalSupabaseSyncEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "HMS clinical Supabase sync is off. Set SUPABASE_SECRET_KEY."
    });
  }
  try {
    const result = await pushHmsClinicalSnapshot(body);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    safeLog("hms-clinical-sync POST failed", { error: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json({ ok: false, reason: "HMS clinical sync push failed" }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { guardHealthcarePhiRoute } from "@/lib/auth/server/api-guard";
import {
  assertJsonObject,
  invalidRequestResponse,
  requireTenantId
} from "@/lib/healthcare/hms-request-validate";
import { safeLog } from "@/lib/healthcare/phi-redact";
import {
  isHmsSupabaseSyncEnabled,
  pullHmsSnapshot,
  pushHmsSnapshot,
  type HmsRemoteSnapshot
} from "@/modules/healthcare/services/hms.supabase-sync";

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

  if (!isHmsSupabaseSyncEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "HMS Supabase sync is off. Set SUPABASE_SECRET_KEY."
    });
  }
  try {
    const result = await pullHmsSnapshot(tenantId ?? guard.session.tenantId);
    if (!result.ok && !result.snapshot) return NextResponse.json(result, { status: 502 });
    return NextResponse.json(result);
  } catch (err) {
    safeLog("hms-sync GET failed", { error: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json({ ok: false, reason: "HMS sync failed" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  let body: HmsRemoteSnapshot;
  try {
    body = (await request.json()) as HmsRemoteSnapshot;
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON body" }, { status: 400 });
  }
  if (!assertJsonObject(body) || body.version == null) {
    return NextResponse.json({ ok: false, reason: "Expected HMS snapshot payload" }, { status: 400 });
  }

  const tenantHint =
    (body as { patients?: Array<{ tenant_id?: string }> }).patients?.[0]?.tenant_id ??
    (body as { tenantId?: string }).tenantId ??
    null;
  if (tenantHint) {
    const check = requireTenantId(String(tenantHint));
    if (!check.ok) return invalidRequestResponse(check.error);
  }
  const guard = await guardHealthcarePhiRoute(request, tenantHint);
  if (!guard.ok) return guard.response;

  if (!isHmsSupabaseSyncEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "HMS Supabase sync is off. Set SUPABASE_SECRET_KEY."
    });
  }
  try {
    const result = await pushHmsSnapshot(body);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    safeLog("hms-sync POST failed", { error: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json({ ok: false, reason: "HMS sync push failed" }, { status: 502 });
  }
}

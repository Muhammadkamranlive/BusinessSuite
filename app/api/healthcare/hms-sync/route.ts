import { NextResponse } from "next/server";
import { guardHealthcarePhiRoute } from "@/lib/auth/server/api-guard";
import {
  isHmsSupabaseSyncEnabled,
  pullHmsSnapshot,
  pushHmsSnapshot,
  type HmsRemoteSnapshot
} from "@/modules/healthcare/services/hms.supabase-sync";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const tenantId = new URL(request.url).searchParams.get("tenantId") ?? undefined;
  const guard = await guardHealthcarePhiRoute(request, tenantId);
  if (!guard.ok) return guard.response;

  if (!isHmsSupabaseSyncEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "HMS Supabase sync is off. Set SUPABASE_SECRET_KEY."
    });
  }
  const result = await pullHmsSnapshot(tenantId ?? guard.session.tenantId);
  if (!result.ok && !result.snapshot) return NextResponse.json(result, { status: 502 });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  let body: HmsRemoteSnapshot;
  try {
    body = (await request.json()) as HmsRemoteSnapshot;
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || body.version == null) {
    return NextResponse.json({ ok: false, reason: "Expected HMS snapshot payload" }, { status: 400 });
  }

  const tenantHint =
    (body as { patients?: Array<{ tenant_id?: string }> }).patients?.[0]?.tenant_id ??
    (body as { tenantId?: string }).tenantId ??
    null;
  const guard = await guardHealthcarePhiRoute(request, tenantHint);
  if (!guard.ok) return guard.response;

  if (!isHmsSupabaseSyncEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "HMS Supabase sync is off. Set SUPABASE_SECRET_KEY."
    });
  }
  const result = await pushHmsSnapshot(body);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

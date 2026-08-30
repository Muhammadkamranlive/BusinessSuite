import { NextResponse } from "next/server";
import { isHrmSupabaseSyncEnabled, pullHrmSnapshot, pushHrmSnapshot, type HrmRemoteSnapshot } from "@/modules/hrm/services/hrm.supabase-sync";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isHrmSupabaseSyncEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "HRM Supabase sync is off. Set SUPABASE_SECRET_KEY (or unset NEXT_PUBLIC_HRM_USE_SUPABASE=false)."
    });
  }

  const tenantId = new URL(request.url).searchParams.get("tenantId") ?? undefined;
  const result = await pullHrmSnapshot(tenantId ?? undefined);
  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  if (!isHrmSupabaseSyncEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "HRM Supabase sync is off. Set SUPABASE_SECRET_KEY (or unset NEXT_PUBLIC_HRM_USE_SUPABASE=false)."
    });
  }

  let body: HrmRemoteSnapshot;
  try {
    body = (await request.json()) as HrmRemoteSnapshot;
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || body.version == null) {
    return NextResponse.json({ ok: false, reason: "Expected HRM snapshot payload" }, { status: 400 });
  }

  const result = await pushHrmSnapshot(body);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

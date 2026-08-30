import { NextResponse } from "next/server";
import {
  isWorkdaySupabaseSyncEnabled,
  pullWorkdaySnapshot,
  pushWorkdaySnapshot,
  type WorkdayRemoteSnapshot
} from "@/modules/hrm/services/workday.supabase-sync";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isWorkdaySupabaseSyncEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "HRM Supabase sync is off. Set SUPABASE_SECRET_KEY (or unset NEXT_PUBLIC_HRM_USE_SUPABASE=false)."
    });
  }

  const tenantId = new URL(request.url).searchParams.get("tenantId") ?? undefined;
  const result = await pullWorkdaySnapshot(tenantId ?? undefined);
  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  if (!isWorkdaySupabaseSyncEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "HRM Supabase sync is off. Set SUPABASE_SECRET_KEY (or unset NEXT_PUBLIC_HRM_USE_SUPABASE=false)."
    });
  }

  let body: WorkdayRemoteSnapshot;
  try {
    body = (await request.json()) as WorkdayRemoteSnapshot;
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || body.version == null) {
    return NextResponse.json({ ok: false, reason: "Expected Workday HRM snapshot payload" }, { status: 400 });
  }

  const result = await pushWorkdaySnapshot(body);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

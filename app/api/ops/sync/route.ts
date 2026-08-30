import { NextResponse } from "next/server";
import {
  isOpsSupabaseEnabled,
  pullOpsSnapshot,
  pushOpsSnapshot,
  type OpsRemoteSnapshot
} from "@/modules/ops/services/ops.supabase-sync";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isOpsSupabaseEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "Ops Supabase sync is off. Set SUPABASE_SECRET_KEY."
    });
  }

  const tenantId = new URL(request.url).searchParams.get("tenantId") ?? undefined;
  const result = await pullOpsSnapshot(tenantId ?? undefined);
  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  if (!isOpsSupabaseEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "Ops Supabase sync is off. Set SUPABASE_SECRET_KEY."
    });
  }

  let body: OpsRemoteSnapshot;
  try {
    body = (await request.json()) as OpsRemoteSnapshot;
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, reason: "Expected ops snapshot payload" }, { status: 400 });
  }

  const result = await pushOpsSnapshot(body);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

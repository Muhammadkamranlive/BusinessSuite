import { NextResponse } from "next/server";
import {
  isExtraFieldsSupabaseSyncEnabled,
  pullExtraFieldsSnapshot,
  pushExtraFieldsSnapshot,
  type ExtraFieldsRemoteSnapshot
} from "@/modules/forms/services/extra-fields.supabase-sync";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isExtraFieldsSupabaseSyncEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "Extra-fields Supabase sync is off. Set SUPABASE_SECRET_KEY."
    });
  }

  const tenantId = new URL(request.url).searchParams.get("tenantId") ?? undefined;
  const result = await pullExtraFieldsSnapshot(tenantId ?? undefined);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.skipped ? 200 : 502 });
  }
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  if (!isExtraFieldsSupabaseSyncEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "Extra-fields Supabase sync is off. Set SUPABASE_SECRET_KEY."
    });
  }

  let body: ExtraFieldsRemoteSnapshot;
  try {
    body = (await request.json()) as ExtraFieldsRemoteSnapshot;
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || body.version == null) {
    return NextResponse.json({ ok: false, reason: "Expected extra-fields snapshot payload" }, { status: 400 });
  }

  const result = await pushExtraFieldsSnapshot(body);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

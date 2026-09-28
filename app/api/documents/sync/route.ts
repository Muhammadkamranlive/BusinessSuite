import { NextResponse } from "next/server";
import { assertTenantMatch, requireApiSession } from "@/lib/auth/server/api-guard";
import {
  isDocumentsSupabaseSyncEnabled,
  pullDocumentsSnapshot,
  pushDocumentsSnapshot,
  type DocumentsRemoteSnapshot
} from "@/modules/documents/services/documents.supabase-sync";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const tenantParam = new URL(request.url).searchParams.get("tenantId");
  const guard = await requireApiSession(request);
  if (!guard.ok) return guard.response;
  const mismatch = assertTenantMatch(guard.session, tenantParam);
  if (mismatch) return mismatch.response;

  if (!isDocumentsSupabaseSyncEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "Documents Supabase sync is off. Set SUPABASE_SECRET_KEY."
    });
  }

  try {
    const result = await pullDocumentsSnapshot(tenantParam ?? guard.session.tenantId);
    if (!result.ok && !result.snapshot) return NextResponse.json(result, { status: result.skipped ? 200 : 502 });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: err instanceof Error ? err.message : "Documents sync failed" },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  let body: DocumentsRemoteSnapshot;
  try {
    body = (await request.json()) as DocumentsRemoteSnapshot;
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || body.version == null) {
    return NextResponse.json({ ok: false, reason: "Expected documents snapshot payload" }, { status: 400 });
  }

  const tenantHint = body.tenantId ?? body.requirements?.[0]?.tenant_id ?? body.documents?.[0]?.tenant_id ?? null;
  const guard = await requireApiSession(request);
  if (!guard.ok) return guard.response;
  const mismatch = assertTenantMatch(guard.session, tenantHint);
  if (mismatch) return mismatch.response;

  if (!isDocumentsSupabaseSyncEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "Documents Supabase sync is off. Set SUPABASE_SECRET_KEY."
    });
  }

  try {
    const result = await pushDocumentsSnapshot(body);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: err instanceof Error ? err.message : "Documents sync push failed" },
      { status: 502 }
    );
  }
}

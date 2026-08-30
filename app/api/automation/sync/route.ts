import { NextResponse } from "next/server";
import {
  isAutomationSupabaseSyncEnabled,
  pullAutomationSnapshot,
  pushAutomationSnapshot,
  type AutomationRemoteSnapshot
} from "@/modules/automation/services/automation.supabase-sync";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAutomationSupabaseSyncEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "Automation Supabase sync is off. Set SUPABASE_SECRET_KEY."
    });
  }

  const tenantId = new URL(request.url).searchParams.get("tenantId") ?? undefined;
  const result = await pullAutomationSnapshot(tenantId ?? undefined);
  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  if (!isAutomationSupabaseSyncEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "Automation Supabase sync is off. Set SUPABASE_SECRET_KEY."
    });
  }

  let body: AutomationRemoteSnapshot;
  try {
    body = (await request.json()) as AutomationRemoteSnapshot;
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || body.version == null) {
    return NextResponse.json({ ok: false, reason: "Expected automation snapshot payload" }, { status: 400 });
  }

  const result = await pushAutomationSnapshot(body);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

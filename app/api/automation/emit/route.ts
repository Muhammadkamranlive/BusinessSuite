import { NextResponse } from "next/server";
import { emitBusinessEventServer } from "@/lib/automation/emit-server";
import { isAutomationSupabaseSyncEnabled } from "@/modules/automation/services/automation.supabase-sync";
import type { ModuleKey } from "@/lib/permissions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAutomationSupabaseSyncEnabled()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "Automation DB emit is off. Set SUPABASE_SECRET_KEY and run migrations."
    });
  }

  let body: {
    tenantId: string;
    module: ModuleKey | "platform";
    eventKey: string;
    title?: string;
    message?: string;
    actorEmail?: string;
    entityId?: string;
    entityLabel?: string;
    payload?: Record<string, unknown>;
    supportEmail?: string;
    companyName?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.tenantId || !body?.eventKey) {
    return NextResponse.json({ ok: false, reason: "tenantId and eventKey are required" }, { status: 400 });
  }

  const result = await emitBusinessEventServer({
    tenantId: body.tenantId,
    module: body.module || "platform",
    eventKey: body.eventKey,
    title: body.title,
    message: body.message,
    actorEmail: body.actorEmail,
    entityId: body.entityId,
    entityLabel: body.entityLabel,
    payload: body.payload,
    supportEmail: body.supportEmail,
    companyName: body.companyName
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    eventId: result.event.id,
    matched: result.matched,
    actionResults: result.actionResults
  });
}

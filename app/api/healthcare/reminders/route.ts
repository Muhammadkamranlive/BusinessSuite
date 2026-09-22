import { NextResponse } from "next/server";
import { guardHealthcarePhiRoute } from "@/lib/auth/server/api-guard";
import { EmailTemplateKey } from "@/lib/email/types";
import { emitUserAlert } from "@/lib/notifications/automate";
import { getSupabaseAdminClient, hasSecretKey } from "@/lib/supabase/server";
import { toDbTenantId, toUiTenantId } from "@/lib/tenants/ids";

export const runtime = "nodejs";

type ReminderRow = {
  id: string;
  tenant_id: string;
  channel: string;
  template_key: string;
  recipient_email?: string | null;
  recipient_phone?: string | null;
  payload_generic?: Record<string, unknown> | null;
  scheduled_at: string;
  status: string;
};

export async function POST(request: Request) {
  let body: { tenantId?: string; limit?: number };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const guard = await guardHealthcarePhiRoute(request, body.tenantId);
  if (!guard.ok) return guard.response;

  if (!hasSecretKey()) {
    return NextResponse.json({ ok: false, reason: "Supabase not configured" }, { status: 503 });
  }

  const tenantId = body.tenantId ?? guard.session.tenantId;
  const dbTenant = toDbTenantId(tenantId);
  const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 50);
  const admin = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("hms_reminder_queue")
    .select("*")
    .eq("tenant_id", dbTenant)
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, reason: error.message }, { status: 502 });
  }

  const rows = (data ?? []) as ReminderRow[];
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      if (row.channel === "email" && row.recipient_email) {
        emitUserAlert({
          tenantId: toUiTenantId(row.tenant_id),
          toEmail: row.recipient_email,
          title: "Healthcare notification",
          message: "You have a new healthcare alert. Sign in to view details.",
          kind: "generic",
          emailTemplateKey: EmailTemplateKey.GenericNotification,
          emailVariables: {
            notification_title: "Healthcare notification",
            notification_body: "A clinical event requires your attention. No patient details are included in this email."
          },
          skipInApp: true,
          auditModule: "healthcare",
          auditAction: "update"
        });
      }
      await admin
        .from("hms_reminder_queue")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", row.id);
      sent++;
    } catch {
      await admin.from("hms_reminder_queue").update({ status: "failed", sent_at: new Date().toISOString() }).eq("id", row.id);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, processed: rows.length, sent, failed });
}

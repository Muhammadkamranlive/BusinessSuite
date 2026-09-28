import { NextResponse } from "next/server";
import { guardHealthcarePhiRoute } from "@/lib/auth/server/api-guard";
import { clientIpFromRequest } from "@/lib/auth/server/rate-limit";
import { redactPhi } from "@/lib/healthcare/phi-redact";
import { requireTenantId } from "@/lib/healthcare/hms-request-validate";
import { getSupabaseAdminClient, hasSecretKey } from "@/lib/supabase/server";
import { toDbTenantId } from "@/lib/tenants/ids";

export const runtime = "nodejs";

const PHI_TABLES = [
  "pharmacy_partners",
  "marketplace_products",
  "provider_credentials",
  "clinic_orders",
  "marketplace_compliance_events",
  "hms_patients",
  "hms_patient_consents",
  "hms_appointments",
  "hms_encounters",
  "hms_clinical_notes",
  "hms_phi_audit_logs",
  "hms_break_glass",
  "hms_role_assignments"
];

type AuditActionRow = {
  action: string;
  table_name: string;
  actor_email?: string | null;
  created_at: string;
  before_diff?: Record<string, unknown> | null;
  after_diff?: Record<string, unknown> | null;
};

export async function GET(request: Request) {
  const tenantParam = new URL(request.url).searchParams.get("tenantId");
  const tenantCheck = requireTenantId(tenantParam ?? "alpha");
  if (!tenantCheck.ok) {
    return NextResponse.json({ ok: false, error: tenantCheck.error }, { status: 400 });
  }

  const guard = await guardHealthcarePhiRoute(request, tenantCheck.tenantId, {
    resource: "audit_logs",
    action: "read"
  });
  if (!guard.ok) return guard.response;

  const dbTenant = toDbTenantId(tenantCheck.tenantId);
  const tablesChecked: Array<{ table: string; exists: boolean; rlsExpected: boolean }> = [];

  if (!hasSecretKey()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Supabase admin not configured",
      tablesChecked: PHI_TABLES.map((table) => ({ table, exists: false, rlsExpected: true })),
      rlsExpected: true,
      auditLogCount: 0,
      breakGlassCount: 0,
      roleAssignmentCount: 0,
      lastAuditActions: []
    });
  }

  const admin = getSupabaseAdminClient();

  for (const table of PHI_TABLES) {
    const { error } = await admin.from(table).select("*", { count: "exact", head: true });
    tablesChecked.push({
      table,
      exists: !error || !/does not exist|PGRST205|42P01/i.test(error.message),
      rlsExpected: true
    });
  }

  const countOf = async (table: string) => {
    const { count } = await admin
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", dbTenant);
    return count ?? 0;
  };

  const [auditLogCount, breakGlassCount, roleAssignmentCount] = await Promise.all([
    countOf("hms_phi_audit_logs"),
    countOf("hms_break_glass"),
    countOf("hms_role_assignments")
  ]);

  const { data: recent } = await admin
    .from("hms_phi_audit_logs")
    .select("action, table_name, actor_email, created_at, before_diff, after_diff")
    .eq("tenant_id", dbTenant)
    .order("created_at", { ascending: false })
    .limit(5);

  const lastAuditActions = ((recent ?? []) as AuditActionRow[]).map((row) =>
    redactPhi({
      action: row.action,
      table_name: row.table_name,
      actor_email: row.actor_email,
      created_at: row.created_at,
      before_diff: row.before_diff,
      after_diff: row.after_diff
    })
  );

  await admin.from("hms_phi_audit_logs").insert({
    id: crypto.randomUUID(),
    tenant_id: dbTenant,
    created_at: new Date().toISOString(),
    actor_email: guard.session.email,
    action: "compliance_audit_run",
    table_name: "hms_phi_audit_logs",
    ip_address: clientIpFromRequest(request),
    break_glass: false,
    after_diff: {
      tables_checked: tablesChecked.length,
      audit_log_count: auditLogCount,
      break_glass_count: breakGlassCount
    }
  });

  return NextResponse.json({
    ok: true,
    tenantId: tenantCheck.tenantId,
    tablesChecked,
    rlsExpected: true,
    auditLogCount,
    breakGlassCount,
    roleAssignmentCount,
    lastAuditActions,
    ranAt: new Date().toISOString(),
    ranBy: guard.session.email
  });
}

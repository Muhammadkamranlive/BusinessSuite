import { NextResponse } from "next/server";
import {
  enforceRateLimit,
  requireApiSession,
  requireHealthcareAccess
} from "@/lib/auth/server/api-guard";

export const runtime = "nodejs";

/**
 * Rate-limited portal appointment booking gate.
 * Client persists via hms.store after API approves the request.
 */
export async function POST(request: Request) {
  const rate = enforceRateLimit(request, "booking");
  if (rate) return rate.response;

  const portalRate = enforceRateLimit(request, "portal");
  if (portalRate) return portalRate.response;

  const sessionResult = await requireApiSession(request);
  if (!sessionResult.ok) return sessionResult.response;

  const rbac = requireHealthcareAccess(sessionResult.session);
  if (rbac) return rbac.response;

  let body: {
    tenantId?: string;
    patient_id?: string;
    doctor_name?: string;
    department?: string;
    scheduled_at?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const patientId = body.patient_id?.trim();
  const scheduledAt = body.scheduled_at?.trim();
  if (!patientId || !scheduledAt) {
    return NextResponse.json({ ok: false, error: "patient_id and scheduled_at required" }, { status: 400 });
  }

  const tenantId = body.tenantId?.trim() || sessionResult.session.tenantId;

  return NextResponse.json({
    ok: true,
    approved: true,
    tenantId,
    patient_id: patientId,
    doctor_name: body.doctor_name?.trim() || null,
    department: body.department?.trim() || null,
    scheduled_at: scheduledAt,
    booked_by: sessionResult.session.email
  });
}

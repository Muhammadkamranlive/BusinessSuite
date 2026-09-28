import { NextResponse } from "next/server";
import { guardHealthcarePhiRoute } from "@/lib/auth/server/api-guard";
import { isHmsSupabaseSyncEnabled, pullHmsSnapshot } from "@/modules/healthcare/services/hms.supabase-sync";

export const runtime = "nodejs";

const CLINICAL_NAME_ROLES = new Set(["super_admin", "company_admin", "hospital_admin", "doctor", "nurse"]);

type RouteParams = { params: Promise<{ resource: string }> };

/** FHIR R4 Bundle stub — IDs only unless caller has clinical name access. */
export async function GET(request: Request, { params }: RouteParams) {
  const { resource } = await params;
  const normalized = resource.toLowerCase();
  if (normalized !== "patient" && normalized !== "encounter") {
    return NextResponse.json({ error: "Unsupported FHIR resource stub" }, { status: 404 });
  }

  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenantId") ?? undefined;
  const guard = await guardHealthcarePhiRoute(request, tenantId);
  if (!guard.ok) return guard.response;

  const tid = tenantId ?? guard.session.tenantId;
  const includeNames = CLINICAL_NAME_ROLES.has(guard.session.role);

  let patients: Array<{ id: string; mrn: string; full_name?: string }> = [];
  let encounters: Array<{ id: string; encounter_no: string; patient_id?: string | null; patient_name?: string; visit_date: string }> = [];

  if (isHmsSupabaseSyncEnabled()) {
    const pulled = await pullHmsSnapshot(tid);
    if (pulled.snapshot) {
      patients = pulled.snapshot.patients.filter((p) => p.is_active !== false && !p.anonymized);
      encounters = pulled.snapshot.encounters.filter((e) => e.is_active !== false);
    }
  }

  const meta = {
    stub: true,
    note: "BusinessSuite ERP FHIR interoperability stub — not a certified FHIR server.",
    resourceType: "Bundle",
    tenant_id: tid
  };

  if (normalized === "patient") {
    const entries = patients.slice(0, 50).map((p) => ({
      resource: {
        resourceType: "Patient",
        id: p.id,
        identifier: [{ system: "urn:businesssuite:mrn", value: p.mrn }],
        ...(includeNames ? { name: [{ text: p.full_name }] } : {})
      }
    }));
    return NextResponse.json({
      resourceType: "Bundle",
      type: "searchset",
      total: entries.length,
      meta,
      entry: entries
    });
  }

  const entries = encounters.slice(0, 50).map((e) => ({
    resource: {
      resourceType: "Encounter",
      id: e.id,
      identifier: [{ value: e.encounter_no }],
      subject: { reference: `Patient/${e.patient_id ?? "unknown"}` },
      period: { start: e.visit_date },
      ...(includeNames && e.patient_name ? { extension: [{ url: "urn:stub:subject-display", valueString: e.patient_name }] } : {})
    }
  }));

  return NextResponse.json({
    resourceType: "Bundle",
    type: "searchset",
    total: entries.length,
    meta,
    entry: entries
  });
}

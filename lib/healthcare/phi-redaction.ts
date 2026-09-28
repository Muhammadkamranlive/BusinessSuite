/**
 * Centralized PHI redaction for logs, audit diffs, and outbound telemetry.
 * Never log names, phones, emails, national IDs, or clinical free text.
 */

export type PhiRedactablePatient = {
  id?: string;
  mrn?: string;
  full_name?: string;
  dob?: string | null;
  phone?: string | null;
  email?: string | null;
  national_id?: string | null;
  address?: string | null;
  status?: string;
  anonymized?: boolean;
};

/** Safe patient shape for generic logs and error trackers. */
export function redactPatientForLog(p: Partial<PhiRedactablePatient>) {
  return {
    id: p.id,
    mrn: p.mrn,
    status: p.status,
    anonymized: p.anonymized
  };
}

/** Strip common PHI keys from arbitrary objects before logging. */
export function scrubObjectForLog<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const deny = new Set([
    "full_name",
    "patient_name",
    "phone",
    "email",
    "national_id",
    "address",
    "dob",
    "raw_message",
    "body",
    "discharge_summary",
    "chief_complaint",
    "report_text",
    "notes"
  ]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (deny.has(k)) continue;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = scrubObjectForLog(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Clinical record reference — IDs only for audit trail attachments. */
export function redactClinicalRecordRef(input: { patient_id?: string | null; record_id?: string | null }) {
  return {
    patient_id: input.patient_id ?? null,
    record_id: input.record_id ?? null
  };
}

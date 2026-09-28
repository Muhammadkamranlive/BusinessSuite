const PHI_KEY_PATTERN =
  /^(full_name|first_name|last_name|name|phone|mobile|email|national_id|ssn|address|street|city|postal|zip|dob|date_of_birth|diagnosis|diagnosis_text|clinical_note|note_text|free_text|patient_name|emergency_contact|guardian|insurance_policy|policy_no|recipient_phone|recipient_email)$/i;

const MRN_KEY_PATTERN = /^mrn$/i;

function redactMrn(value: unknown): string {
  const s = String(value ?? "");
  if (s.length <= 4) return "****";
  return `***${s.slice(-4)}`;
}

function redactScalar(key: string, value: unknown): unknown {
  if (value == null) return value;
  if (MRN_KEY_PATTERN.test(key)) return redactMrn(value);
  if (PHI_KEY_PATTERN.test(key)) return "[REDACTED]";
  if (typeof value === "string" && value.length > 120 && /diagnos|patient|address|phone|email/i.test(key)) {
    return "[REDACTED]";
  }
  return value;
}

/** Strip/redact PHI fields from objects, arrays, or scalars before logging. */
export function redactPhi<T>(value: T): T {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map((v) => redactPhi(v)) as T;
  if (typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v != null && typeof v === "object") {
      out[k] = redactPhi(v);
    } else {
      out[k] = redactScalar(k, v);
    }
  }
  return out as T;
}

/** Console.log helper — meta is redacted; never pass raw PHI. */
export function safeLog(message: string, meta?: unknown) {
  if (meta === undefined) {
    console.log(message);
    return;
  }
  console.log(message, redactPhi(meta));
}

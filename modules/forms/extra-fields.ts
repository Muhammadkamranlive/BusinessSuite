/** Tenant extra fields on top of fixed module forms. Values persist as a JSON string. */

export type ExtraFieldType = "text" | "textarea" | "number" | "date" | "select" | "checkbox";

export type ExtraFieldDef = {
  id: string;
  label: string;
  type: ExtraFieldType;
  placeholder?: string;
  default_value?: string;
  required?: boolean;
  /** Comma-separated options for select */
  options?: string;
};

export type ExtraFieldValueEntry = {
  label: string;
  type: ExtraFieldType | string;
  value: string;
};

/** fieldId → label/type/value — stored as JSON string on the record bag */
export type ExtraFieldValueMap = Record<string, ExtraFieldValueEntry>;

export const EXTRA_FIELD_TYPES: Array<{ value: ExtraFieldType; label: string }> = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" }
];

export function newExtraFieldId() {
  return `ef_${crypto.randomUUID().slice(0, 8)}`;
}

export function blankExtraField(): ExtraFieldDef {
  return {
    id: newExtraFieldId(),
    label: "",
    type: "text",
    placeholder: "",
    default_value: "",
    required: false,
    options: ""
  };
}

export function parseExtraFieldValues(json?: string | null): ExtraFieldValueMap {
  if (!json || !json.trim() || json.trim() === "{}") return {};
  try {
    const raw = JSON.parse(json) as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const out: ExtraFieldValueMap = {};
    for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
      if (entry && typeof entry === "object" && "value" in (entry as object)) {
        const row = entry as ExtraFieldValueEntry;
        out[key] = {
          label: String(row.label || key),
          type: String(row.type || "text"),
          value: row.value == null ? "" : String(row.value)
        };
        continue;
      }
      out[key] = { label: key, type: "text", value: entry == null ? "" : String(entry) };
    }
    return out;
  } catch {
    return {};
  }
}

export function stringifyExtraFieldValues(map: ExtraFieldValueMap): string {
  const cleaned: ExtraFieldValueMap = {};
  for (const [id, entry] of Object.entries(map)) {
    if (!entry) continue;
    cleaned[id] = {
      label: entry.label || id,
      type: entry.type || "text",
      value: entry.value ?? ""
    };
  }
  if (!Object.keys(cleaned).length) return "";
  return JSON.stringify(cleaned);
}

export function extraFieldValuesAreEmpty(json?: string | null) {
  const map = parseExtraFieldValues(json);
  return !Object.values(map).some((e) => String(e.value ?? "").trim() !== "" && e.value !== "false");
}

export function buildValueMapFromSchema(fields: ExtraFieldDef[], existingJson?: string | null): ExtraFieldValueMap {
  const existing = parseExtraFieldValues(existingJson);
  const next: ExtraFieldValueMap = {};
  for (const field of fields) {
    const prev = existing[field.id];
    next[field.id] = {
      label: field.label,
      type: field.type,
      value: prev?.value ?? field.default_value ?? (field.type === "checkbox" ? "false" : "")
    };
  }
  return next;
}

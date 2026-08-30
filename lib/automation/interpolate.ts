/** Simple {{path.to.value}} interpolation against a flat/nested payload. */

export function interpolate(template: string | undefined | null, vars: Record<string, unknown>): string {
  if (!template) return "";
  return String(template).replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, path: string) => {
    const value = lookup(vars, path);
    return value == null ? "" : String(value);
  });
}

function lookup(vars: Record<string, unknown>, path: string): unknown {
  if (path in vars) return vars[path];
  const parts = path.split(".");
  let cur: unknown = vars;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function flattenPayload(payload: Record<string, unknown>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v != null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flattenPayload(v as Record<string, unknown>, key));
    } else if (v != null) {
      out[key] = String(v);
      if (!prefix) out[k] = String(v);
    }
  }
  return out;
}

import { interpolate } from "@/lib/automation/interpolate";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function isValidEmailAddress(value: string) {
  return EMAIL_RE.test(value.trim());
}

/**
 * Resolve one recipient: literal address OR {{variable}}.
 * Literals without braces are returned as-is (never replaced by user_email).
 */
export function resolveRecipient(raw: string | undefined, vars: Record<string, unknown>): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";

  if (!trimmed.includes("{{")) {
    return trimmed.toLowerCase();
  }

  const resolved = interpolate(trimmed, vars).trim();
  return resolved ? resolved.toLowerCase() : "";
}

/** Comma/semicolon separated — e.g. support@co.com, admin@co.com or {{user_email}} */
export function resolveRecipients(raw: string | undefined, vars: Record<string, unknown>): string[] {
  const trimmed = (raw || "").trim();
  if (!trimmed) return [];

  const parts = trimmed.includes(",") || trimmed.includes(";")
    ? trimmed.split(/[,;]+/).map((p) => p.trim()).filter(Boolean)
    : [trimmed];

  const out: string[] = [];
  for (const part of parts) {
    const email = resolveRecipient(part, vars);
    if (email && isValidEmailAddress(email)) out.push(email);
  }
  return [...new Set(out)];
}

/** Pick the correct raw To field per action type. */
export function recipientRawForAction(action: {
  type: string;
  to?: string;
  assigneeEmail?: string;
}): string {
  if (action.type === "send_email") {
    const direct = (action.to || "").trim();
    if (direct) return direct;
    const legacy = (action.assigneeEmail || "").trim();
    if (legacy.includes("@") && !legacy.includes("{{")) return legacy;
    return "";
  }
  return (action.to || action.assigneeEmail || "").trim();
}

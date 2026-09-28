import { emitUserAlert } from "@/lib/notifications/automate";
import type { UUID } from "@/modules/core/types";

export type SecurityAlertKind = "login_lockout" | "break_glass" | "anomalous_access";

const SECURITY_RECIPIENTS = ["admin@demo.com", "finance@demo.com"];

/**
 * Generic security alert — no passwords, minimal PHI (email only).
 */
export function emitSecurityAlert(input: {
  kind: SecurityAlertKind;
  email?: string;
  tenantId?: UUID;
  title?: string;
  message?: string;
}) {
  const tenantId = input.tenantId ?? "alpha";
  const title =
    input.title ??
    (input.kind === "break_glass"
      ? "Break-glass access used"
      : input.kind === "login_lockout"
        ? "Failed login lockout"
        : "Security alert");
  const message =
    input.message ??
    (input.kind === "break_glass"
      ? "Emergency break-glass access was requested. Review the HMS compliance console."
      : input.kind === "login_lockout"
        ? `Account lockout triggered${input.email ? ` for ${input.email}` : ""}. No password details are included.`
        : "An anomalous access pattern was detected. Sign in to review audit logs.");

  for (const toEmail of SECURITY_RECIPIENTS) {
    emitUserAlert({
      kind: "generic",
      tenantId,
      toEmail,
      title,
      message,
      type: "warning",
      auditModule: "healthcare",
      auditAction: "update",
      skipEmail: false,
      meta: { security_kind: input.kind, subject_email: input.email ?? null }
    });
  }
}

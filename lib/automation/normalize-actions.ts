import type { AutomationAction } from "@/lib/automation/types";
import { isValidEmailAddress } from "@/lib/automation/recipients";

/** Pick the first literal email (no {{}}) from candidates. */
export function pickLiteralEmail(...candidates: Array<string | undefined>) {
  for (const raw of candidates) {
    const trimmed = (raw || "").trim();
    if (trimmed && trimmed.includes("@") && !trimmed.includes("{{") && isValidEmailAddress(trimmed)) {
      return trimmed.toLowerCase();
    }
  }
  return "";
}

/** Ensure send_email actions have a stable `to` field before save/load. */
export function normalizeRuleActions(actions: AutomationAction[]): AutomationAction[] {
  return actions.map((action) => {
    if (action.type !== "send_email") return action;

    const to =
      pickLiteralEmail(action.to, action.assigneeEmail) ||
      (action.to || "").trim() ||
      (action.assigneeEmail || "").trim();

    return {
      ...action,
      to,
      channel: "email",
      emailTemplateKey: action.emailTemplateKey || "generic.notification"
    };
  });
}

import { listRules } from "@/modules/automation/services/automation.store";

/** True when an enabled auth.login rule already sends email (skip duplicate built-in security mail). */
export function loginEmailHandledByAutomation(tenantId: string) {
  if (typeof window === "undefined") return false;
  return listRules(tenantId).some(
    (rule) =>
      rule.enabled &&
      rule.event_key === "auth.login" &&
      rule.actions.some((action) => action.type === "send_email")
  );
}

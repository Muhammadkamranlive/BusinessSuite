import { hydrateEmployeeLogins } from "@/lib/auth/provision-login";
import { pullAutomationFromSupabase } from "@/modules/automation/services/automation.store";
import { pullHrmFromSupabase } from "@/modules/hrm/services/hrm.store";
import { pullWorkdayFromSupabase } from "@/modules/hrm/services/workday.store";
import { pullOpsFromSupabase } from "@/modules/ops/services/ops-remote";

/** Pull tenant modules from Supabase without blocking the shell. */
export async function syncTenantFromRemote(tenantId: string) {
  await Promise.all([
    pullOpsFromSupabase(tenantId).catch(() => undefined),
    pullHrmFromSupabase(tenantId).catch(() => undefined),
    pullWorkdayFromSupabase(tenantId).catch(() => undefined),
    pullAutomationFromSupabase(tenantId).catch(() => undefined)
  ]);
  hydrateEmployeeLogins(tenantId);
}

export function syncTenantFromRemoteInBackground(tenantId: string, onSettled?: () => void) {
  void syncTenantFromRemote(tenantId).finally(() => onSettled?.());
}

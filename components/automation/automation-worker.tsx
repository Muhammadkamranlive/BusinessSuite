"use client";

import { useEffect } from "react";
import { startAutomationScheduler } from "@/lib/automation/scheduler";
import { startOutboxWorker } from "@/lib/email/outbox";
import { ensureAutomationSeeded, pullAutomationFromSupabase } from "@/modules/automation/services/automation.store";
import { getStoredTenantId } from "@/lib/auth/session";

/** Starts schedule ticks + pulls automation rules from DB. */
export function AutomationWorker() {
  useEffect(() => {
    const tenantId = getStoredTenantId() ?? "alpha";
    void pullAutomationFromSupabase(tenantId).finally(() => {
      ensureAutomationSeeded(tenantId);
    });
    startOutboxWorker();
    startAutomationScheduler();
  }, []);
  return null;
}

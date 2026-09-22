"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getStoredTenantId, getStoredUserEmail } from "@/lib/auth/session";
import { isHmsMfaPending, setHmsMfaPending } from "@/lib/auth/hms-session-policy";
import { isSupabaseAuthEnabled, mustCompleteMfaGate } from "@/lib/auth/supabase-mfa";
import { pullHmsFromSupabase, userRequiresHmsMfa } from "@/modules/healthcare/services/hms.store";

/** Blocks authenticated shell access until HMS/Supabase MFA is satisfied. */
export function MfaSessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    void (async () => {
      const email = getStoredUserEmail();
      const tenantId = getStoredTenantId();
      if (!email || !tenantId) return;

      await pullHmsFromSupabase(tenantId).catch(() => undefined);
      const hmsRequired = userRequiresHmsMfa(email, tenantId) || isHmsMfaPending();
      if (!hmsRequired && !isSupabaseAuthEnabled()) return;

      const gateNeeded = await mustCompleteMfaGate(hmsRequired);
      if (gateNeeded) {
        setHmsMfaPending(hmsRequired);
        if (pathname !== "/login/mfa") router.replace("/login/mfa");
        return;
      }
      setHmsMfaPending(false);
    })();
  }, [pathname, router]);

  return null;
}

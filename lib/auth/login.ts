import { cacheAccountFromProfile, loginAccountViaServer } from "@/lib/auth/public-auth";
import { getStoredTenantId, setDemoSession } from "@/lib/auth/session";
import { isSuperAdminRole } from "@/lib/platform-access";
import { listMembershipsByEmail } from "@/modules/admin/services/admin.store";

/** Sign in via server (Supabase Auth). Sets session cookies + in-memory profile cache. */
export async function signInToWorkspace(email: string, password: string) {
  const account = await loginAccountViaServer(email, password);
  const memberships = listMembershipsByEmail(account.email);
  const active = memberships.filter((m) => m.status !== "blocked");
  if (!isSuperAdminRole(account.role) && memberships.length > 0 && active.length === 0) {
    throw new Error("This account is blocked. Contact an administrator.");
  }

  let tenantId = account.tenantId;
  if (active.length === 0) {
    setDemoSession(account.email, account.tenantId);
  } else {
    const stored = getStoredTenantId();
    tenantId =
      (stored && active.some((m) => m.tenantId === stored) && stored) ||
      active[0]?.tenantId ||
      account.tenantId;
    setDemoSession(account.email, tenantId);
  }

  if (typeof window !== "undefined") {
    void import("@/lib/notifications/automate").then(({ automateLoginEvent }) => {
      automateLoginEvent({
        email: account.email,
        name: account.name,
        tenantId,
        userId: account.id
      });
    });
  }

  return { ...account, tenantId };
}

/** Sync wrapper for legacy call sites — prefer signInToWorkspace in async flows. */
export function signInToWorkspaceSync(email: string, password: string) {
  const cached = cacheAccountFromProfile({
    id: "pending",
    name: email,
    email,
    role: "viewer",
    title: "Viewer",
    tenantId: getStoredTenantId() ?? "alpha"
  });
  setDemoSession(email, cached.tenantId);
  return { ...cached, tenantId: cached.tenantId };
}

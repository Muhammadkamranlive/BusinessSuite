/** Persists AppShell bootstrap across client navigations so menus do not re-check session. */
export type AppSessionBootstrap = {
  userEmail: string;
  tenantId: string;
  tenantOptions: Array<{
    id: string;
    name: string;
    industry: string;
    region: string;
    plan: string;
  }>;
};

let bootstrap: AppSessionBootstrap | null = null;

export function getAppSessionBootstrap() {
  return bootstrap;
}

export function setAppSessionBootstrap(next: AppSessionBootstrap) {
  bootstrap = next;
}

export function clearAppSessionBootstrap() {
  bootstrap = null;
}

export function matchesStoredSession(userEmail: string | null, tenantId: string | null) {
  if (!bootstrap || !userEmail) return false;
  if (bootstrap.userEmail !== userEmail) return false;
  if (tenantId && bootstrap.tenantId !== tenantId) return false;
  return true;
}

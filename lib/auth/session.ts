export const userStorageKey = "businesssuite:user";
export const tenantStorageKey = "businesssuite:tenant";
export const sessionCookieName = "businesssuite_session";
export const tenantCookieName = "businesssuite_tenant";

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/** Set session cookies (mirrors server Set-Cookie on login). */
export function setDemoSession(email: string, tenantId: string) {
  writeCookie(sessionCookieName, email, SESSION_MAX_AGE);
  writeCookie(tenantCookieName, tenantId, SESSION_MAX_AGE);
}

export function clearDemoSession() {
  writeCookie(sessionCookieName, "", 0);
  writeCookie(tenantCookieName, "", 0);
  void fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
}

export function getStoredUserEmail() {
  return readCookie(sessionCookieName);
}

export function getStoredTenantId() {
  return readCookie(tenantCookieName);
}

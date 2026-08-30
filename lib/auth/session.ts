export const userStorageKey = "businesssuite:user";
export const tenantStorageKey = "businesssuite:tenant";
export const sessionCookieName = "businesssuite_session";

export function setDemoSession(email: string, tenantId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(userStorageKey, email);
  window.localStorage.setItem(tenantStorageKey, tenantId);
  document.cookie = `${sessionCookieName}=${encodeURIComponent(email)}; path=/; max-age=86400; SameSite=Lax`;
}

export function clearDemoSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(userStorageKey);
  window.localStorage.removeItem(tenantStorageKey);
  document.cookie = `${sessionCookieName}=; path=/; max-age=0; SameSite=Lax`;
}

export function getStoredUserEmail() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(userStorageKey);
}

export function getStoredTenantId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(tenantStorageKey);
}

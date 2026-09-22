/** HMS clinical idle timeout — spec §2 (15 min); overrides HRM session_hours for AppShell sessions. */
export const HMS_IDLE_TIMEOUT_MS =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_HMS_IDLE_TIMEOUT_MS
    ? Number(process.env.NEXT_PUBLIC_HMS_IDLE_TIMEOUT_MS)
    : 15 * 60 * 1000;

export const LAST_ACTIVITY_KEY = "businesssuite:last-activity";
export const HMS_MFA_PENDING_KEY = "businesssuite:hms-mfa-pending";

export function touchLastActivity() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function clearLastActivity() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LAST_ACTIVITY_KEY);
}

export function msSinceLastActivity(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!raw) return 0;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return Infinity;
  return Date.now() - ts;
}

export function isIdleTimedOut(timeoutMs = HMS_IDLE_TIMEOUT_MS): boolean {
  const elapsed = msSinceLastActivity();
  if (elapsed === 0) return false;
  return elapsed >= timeoutMs;
}

export function setHmsMfaPending(required: boolean) {
  if (typeof window === "undefined") return;
  if (required) window.sessionStorage.setItem(HMS_MFA_PENDING_KEY, "1");
  else window.sessionStorage.removeItem(HMS_MFA_PENDING_KEY);
}

export function isHmsMfaPending(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(HMS_MFA_PENDING_KEY) === "1";
}

/**
 * Password policy enforcement (HRM security policy + HMS staff defaults).
 */

export type PasswordPolicyInput = {
  password_min_length?: number;
  require_complexity?: boolean;
};

export const DEFAULT_PASSWORD_MIN = 12;
export const PASSWORD_ROTATION_DAYS = 90;

export function validatePassword(
  password: string,
  policy?: PasswordPolicyInput
): { ok: true } | { ok: false; error: string } {
  const min = Math.max(8, policy?.password_min_length ?? DEFAULT_PASSWORD_MIN);
  if (password.length < min) {
    return { ok: false, error: `Password must be at least ${min} characters.` };
  }
  const complexity = policy?.require_complexity !== false;
  if (complexity) {
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (!(hasUpper && hasLower && hasDigit && hasSpecial)) {
      return {
        ok: false,
        error: "Password must include upper, lower, digit, and special character."
      };
    }
  }
  return { ok: true };
}

export function passwordRotationDue(lastChangedAt: string | null | undefined, now = Date.now()): boolean {
  if (!lastChangedAt) return true;
  const changed = new Date(lastChangedAt).getTime();
  if (Number.isNaN(changed)) return true;
  return now - changed > PASSWORD_ROTATION_DAYS * 24 * 60 * 60 * 1000;
}

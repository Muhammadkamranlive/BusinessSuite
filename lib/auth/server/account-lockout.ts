/**
 * Failed-login lockout: 5 attempts → lock for 30 minutes (configurable).
 * In-memory with optional Postgres persistence when Supabase admin is available.
 */

import { getSupabaseAdminClient, hasSecretKey } from "@/lib/supabase/server";

export const LOCKOUT_MAX_ATTEMPTS = 5;
export const LOCKOUT_WINDOW_MS = 30 * 60 * 1000;

type LockState = {
  failures: number[];
  lockedUntil: number | null;
};

const memory = new Map<string, LockState>();

function keyOf(email: string) {
  return email.trim().toLowerCase();
}

function prune(state: LockState, now: number) {
  const windowStart = now - LOCKOUT_WINDOW_MS;
  state.failures = state.failures.filter((t) => t > windowStart);
  if (state.lockedUntil && state.lockedUntil <= now) state.lockedUntil = null;
}

export async function getLockoutStatus(email: string): Promise<{
  locked: boolean;
  remainingAttempts: number;
  lockedUntil: number | null;
}> {
  const key = keyOf(email);
  const now = Date.now();
  let state = memory.get(key) ?? { failures: [], lockedUntil: null };

  if (hasSecretKey()) {
    try {
      const admin = getSupabaseAdminClient();
      const { data } = await admin
        .from("auth_account_lockouts")
        .select("failures_json, locked_until")
        .eq("email", key)
        .maybeSingle();
      if (data) {
        const failures = Array.isArray(data.failures_json)
          ? (data.failures_json as number[])
          : [];
        state = {
          failures,
          lockedUntil: data.locked_until ? new Date(data.locked_until as string).getTime() : null
        };
        memory.set(key, state);
      }
    } catch {
      /* table may not exist yet — memory only */
    }
  }

  prune(state, now);
  memory.set(key, state);

  if (state.lockedUntil && state.lockedUntil > now) {
    return { locked: true, remainingAttempts: 0, lockedUntil: state.lockedUntil };
  }
  return {
    locked: false,
    remainingAttempts: Math.max(0, LOCKOUT_MAX_ATTEMPTS - state.failures.length),
    lockedUntil: null
  };
}

async function persist(email: string, state: LockState) {
  if (!hasSecretKey()) return;
  try {
    const admin = getSupabaseAdminClient();
    await admin.from("auth_account_lockouts").upsert(
      {
        email: keyOf(email),
        failures_json: state.failures,
        locked_until: state.lockedUntil ? new Date(state.lockedUntil).toISOString() : null,
        updated_at: new Date().toISOString()
      },
      { onConflict: "email" }
    );
  } catch {
    /* ignore persist errors */
  }
}

export async function recordFailedLogin(email: string): Promise<{
  locked: boolean;
  remainingAttempts: number;
  lockedUntil: number | null;
}> {
  const key = keyOf(email);
  const now = Date.now();
  const state = memory.get(key) ?? { failures: [], lockedUntil: null };
  prune(state, now);
  state.failures.push(now);
  if (state.failures.length >= LOCKOUT_MAX_ATTEMPTS) {
    state.lockedUntil = now + LOCKOUT_WINDOW_MS;
  }
  memory.set(key, state);
  await persist(key, state);
  if (state.lockedUntil && state.lockedUntil > now) {
    return { locked: true, remainingAttempts: 0, lockedUntil: state.lockedUntil };
  }
  return {
    locked: false,
    remainingAttempts: Math.max(0, LOCKOUT_MAX_ATTEMPTS - state.failures.length),
    lockedUntil: null
  };
}

export async function clearFailedLogins(email: string) {
  const key = keyOf(email);
  memory.set(key, { failures: [], lockedUntil: null });
  await persist(key, { failures: [], lockedUntil: null });
}

/** Admin unlock — clears lockout immediately. */
export async function unlockAccount(email: string) {
  await clearFailedLogins(email);
}

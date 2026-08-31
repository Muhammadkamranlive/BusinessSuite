/**
 * In-memory persistence — replaces browser localStorage for all ERP module snapshots.
 * Data survives navigation within a tab session; Supabase sync routes are the durable store.
 */
const memory = new Map<string, string>();
let legacyMigrated = false;

function migrateLegacyLocalStorageOnce() {
  if (legacyMigrated || typeof window === "undefined") return;
  legacyMigrated = true;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith("businesssuite:")) keys.push(k);
    }
    for (const key of keys) {
      const raw = window.localStorage.getItem(key);
      if (raw != null) memory.set(key, raw);
      window.localStorage.removeItem(key);
    }
  } catch {
    /* private mode / quota */
  }
}

export function loadPersisted<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  migrateLegacyLocalStorageOnce();
  try {
    const raw = memory.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function savePersisted(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  migrateLegacyLocalStorageOnce();
  try {
    memory.set(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function removePersisted(key: string) {
  memory.delete(key);
}

export function clearPersistedPrefix(prefix: string) {
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
}

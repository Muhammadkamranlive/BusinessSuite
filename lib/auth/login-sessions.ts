import { captureDeviceInfo, formatDeviceLabel, type DeviceInfo } from "@/lib/auth/device";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";

const STORAGE_KEY = "businesssuite:login-sessions:v1";
const MAX_PER_USER = 40;

export type LoginSession = {
  id: string;
  email: string;
  tenant_id: string;
  at: string;
  is_new_device: boolean;
  device: DeviceInfo;
  label: string;
};

type Store = Record<string, LoginSession[]>;

function readStore(): Store {
  return loadPersisted<Store>(STORAGE_KEY) ?? {};
}

function writeStore(store: Store) {
  savePersisted(STORAGE_KEY, store);
}

function keyFor(email: string) {
  return email.trim().toLowerCase();
}

export function listLoginSessions(email: string): LoginSession[] {
  return readStore()[keyFor(email)] ?? [];
}

export function knownDeviceFingerprints(email: string): Set<string> {
  return new Set(listLoginSessions(email).map((s) => s.device.fingerprint));
}

/** Record a login; returns whether this fingerprint is new for the user. */
export function recordLoginSession(input: {
  email: string;
  tenantId: string;
  device?: DeviceInfo;
}): LoginSession {
  const device = input.device ?? captureDeviceInfo();
  const email = keyFor(input.email);
  const store = readStore();
  const prev = store[email] ?? [];
  const isNew = !prev.some((s) => s.device.fingerprint === device.fingerprint);
  const session: LoginSession = {
    id: crypto.randomUUID(),
    email,
    tenant_id: input.tenantId,
    at: new Date().toISOString(),
    is_new_device: isNew,
    device,
    label: formatDeviceLabel(device)
  };
  store[email] = [session, ...prev].slice(0, MAX_PER_USER);
  writeStore(store);
  return session;
}

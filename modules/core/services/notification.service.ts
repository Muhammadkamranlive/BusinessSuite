import type { NotificationEntry, UUID } from "@/modules/core/types";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";

const STORAGE_KEY = "businesssuite:notifications:v1";
const MAX = 500;
const EVENT = "businesssuite:notifications";

let notifications: NotificationEntry[] = [];
let hydrated = false;

function now() {
  return new Date().toISOString();
}

function newId() {
  return crypto.randomUUID();
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  notifications = loadPersisted<NotificationEntry[]>(STORAGE_KEY) ?? [];
}

function persist() {
  ensureHydrated();
  savePersisted(STORAGE_KEY, notifications.slice(0, MAX));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT));
  }
}

export function subscribeNotifications(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

export function createNotification(params: {
  tenantId: UUID;
  userId?: UUID | null;
  userEmail?: string | null;
  title: string;
  message: string;
  type?: NotificationEntry["type"];
  targetModule?: string;
  targetId?: UUID;
  href?: string | null;
  event?: string | null;
}) {
  ensureHydrated();
  const entry: NotificationEntry = {
    id: newId(),
    tenant_id: params.tenantId,
    user_profile_id: params.userId ?? null,
    user_email: params.userEmail?.trim().toLowerCase() || null,
    title: params.title,
    message: params.message,
    type: params.type ?? "info",
    is_read: false,
    target_module: params.targetModule ?? null,
    target_id: params.targetId ?? null,
    href: params.href ?? null,
    event: params.event ?? null,
    created_at: now()
  };
  notifications.unshift(entry);
  persist();
  return entry;
}

export function markAsRead(id: UUID) {
  ensureHydrated();
  const item = notifications.find((n) => n.id === id);
  if (item) {
    item.is_read = true;
    persist();
  }
  return item;
}

export function markAllAsRead(tenantId: UUID, userEmail?: string | null) {
  ensureHydrated();
  const email = userEmail?.trim().toLowerCase() || null;
  let changed = false;
  for (const n of notifications) {
    if (n.tenant_id !== tenantId || n.is_read) continue;
    if (email && n.user_email && n.user_email !== email) continue;
    n.is_read = true;
    changed = true;
  }
  if (changed) persist();
}

function matchesUser(n: NotificationEntry, userEmail?: string | null, userId?: UUID | null) {
  if (!userEmail && !userId) return true;
  const email = userEmail?.trim().toLowerCase() || null;
  if (email) {
    // Broadcast (no user) OR addressed to this user
    if (!n.user_email) return true;
    return n.user_email === email;
  }
  if (userId) {
    if (!n.user_profile_id) return true;
    return n.user_profile_id === userId;
  }
  return true;
}

export function getUnreadCount(tenantId: UUID, userId?: UUID | null, userEmail?: string | null) {
  ensureHydrated();
  return notifications.filter(
    (n) => n.tenant_id === tenantId && !n.is_read && matchesUser(n, userEmail, userId)
  ).length;
}

export function getUserNotifications(tenantId: UUID, userId?: UUID | null, userEmail?: string | null) {
  ensureHydrated();
  return notifications.filter((n) => n.tenant_id === tenantId && matchesUser(n, userEmail, userId));
}

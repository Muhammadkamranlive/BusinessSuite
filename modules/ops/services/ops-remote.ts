import type { OpsRemoteSnapshot } from "@/modules/ops/services/ops.supabase-sync";
import { mergeOpsPull } from "@/modules/ops/services/ops-merge";
import { fetchJson } from "@/lib/sync-fetch";

type OpsModule = {
  build: () => Partial<OpsRemoteSnapshot>;
  apply: (snapshot: Partial<OpsRemoteSnapshot>) => void;
};

const modules: OpsModule[] = [];
let syncTimer: ReturnType<typeof setTimeout> | null = null;

export function registerOpsModule(mod: OpsModule) {
  modules.push(mod);
}

export function collectOpsSnapshot(): OpsRemoteSnapshot {
  const snapshot = { version: 3 } as OpsRemoteSnapshot;
  for (const mod of modules) {
    Object.assign(snapshot, mod.build());
  }
  return snapshot;
}

export function applyOpsSnapshot(snapshot: Partial<OpsRemoteSnapshot>) {
  for (const mod of modules) {
    mod.apply(snapshot);
  }
}

export function isOpsClientSyncEnabled() {
  return process.env.NEXT_PUBLIC_OPS_USE_SUPABASE !== "false";
}

export function queueOpsRemoteSync() {
  if (typeof window === "undefined") return;
  if (!isOpsClientSyncEnabled()) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void fetch("/api/ops/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(collectOpsSnapshot())
    }).catch(() => {
      /* offline */
    });
  }, 900);
}

export async function pullOpsFromSupabase(tenantId?: string) {
  if (typeof window === "undefined") return { ok: false as const, skipped: true };
  if (!isOpsClientSyncEnabled()) return { ok: false as const, skipped: true };
  const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
  const result = await fetchJson<{
    ok?: boolean;
    skipped?: boolean;
    snapshot?: OpsRemoteSnapshot;
    reason?: string;
  }>(`/api/ops/sync${qs}`);
  if (!result.ok) return { ok: false as const, reason: result.error };
  const { json } = result;
  if (json.skipped || !json.ok || !json.snapshot) {
    return { ok: false as const, reason: json.reason ?? "Ops sync unavailable" };
  }
  const merged = tenantId ? mergeOpsPull(collectOpsSnapshot(), json.snapshot, tenantId) : json.snapshot;
  applyOpsSnapshot(merged);
  return { ok: true as const };
}

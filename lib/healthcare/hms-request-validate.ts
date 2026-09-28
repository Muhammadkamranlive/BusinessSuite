import { NextResponse } from "next/server";
import { isUuid, TENANT_SLUG_TO_UUID } from "@/lib/tenants/ids";

const KNOWN_TENANT_IDS = new Set([
  ...Object.keys(TENANT_SLUG_TO_UUID),
  ...Object.values(TENANT_SLUG_TO_UUID)
]);

export function requireTenantId(value: unknown): { ok: true; tenantId: string } | { ok: false; error: string } {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, error: "tenantId is required" };
  }
  const tenantId = value.trim();
  if (KNOWN_TENANT_IDS.has(tenantId) || isUuid(tenantId)) {
    return { ok: true, tenantId };
  }
  return { ok: false, error: "Invalid tenantId" };
}

export function requireUuid(value: unknown, field = "id"): { ok: true; uuid: string } | { ok: false; error: string } {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, error: `${field} is required` };
  }
  const uuid = value.trim();
  if (!isUuid(uuid)) {
    return { ok: false, error: `Invalid ${field}` };
  }
  return { ok: true, uuid };
}

export function assertJsonObject(body: unknown): body is Record<string, unknown> {
  return body != null && typeof body === "object" && !Array.isArray(body);
}

export function invalidRequestResponse(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

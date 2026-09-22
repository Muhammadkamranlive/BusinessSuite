/**
 * Server-side session + tenant + healthcare RBAC guard for PHI API routes.
 * Never trust client-only role checks for PHI.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sessionCookieName, tenantCookieName } from "@/lib/auth/server/session-cookies";
import { findProfileByEmail } from "@/lib/auth/server/platform-users";
import { checkRateLimit, clientIpFromRequest, RATE_LIMITS } from "@/lib/auth/server/rate-limit";
import type { RoleKey } from "@/lib/permissions";

export type ApiSession = {
  email: string;
  tenantId: string;
  role: RoleKey;
  profileId?: string;
  status?: string;
};

export type GuardOk = { ok: true; session: ApiSession };
export type GuardFail = { ok: false; response: NextResponse };

/** Roles permitted to call healthcare PHI sync / clinical APIs. */
const HEALTHCARE_PHI_ROLES = new Set<string>([
  "super_admin",
  "company_admin",
  "admin",
  "hr_manager",
  "finance_manager",
  "accountant",
  "doctor",
  "nurse",
  "pharmacist",
  "lab_technician",
  "receptionist",
  "billing_staff",
  "hospital_admin",
  "it_security"
]);

export async function requireApiSession(request: Request): Promise<GuardOk | GuardFail> {
  const jar = await cookies();
  const email = jar.get(sessionCookieName)?.value?.trim().toLowerCase();
  const cookieTenant = jar.get(tenantCookieName)?.value?.trim();

  if (!email) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    };
  }

  let role: RoleKey = "viewer";
  let status = "active";
  let profileId: string | undefined;
  let tenantId = cookieTenant || "alpha";

  try {
    const profile = await findProfileByEmail(email);
    if (profile) {
      role = profile.role;
      status = profile.status;
      profileId = profile.id;
      tenantId = cookieTenant || profile.tenantId;
      if (profile.status === "blocked") {
        return {
          ok: false,
          response: NextResponse.json({ ok: false, error: "Account deactivated" }, { status: 403 })
        };
      }
    }
  } catch {
    /* demo/offline: cookie session only — allow with cookie tenant */
  }

  return {
    ok: true,
    session: { email, tenantId, role, profileId, status }
  };
}

/** Ensure request tenant matches session tenant (prevents cross-tenant PHI sync). */
export function assertTenantMatch(
  session: ApiSession,
  requestedTenantId: string | null | undefined
): GuardFail | null {
  if (!requestedTenantId) return null;
  const a = session.tenantId.toLowerCase();
  const b = requestedTenantId.toLowerCase();
  if (a === b) return null;
  if (session.role === "super_admin" || session.role === "company_admin") return null;
  return {
    ok: false,
    response: NextResponse.json({ ok: false, error: "Tenant mismatch" }, { status: 403 })
  };
}

export function requireHealthcareAccess(session: ApiSession): GuardFail | null {
  if (HEALTHCARE_PHI_ROLES.has(session.role)) return null;
  // Demo operators and company staff with non-viewer roles that manage healthcare app
  if (session.role !== "viewer" && session.role !== "employee") return null;
  return {
    ok: false,
    response: NextResponse.json({ ok: false, error: "Forbidden — healthcare access required" }, { status: 403 })
  };
}

export function applyRateLimitHeaders(response: NextResponse, remaining: number, retryAfterSec: number) {
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  if (retryAfterSec > 0) response.headers.set("Retry-After", String(retryAfterSec));
  return response;
}

export function enforceRateLimit(
  request: Request,
  kind: keyof typeof RATE_LIMITS,
  extraKey = ""
): GuardFail | null {
  const ip = clientIpFromRequest(request);
  const cfg = RATE_LIMITS[kind];
  const result = checkRateLimit({
    key: `${kind}:${ip}:${extraKey}`,
    limit: cfg.limit,
    windowMs: cfg.windowMs
  });
  if (!result.ok) {
    const res = NextResponse.json(
      { ok: false, error: "Too many requests. Try again later." },
      { status: 429 }
    );
    applyRateLimitHeaders(res, 0, result.retryAfterSec);
    return { ok: false, response: res };
  }
  return null;
}

/** Company or platform admin only. */
export function requireCompanyAdmin(session: ApiSession): GuardFail | null {
  if (session.role === "super_admin" || session.role === "company_admin") return null;
  return {
    ok: false,
    response: NextResponse.json({ ok: false, error: "Forbidden — admin required" }, { status: 403 })
  };
}

/** Composite guard for PHI healthcare sync routes. */
export async function guardHealthcarePhiRoute(
  request: Request,
  tenantId: string | null | undefined
): Promise<GuardOk | GuardFail> {
  const rate = enforceRateLimit(request, "healthcareSync");
  if (rate) return rate;

  const sessionResult = await requireApiSession(request);
  if (!sessionResult.ok) return sessionResult;

  const mismatch = assertTenantMatch(sessionResult.session, tenantId);
  if (mismatch) return mismatch;

  const rbac = requireHealthcareAccess(sessionResult.session);
  if (rbac) return rbac;

  return sessionResult;
}

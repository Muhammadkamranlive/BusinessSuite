import type { NextResponse } from "next/server";

export const sessionCookieName = "businesssuite_session";
export const tenantCookieName = "businesssuite_tenant";

const MAX_AGE = 60 * 60 * 24 * 7;

export function applySessionCookies(response: NextResponse, email: string, tenantId: string) {
  response.cookies.set(sessionCookieName, email, {
    path: "/",
    maxAge: MAX_AGE,
    sameSite: "lax",
    httpOnly: false
  });
  response.cookies.set(tenantCookieName, tenantId, {
    path: "/",
    maxAge: MAX_AGE,
    sameSite: "lax",
    httpOnly: false
  });
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(sessionCookieName, "", { path: "/", maxAge: 0 });
  response.cookies.set(tenantCookieName, "", { path: "/", maxAge: 0 });
}

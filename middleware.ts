import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/crm",
  "/sales",
  "/purchases",
  "/inventory",
  "/hrm",
  "/documents",
  "/finance",
  "/projects",
  "/operations",
  "/healthcare",
  "/reports",
  "/settings",
  "/activate",
  "/billing"
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("businesssuite_session")?.value;

  if (protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    if (!session) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Logged-in users on auth screens go to ERP; unpaid companies are sent to /activate by AppShell.
  if (session && (pathname === "/login" || pathname === "/signup")) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/activate",
    "/billing",
    "/billing/:path*",
    "/dashboard/:path*",
    "/crm/:path*",
    "/sales/:path*",
    "/purchases/:path*",
    "/inventory/:path*",
    "/hrm/:path*",
    "/documents",
    "/documents/:path*",
    "/finance/:path*",
    "/projects/:path*",
    "/operations/:path*",
    "/healthcare/:path*",
    "/reports/:path*",
    "/settings/:path*"
  ]
};

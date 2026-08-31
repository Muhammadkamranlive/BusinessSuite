import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/auth/server/session-cookies";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}

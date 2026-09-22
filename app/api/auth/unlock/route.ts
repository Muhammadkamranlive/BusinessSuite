import { NextResponse } from "next/server";
import { requireApiSession, requireCompanyAdmin } from "@/lib/auth/server/api-guard";
import { unlockAccount } from "@/lib/auth/server/account-lockout";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const sessionResult = await requireApiSession(request);
  if (!sessionResult.ok) return sessionResult.response;

  const adminGate = requireCompanyAdmin(sessionResult.session);
  if (adminGate) return adminGate.response;

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });
  }

  await unlockAccount(email);
  return NextResponse.json({ ok: true, email, unlockedBy: sessionResult.session.email });
}

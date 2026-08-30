import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_EMAIL_API = "http://127.0.0.1:8787";

export function emailApiBase() {
  return (process.env.EMAIL_API_URL || DEFAULT_EMAIL_API).replace(/\/$/, "");
}

export function emailApiHeaders(extra?: HeadersInit): HeadersInit {
  const key = process.env.EMAIL_API_KEY || "";
  return {
    "Content-Type": "application/json",
    ...(key ? { "x-email-api-key": key } : {}),
    ...(extra || {})
  };
}

export async function proxyToEmailApi(path: string, init?: RequestInit) {
  const url = `${emailApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      ...init,
      headers: emailApiHeaders(init?.headers),
      cache: "no-store"
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { ok: false, error: text || "Invalid JSON from email API" };
    }
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? `Email API unreachable (${emailApiBase()}): ${err.message}`
            : "Email API unreachable"
      },
      { status: 503 }
    );
  }
}

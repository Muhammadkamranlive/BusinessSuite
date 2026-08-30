import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  const origin = url.origin;
  const redirectHome = `${origin}/hrm/workflows?zoom=`;

  if (err) {
    return NextResponse.redirect(`${redirectHome}error&message=${encodeURIComponent(err)}`);
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const expected = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("zoom_oauth_state="))
    ?.split("=")[1];

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(`${redirectHome}error&message=invalid_state`);
  }

  const clientId = process.env.ZOOM_CLIENT_ID?.trim();
  const clientSecret = process.env.ZOOM_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${redirectHome}error&message=not_configured`);
  }

  const redirectUri =
    process.env.ZOOM_REDIRECT_URI?.trim() || `${origin}/api/integrations/zoom/callback`;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const tokenRes = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri
    })
  });

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    reason?: string;
  };

  if (!tokenRes.ok || !tokenJson.access_token) {
    const message = tokenJson.reason || tokenJson.error || "token_exchange_failed";
    return NextResponse.redirect(`${redirectHome}error&message=${encodeURIComponent(message)}`);
  }

  const res = NextResponse.redirect(`${redirectHome}connected`);
  res.cookies.set("zoom_access_token", tokenJson.access_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.min(tokenJson.expires_in ?? 3600, 3600)
  });
  if (tokenJson.refresh_token) {
    res.cookies.set("zoom_refresh_token", tokenJson.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
  }
  res.cookies.set("zoom_oauth_state", "", { path: "/", maxAge: 0 });
  return res;
}

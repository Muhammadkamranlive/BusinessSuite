import { NextResponse } from "next/server";

export const runtime = "nodejs";

function zoomConfigured() {
  return Boolean(process.env.ZOOM_CLIENT_ID?.trim() && process.env.ZOOM_CLIENT_SECRET?.trim());
}

export async function GET(request: Request) {
  if (!zoomConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        reason: "Add ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET to .env.local"
      },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const origin = url.origin;
  const redirectUri =
    process.env.ZOOM_REDIRECT_URI?.trim() || `${origin}/api/integrations/zoom/callback`;
  const state = crypto.randomUUID();

  const auth = new URL("https://zoom.us/oauth/authorize");
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("client_id", process.env.ZOOM_CLIENT_ID!.trim());
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("state", state);

  const res = NextResponse.redirect(auth.toString());
  res.cookies.set("zoom_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600
  });
  return res;
}

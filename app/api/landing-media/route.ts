import { NextResponse } from "next/server";
import { LANDING_MEDIA_SLOTS, mergeLandingMedia, type LandingMediaMap } from "@/lib/marketing-media";
import { readLandingMedia, resetLandingMedia, writeLandingMedia } from "@/lib/landing-media/landing-media-store";

export const runtime = "nodejs";

function isValidMedia(body: unknown): body is LandingMediaMap {
  if (!body || typeof body !== "object") return false;
  const data = body as Record<string, unknown>;
  return LANDING_MEDIA_SLOTS.every((slot) => {
    const value = data[slot.key];
    return value === undefined || (typeof value === "string" && value.trim().length > 0);
  });
}

export async function GET() {
  const { media, source } = await readLandingMedia();
  return NextResponse.json(
    { ok: true, media, source },
    { headers: { "Cache-Control": "no-store, must-revalidate" } }
  );
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!isValidMedia(body)) {
      return NextResponse.json({ ok: false, message: "Invalid landing media payload" }, { status: 400 });
    }
    const { media, source } = await writeLandingMedia(mergeLandingMedia(body));
    return NextResponse.json({ ok: true, media, source, message: "Landing images saved" });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to save landing images" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const { media, source } = await resetLandingMedia();
    return NextResponse.json({ ok: true, media, source, message: "Landing images reset to defaults" });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to reset landing images" },
      { status: 500 }
    );
  }
}

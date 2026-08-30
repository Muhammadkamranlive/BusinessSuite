import { NextResponse } from "next/server";
import { defaultDesignTokens, type DesignTokens } from "@/lib/design-tokens";
import { readThemeFile, resetThemeFile, writeThemeFile } from "@/lib/theme/theme-file";

export const runtime = "nodejs";

function isValidTokens(body: unknown): body is DesignTokens {
  if (!body || typeof body !== "object") return false;
  const data = body as Record<string, unknown>;
  return Object.keys(defaultDesignTokens).every((key) => typeof data[key] === "string" && Boolean(data[key]));
}

export async function GET() {
  const theme = await readThemeFile();
  return NextResponse.json(
    { ok: true, theme, source: "config/theme.json" },
    { headers: { "Cache-Control": "no-store, must-revalidate" } }
  );
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!isValidTokens(body)) {
      return NextResponse.json({ ok: false, message: "Invalid theme payload" }, { status: 400 });
    }
    const theme = await writeThemeFile(body);
    return NextResponse.json({ ok: true, theme, message: "Theme saved to config/theme.json" });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to save theme" },
      { status: 500 }
    );
  }
}

/** Reset active theme back to config/theme.default.json */
export async function DELETE() {
  try {
    const theme = await resetThemeFile();
    return NextResponse.json({ ok: true, theme, message: "Theme reset to defaults" });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to reset theme" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { uploadLandingMediaFile } from "@/lib/landing-media/landing-media-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: "Expected multipart file field named file" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ ok: false, message: "Only image uploads are allowed" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ ok: false, message: "Image must be 5MB or smaller" }, { status: 400 });
    }
    const { url } = await uploadLandingMediaFile(file, file.name || "upload.png");
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

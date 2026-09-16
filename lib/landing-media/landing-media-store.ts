import { getSupabaseAdminClient, hasSecretKey } from "@/lib/supabase/server";
import {
  defaultLandingMedia,
  mergeLandingMedia,
  type LandingMediaMap
} from "@/lib/marketing-media";
import {
  readLandingMediaFile,
  resetLandingMediaFile,
  writeLandingMediaFile
} from "@/lib/landing-media/landing-media-file";

export function isLandingMediaDbEnabled() {
  return hasSecretKey() && process.env.NEXT_PUBLIC_LANDING_MEDIA_USE_SUPABASE !== "false";
}

export async function readLandingMedia(): Promise<{ media: LandingMediaMap; source: string }> {
  if (isLandingMediaDbEnabled()) {
    try {
      const admin = getSupabaseAdminClient();
      const { data, error } = await admin.from("platform_landing_media").select("media").eq("id", 1).maybeSingle();
      if (!error && data?.media && typeof data.media === "object") {
        return {
          media: mergeLandingMedia(data.media as Partial<LandingMediaMap>),
          source: "supabase:platform_landing_media"
        };
      }
    } catch {
      /* fall through to file */
    }
  }

  const media = await readLandingMediaFile();
  return { media, source: "config/landing-media.json" };
}

export async function writeLandingMedia(media: LandingMediaMap): Promise<{ media: LandingMediaMap; source: string }> {
  const merged = mergeLandingMedia(media);

  if (isLandingMediaDbEnabled()) {
    try {
      const admin = getSupabaseAdminClient();
      const { error } = await admin.from("platform_landing_media").upsert(
        {
          id: 1,
          media: merged,
          updated_at: new Date().toISOString()
        },
        { onConflict: "id" }
      );
      if (!error) {
        try {
          await writeLandingMediaFile(merged);
        } catch {
          /* file optional on serverless */
        }
        return { media: merged, source: "supabase:platform_landing_media" };
      }
    } catch {
      /* fall through */
    }
  }

  const fileMedia = await writeLandingMediaFile(merged);
  return { media: fileMedia, source: "config/landing-media.json" };
}

export async function resetLandingMedia(): Promise<{ media: LandingMediaMap; source: string }> {
  const defaults = { ...defaultLandingMedia };

  if (isLandingMediaDbEnabled()) {
    try {
      const admin = getSupabaseAdminClient();
      const { error } = await admin.from("platform_landing_media").upsert(
        {
          id: 1,
          media: defaults,
          updated_at: new Date().toISOString()
        },
        { onConflict: "id" }
      );
      if (!error) {
        try {
          await resetLandingMediaFile();
        } catch {
          /* optional */
        }
        return { media: defaults, source: "supabase:platform_landing_media" };
      }
    } catch {
      /* fall through */
    }
  }

  const media = await resetLandingMediaFile();
  return { media, source: "config/landing-media.json" };
}

export async function uploadLandingMediaFile(file: File | Blob, fileName: string): Promise<{ url: string }> {
  if (!isLandingMediaDbEnabled()) {
    throw new Error("Image upload requires SUPABASE_SECRET_KEY. Paste an image URL instead.");
  }

  const admin = getSupabaseAdminClient();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "image.png";
  const path = `slots/${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage.from("landing-media").upload(path, buffer, {
    contentType: file.type || "image/png",
    upsert: true
  });
  if (error) throw new Error(error.message);

  const { data } = admin.storage.from("landing-media").getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Upload succeeded but public URL was missing.");
  return { url: data.publicUrl };
}

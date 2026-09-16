import { promises as fs } from "fs";
import path from "path";
import {
  defaultLandingMedia,
  mergeLandingMedia,
  type LandingMediaMap
} from "@/lib/marketing-media";

const mediaPath = path.join(process.cwd(), "config", "landing-media.json");
const defaultMediaPath = path.join(process.cwd(), "config", "landing-media.default.json");

async function readJsonFile(filePath: string): Promise<Partial<LandingMediaMap>> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as Partial<LandingMediaMap>;
}

export async function readLandingMediaFile(): Promise<LandingMediaMap> {
  try {
    return mergeLandingMedia(await readJsonFile(mediaPath));
  } catch {
    try {
      return mergeLandingMedia(await readJsonFile(defaultMediaPath));
    } catch {
      return { ...defaultLandingMedia };
    }
  }
}

export async function writeLandingMediaFile(media: LandingMediaMap): Promise<LandingMediaMap> {
  const merged = mergeLandingMedia(media);
  await fs.writeFile(mediaPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  return merged;
}

export async function resetLandingMediaFile(): Promise<LandingMediaMap> {
  let defaults = { ...defaultLandingMedia };
  try {
    defaults = mergeLandingMedia(await readJsonFile(defaultMediaPath));
  } catch {
    /* keep code defaults */
  }
  await fs.writeFile(mediaPath, `${JSON.stringify(defaults, null, 2)}\n`, "utf8");
  return defaults;
}

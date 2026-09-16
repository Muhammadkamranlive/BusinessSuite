"use client";

import { useEffect, useState } from "react";
import {
  defaultLandingMedia,
  fetchLandingMedia,
  getCachedLandingMedia,
  subscribeLandingMedia,
  type LandingMediaMap
} from "@/lib/marketing-media";

/** Live landing media map — refreshes after Super Admin saves. */
export function useLandingMedia(): LandingMediaMap {
  const [media, setMedia] = useState<LandingMediaMap>(() => getCachedLandingMedia());

  useEffect(() => {
    void fetchLandingMedia().then(setMedia);
    return subscribeLandingMedia(() => setMedia(getCachedLandingMedia()));
  }, []);

  return media ?? defaultLandingMedia;
}

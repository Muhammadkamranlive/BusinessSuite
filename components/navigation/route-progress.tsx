"use client";

import { Loader2 } from "lucide-react";
import { useNavigation } from "@/components/navigation/navigation-provider";

/** Top progress bar + subtle page veil while a client route is loading. */
export function RouteProgress() {
  const { isNavigating } = useNavigation();

  if (!isNavigating) return null;

  return (
    <>
      <div className="route-progress-bar" role="progressbar" aria-label="Loading page" aria-busy="true">
        <div className="route-progress-bar__shine" />
      </div>
      <div className="route-progress-veil" aria-hidden="true">
        <div className="route-progress-veil__card">
          <Loader2 className="size-5 animate-spin text-teal" aria-hidden="true" />
          <p className="text-sm font-semibold text-ink">Opening page…</p>
        </div>
      </div>
    </>
  );
}

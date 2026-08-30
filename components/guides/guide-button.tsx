"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { guideForPath } from "@/lib/guides/resolve";
import { GuideView } from "@/components/guides/guide-view";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

/** Opens process guide view mode for the current menu (or an explicit guide id/path). */
export function GuideButton({
  guideIdOrPath,
  className,
  label = "Guide"
}: {
  guideIdOrPath?: string;
  className?: string;
  label?: string;
}) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const guide = guideForPath(guideIdOrPath || pathname);
  const close = useCallback(() => setOpen(false), []);

  if (!guide) return null;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className={cn("!min-h-11 shrink-0 gap-2", className)}
        onClick={() => setOpen(true)}
        title={`How ${guide.title} works`}
      >
        <CircleHelp className="size-4" aria-hidden="true" />
        {label}
      </Button>
      <GuideView guide={guide} open={open} onClose={close} />
    </>
  );
}

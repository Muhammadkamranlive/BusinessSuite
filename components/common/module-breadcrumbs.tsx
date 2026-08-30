"use client";

import { useMemo, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { Breadcrumbs, type Crumb } from "@/components/common/breadcrumbs";
import { GuideView } from "@/components/guides/guide-view";
import { ProcessStageBanner } from "@/components/guides/process-stage-banner";
import { guideForPath } from "@/lib/guides/resolve";
import { resolveProcessStage } from "@/lib/guides/process-stage";
import { navGroups } from "@/lib/permissions";
import { Button } from "@/components/ui";

/** Auto breadcrumbs + active process stage + Guide button. */
export function ModuleBreadcrumbs({ trail }: { trail?: Crumb[] }) {
  const pathname = usePathname() || "/";
  const [guideOpen, setGuideOpen] = useState(false);
  const closeGuide = useCallback(() => setGuideOpen(false), []);
  const guide = useMemo(() => guideForPath(pathname), [pathname]);
  const stage = useMemo(() => resolveProcessStage(pathname), [pathname]);

  const items = useMemo(() => {
    let best: {
      groupLabel: string;
      groupHref: string;
      sectionLabel?: string;
      childLabel: string;
      childHref: string;
      score: number;
    } | null = null;

    for (const group of navGroups) {
      for (const child of group.children) {
        const exact = pathname === child.href;
        const nested = child.href !== group.href && pathname.startsWith(`${child.href}/`);
        if (!exact && !nested) continue;
        const score = child.href.length + (exact ? 1000 : 0);
        if (!best || score > best.score) {
          best = {
            groupLabel: group.label,
            groupHref: group.href,
            sectionLabel: child.group,
            childLabel: child.label,
            childHref: child.href,
            score
          };
        }
      }
    }

    const crumbs: Crumb[] = [];
    if (best) {
      crumbs.push({ label: best.groupLabel, href: best.groupHref });
      if (best.sectionLabel && best.sectionLabel !== best.childLabel && best.sectionLabel !== best.groupLabel) {
        crumbs.push({ label: best.sectionLabel, href: best.groupHref });
      }
      if (best.childHref !== best.groupHref || best.childLabel !== best.groupLabel) {
        crumbs.push({ label: best.childLabel, href: best.childHref });
      }
    } else {
      const group = navGroups.find((g) => pathname === g.href || pathname.startsWith(`${g.href}/`));
      if (group) crumbs.push({ label: group.label, href: group.href });
    }

    if (trail?.length) {
      for (const item of trail) {
        const last = crumbs[crumbs.length - 1];
        if (last && last.label === item.label) continue;
        crumbs.push(item);
      }
    }

    // Append active stage into the crumb trail so it is always visible with breadcrumbs
    if (stage) {
      const stageCrumbLabel = stage.stageNumber > 0
        ? `${stage.stageOrdinal}: ${stage.stageName}`
        : `${stage.stageOrdinal} · ${stage.stageName}`;
      const last = crumbs[crumbs.length - 1];
      if (!last || last.label !== stageCrumbLabel) {
        crumbs.push({ label: stageCrumbLabel });
      }
    }

    if (!crumbs.length) return crumbs;
    const last = crumbs[crumbs.length - 1];
    crumbs[crumbs.length - 1] = { label: last.label };
    return crumbs;
  }, [pathname, trail, stage]);

  if (!items.length && !guide && !stage) return null;

  return (
    <>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {items.length ? <Breadcrumbs items={items} className="mb-0 min-w-0" /> : <div />}
        {guide ? (
          <Button
            type="button"
            variant="secondary"
            className="!min-h-11 w-full shrink-0 gap-2 sm:w-auto"
            onClick={() => setGuideOpen(true)}
            title={`How to use: ${guide.title}`}
          >
            <CircleHelp className="size-4" aria-hidden="true" />
            Guide
          </Button>
        ) : null}
      </div>
      {stage ? <ProcessStageBanner stage={stage} /> : null}
      <GuideView guide={guide} open={guideOpen} onClose={closeGuide} />
    </>
  );
}

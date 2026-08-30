"use client";

import Link from "next/link";
import { ArrowRight, Milestone } from "lucide-react";
import type { ProcessStageInfo } from "@/lib/guides/process-stage";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

/** Shows which process stage the current menu is (1st / 2nd / 3rd …) under the breadcrumbs. */
export function ProcessStageBanner({ stage }: { stage: ProcessStageInfo }) {
  const isNumbered = stage.stageNumber > 0;

  return (
    <div
      className={cn(
        "mb-4 rounded-[var(--bs-radius)] border px-3 py-3 sm:px-4",
        isNumbered ? "border-teal/40 bg-teal-50/60" : "border-line bg-white"
      )}
      role="status"
      aria-label={
        isNumbered
          ? `${stage.stageOrdinal}: ${stage.stageName}`
          : `${stage.stageOrdinal} — ${stage.stageName}`
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex items-start gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
              isNumbered ? "bg-[color:var(--bs-ink)] text-white" : "bg-cloud text-ink"
            )}
          >
            {isNumbered ? stage.stageNumber : <Milestone className="size-4" aria-hidden="true" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={isNumbered ? "info" : "neutral"}>{stage.stageOrdinal}</Badge>
              {isNumbered ? (
                <span className="text-xs font-semibold text-slate-500">
                  of {stage.totalStages} in {stage.flowTitle}
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-500">{stage.flowTitle}</span>
              )}
              {stage.tag ? <Badge tone="success">{stage.tag}</Badge> : null}
            </div>
            <p className="mt-1 text-sm font-bold text-ink">{stage.stageName}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600 sm:text-sm">{stage.stageDescription}</p>
          </div>
        </div>

        {(stage.prev || stage.next) && (
          <div className="flex flex-wrap gap-2 sm:max-w-xs sm:justify-end">
            {stage.prev?.href ? (
              <Link
                href={stage.prev.href}
                className="inline-flex min-h-9 items-center gap-1 rounded-[var(--bs-radius)] border border-line bg-white px-2.5 text-xs font-semibold text-slate-600 hover:border-teal hover:text-ink"
              >
                ← Prev: {stage.prev.title}
              </Link>
            ) : null}
            {stage.next?.href ? (
              <Link
                href={stage.next.href}
                className="inline-flex min-h-9 items-center gap-1 rounded-[var(--bs-radius)] border border-teal/40 bg-white px-2.5 text-xs font-semibold text-teal hover:bg-teal/10"
              >
                Next: {stage.next.title} <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

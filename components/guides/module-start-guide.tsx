"use client";

import { useCallback, useMemo, useState } from "react";
import { GitBranch } from "lucide-react";
import { listGuidesForModule } from "@/lib/guides/catalog";
import type { ModuleKey } from "@/lib/permissions";
import { GuideFlowDiagram } from "@/components/guides/guide-flow-diagram";
import { GuideView } from "@/components/guides/guide-view";
import { Button, Panel } from "@/components/ui";

/** Compact “start here” strip for module home pages with the primary flow diagram. */
export function ModuleStartGuide({ module }: { module: ModuleKey }) {
  const overview = useMemo(
    () => listGuidesForModule(module).find((g) => g.isModuleOverview) ?? null,
    [module]
  );
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  if (!overview || !overview.flows[0]) return null;

  return (
    <>
      <Panel className="mb-5 border-teal/30 bg-gradient-to-br from-white to-teal-50/40 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 inline-flex items-center gap-2 text-teal">
              <GitBranch className="size-4" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-wide">Start here</span>
            </div>
            <p className="text-base font-bold text-ink">{overview.title}</p>
            <p className="mt-1 text-sm text-slate-600">{overview.purpose}</p>
          </div>
          <Button type="button" className="w-full shrink-0 sm:w-auto" onClick={() => setOpen(true)}>
            Open full guide
          </Button>
        </div>
        <div className="mt-4">
          <GuideFlowDiagram flow={overview.flows[0]} />
        </div>
      </Panel>
      <GuideView guide={overview} open={open} onClose={close} />
    </>
  );
}

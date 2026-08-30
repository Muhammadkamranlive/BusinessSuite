"use client";

import { useEffect } from "react";
import { BookOpen, GitBranch, X } from "lucide-react";
import type { GuideDefinition } from "@/lib/guides/types";
import { GuideFlowDiagram } from "@/components/guides/guide-flow-diagram";
import { Badge, Button, Panel } from "@/components/ui";
import { moduleLabels } from "@/lib/permissions";

/** Full-screen view mode for a process guide (flow diagrams + data flow). */
export function GuideView({
  guide,
  open,
  onClose
}: {
  guide: GuideDefinition | null;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !guide) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black/45 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]" role="dialog" aria-modal="true" aria-labelledby="guide-view-title">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close guide" onClick={onClose} />
      <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col bg-[color:var(--bs-cloud)] shadow-soft sm:my-4 sm:h-[min(92dvh,900px)] sm:rounded-[var(--bs-radius)] sm:border sm:border-line">
        <header className="flex shrink-0 items-start gap-3 border-b border-line bg-white px-4 py-4 sm:rounded-t-[var(--bs-radius)] sm:px-6">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-[var(--bs-radius)] bg-[color:var(--bs-ink)] text-white">
            <GitBranch className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">{moduleLabels[guide.module]}</Badge>
              <Badge tone="neutral">Process guide</Badge>
            </div>
            <h2 id="guide-view-title" className="mt-1 text-lg font-bold text-ink sm:text-xl">
              {guide.title}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{guide.purpose}</p>
          </div>
          <Button variant="ghost" className="size-11 shrink-0 px-0" onClick={onClose} title="Close">
            <X className="size-5" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </Button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          <Panel className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <BookOpen className="mt-0.5 size-5 shrink-0 text-teal" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-ink">How data flows</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{guide.dataFlow}</p>
              </div>
            </div>
          </Panel>

          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Step-by-step flow diagrams</p>
            {guide.flows.map((f) => (
              <GuideFlowDiagram key={f.id} flow={f} />
            ))}
          </div>

          {guide.tips?.length ? (
            <Panel className="p-4 sm:p-5">
              <p className="mb-2 text-sm font-bold text-ink">Tips</p>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-600">
                {guide.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-line bg-white px-4 py-3 sm:rounded-b-[var(--bs-radius)] sm:px-6">
          <p className="text-xs text-slate-500">Follow steps in order — first, then second, then third.</p>
          <Button variant="secondary" onClick={onClose}>
            Close guide
          </Button>
        </footer>
      </div>
    </div>
  );
}

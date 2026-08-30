"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { GuideFlow, GuideStep } from "@/lib/guides/types";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

function StepCard({
  step,
  index,
  total
}: {
  step: GuideStep;
  index: number;
  total: number;
}) {
  const body = (
    <div
      className={cn(
        "relative flex h-full min-w-[14rem] max-w-[18rem] flex-col rounded-[var(--bs-radius)] border border-line bg-white p-4 shadow-soft",
        step.href && "transition hover:border-teal"
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-[color:var(--bs-ink)] text-sm font-bold text-white">
          {index + 1}
        </span>
        {step.tag ? <Badge tone="info">{step.tag}</Badge> : null}
      </div>
      <p className="text-sm font-bold text-ink">{step.title}</p>
      <p className="mt-1.5 flex-1 text-xs leading-relaxed text-slate-600">{step.description}</p>
      {step.href ? (
        <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal">
          Open screen <ArrowRight className="size-3.5" aria-hidden="true" />
        </p>
      ) : null}
      {index === total - 1 ? (
        <CheckCircle2 className="absolute right-3 top-3 size-4 text-emerald-500" aria-hidden="true" />
      ) : null}
    </div>
  );

  if (step.href) {
    return (
      <Link href={step.href} className="block shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--bs-focus)]">
        {body}
      </Link>
    );
  }
  return <div className="shrink-0">{body}</div>;
}

/** Horizontal / wrapping numbered flow diagram for a process. */
export function GuideFlowDiagram({ flow }: { flow: GuideFlow }) {
  return (
    <section className="rounded-[var(--bs-radius)] border border-line bg-cloud/80 p-4 sm:p-5">
      <div className="mb-4 max-w-3xl">
        <h3 className="text-base font-bold text-ink">{flow.title}</h3>
        <p className="mt-1 text-sm text-slate-600">{flow.summary}</p>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-stretch">
        {flow.steps.map((step, index) => (
          <div key={step.id} className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
            <StepCard step={step} index={index} total={flow.steps.length} />
            {index < flow.steps.length - 1 ? (
              <div className="flex items-center justify-center px-1 text-teal md:px-0" aria-hidden="true">
                <ArrowRight className="hidden size-5 md:block" />
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400 md:hidden">Then</span>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

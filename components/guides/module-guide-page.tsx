"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, GitBranch } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { GuideFlowDiagram } from "@/components/guides/guide-flow-diagram";
import { listGuidesForModule } from "@/lib/guides/catalog";
import { moduleLabels, type ModuleKey } from "@/lib/permissions";
import { Badge, Button, Panel } from "@/components/ui";

/** Full-page flow diagrams for one product module (sidebar → Flow diagram). */
export function ModuleGuidePage({ module }: { module: ModuleKey }) {
  const guides = listGuidesForModule(module);
  const overview = guides.find((g) => g.isModuleOverview) ?? guides[0] ?? null;
  const menuGuides = guides.filter((g) => !g.isModuleOverview);

  if (!overview) {
    return (
      <AppShell activeModule={module}>
        <ModuleBreadcrumbs />
        <PageHeader title="Flow diagram" description="No guide is authored for this module yet." />
      </AppShell>
    );
  }

  return (
    <AppShell activeModule={module}>
      <ModuleBreadcrumbs />
      <PageHeader
        title={`${moduleLabels[module]} — flow diagram`}
        description="Follow steps in order: first, then second, then third. Each step opens the live menu."
      />

      <Panel className="mb-5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone="info">{moduleLabels[module]}</Badge>
              <Badge tone="success">Module guide</Badge>
            </div>
            <p className="text-base font-bold text-ink">{overview.title}</p>
            <p className="mt-1 text-sm text-slate-600">{overview.purpose}</p>
          </div>
          <Button href="/guides" variant="secondary" className="w-full shrink-0 sm:w-auto">
            <BookOpen className="size-4" />
            All guides
          </Button>
        </div>
        <div className="mt-4 rounded-[var(--bs-radius)] border border-line bg-cloud/70 p-4">
          <p className="text-sm font-bold text-ink">How data flows</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{overview.dataFlow}</p>
        </div>
      </Panel>

      <div className="space-y-5">
        <div className="flex items-center gap-2 text-teal">
          <GitBranch className="size-5" aria-hidden="true" />
          <h2 className="text-lg font-bold text-ink">Process flows</h2>
        </div>
        {overview.flows.map((flow) => (
          <GuideFlowDiagram key={flow.id} flow={flow} />
        ))}
      </div>

      {overview.tips?.length ? (
        <Panel className="mt-5 p-4 sm:p-5">
          <p className="mb-2 text-sm font-bold text-ink">Tips</p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-600">
            {overview.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {menuGuides.length ? (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-ink">Menu-level guides</h2>
          <p className="mb-4 text-sm text-slate-600">
            Each menu also has a <strong>Guide</strong> button next to breadcrumbs. Open these for screen-specific steps.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {menuGuides.map((g) => (
              <Link
                key={g.id}
                href={g.hrefs[0] || `/${module}`}
                className="rounded-[var(--bs-radius)] border border-line bg-white p-4 transition hover:border-teal"
              >
                <p className="font-semibold text-ink">{g.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{g.purpose}</p>
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal">
                  Open menu <ArrowRight className="size-3.5" aria-hidden="true" />
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}

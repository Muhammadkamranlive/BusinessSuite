"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, GitBranch, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { GuideFlowDiagram } from "@/components/guides/guide-flow-diagram";
import { GuideView } from "@/components/guides/guide-view";
import { guideCatalog, listModuleOverviewGuides } from "@/lib/guides/catalog";
import type { GuideDefinition } from "@/lib/guides/types";
import { moduleLabels, type ModuleKey } from "@/lib/permissions";
import { Badge, Button, Field, Panel, TextInput } from "@/components/ui";

export default function GuidesHubPage() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<GuideDefinition | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const overviews = useMemo(() => listModuleOverviewGuides(), []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return guideCatalog;
    return guideCatalog.filter((g) =>
      [g.title, g.purpose, g.dataFlow, g.module, moduleLabels[g.module], ...g.flows.map((f) => f.title)]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [query]);

  const byModule = useMemo(() => {
    const map = new Map<ModuleKey, GuideDefinition[]>();
    for (const g of filtered) {
      const list = map.get(g.module) ?? [];
      list.push(g);
      map.set(g.module, list);
    }
    return [...map.entries()];
  }, [filtered]);

  function openGuide(g: GuideDefinition) {
    setActive(g);
    setViewOpen(true);
  }

  return (
    <AppShell activeModule="settings">
      <ModuleBreadcrumbs />
      <AdminSubnav active="/guides" />
      <PageHeader
        title="Process guides"
        description="Web flow diagrams for every module — first step, second step, third step — plus a Guide button on each menu."
      />

      <Panel className="mb-5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <Field label="Search guides" className="flex-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-teal" aria-hidden="true" />
              <TextInput
                className="pl-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. invoice, leave, patient, purchase order…"
              />
            </div>
          </Field>
          <p className="text-xs text-slate-500 md:mb-2 md:max-w-xs">
            Tip: on any ERP page, click <strong>Guide</strong> next to the breadcrumbs for the same view mode.
          </p>
        </div>
      </Panel>

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-ink">
          <GitBranch className="size-5 text-teal" aria-hidden="true" />
          Start here — module flows
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {overviews.map((g) => (
            <Panel key={g.id} className="flex flex-col p-4">
              <Badge tone="info">{moduleLabels[g.module]}</Badge>
              <p className="mt-2 font-bold text-ink">{g.title}</p>
              <p className="mt-1 flex-1 text-sm text-slate-600">{g.purpose}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={() => openGuide(g)}>
                  <BookOpen className="size-4" />
                  View flow
                </Button>
                {g.hrefs[0] ? (
                  <Button href={g.hrefs[0]} variant="secondary">
                    Open module
                  </Button>
                ) : null}
              </div>
            </Panel>
          ))}
        </div>
      </section>

      {overviews[0] ? (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-bold text-ink">Example diagram — {overviews[0].title}</h2>
          <GuideFlowDiagram flow={overviews[0].flows[0]} />
        </section>
      ) : null}

      <section className="space-y-8">
        <h2 className="text-lg font-bold text-ink">All menu guides</h2>
        {byModule.map(([module, guides]) => (
          <div key={module}>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{moduleLabels[module]}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {guides.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => openGuide(g)}
                  className="rounded-[var(--bs-radius)] border border-line bg-white p-4 text-left transition hover:border-teal"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{g.title}</p>
                    {g.isModuleOverview ? <Badge tone="success">Module</Badge> : <Badge tone="neutral">Menu</Badge>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{g.purpose}</p>
                  <p className="mt-2 text-xs font-semibold text-teal">
                    {g.flows.reduce((n, f) => n + f.steps.length, 0)} steps · View guide
                  </p>
                </button>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 ? (
          <Panel className="p-8 text-center text-sm text-slate-500">No guides match this search.</Panel>
        ) : null}
      </section>

      <p className="mt-8 text-center text-sm text-slate-500">
        Also listed under{" "}
        <Link href="/settings" className="font-semibold text-teal hover:underline">
          Administration
        </Link>
        .
      </p>

      <GuideView guide={active} open={viewOpen} onClose={() => setViewOpen(false)} />
    </AppShell>
  );
}

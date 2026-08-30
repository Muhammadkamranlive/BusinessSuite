"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ClipboardCheck, Clock, KanbanSquare, Network } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { Button, DataTable, Panel, SectionHeader, StatTile } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { money } from "@/lib/utils";
import { projectStats, listProjects, listProjectTasks, listProjectTimesheets } from "@/modules/projects/services/projects.store";

export default function ProjectReportsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const stats = useMemo(() => projectStats(tenantId), [tenantId]);
  const projects = useMemo(() => listProjects(tenantId), [tenantId]);
  const tasks = useMemo(() => listProjectTasks(tenantId), [tenantId]);
  const sheets = useMemo(() => listProjectTimesheets(tenantId), [tenantId]);

  const byStatus = ["planned", "active", "review", "done"].map((s) => [
    s,
    String(projects.filter((p) => p.status === s).length)
  ]);

  return (
    <AppShell activeModule="projects">
      <PageHeader title="Project Reports" description="Live delivery analytics for this company." />
      <ModuleBreadcrumbs />
      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <StatTile label="Projects" value={String(stats.projects)} detail={`${stats.active} active`} icon={Network} tone="teal" />
        <StatTile label="Tasks" value={String(stats.tasks)} detail="All statuses" icon={KanbanSquare} tone="coral" />
        <StatTile label="Hours" value={`${stats.hours}h`} detail="Timesheets" icon={Clock} tone="amber" />
        <StatTile label="Budget" value={money(stats.budget)} detail="Portfolio" icon={ClipboardCheck} tone="mint" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel>
          <SectionHeader title="Portfolio by status" eyebrow="Projects" />
          <DataTable columns={["Status", "Count"]} rows={byStatus} />
        </Panel>
        <Panel>
          <SectionHeader title="Hours by project" eyebrow="Timesheets" />
          <DataTable
            columns={["Project", "Hours"]}
            rows={projects.map((p) => [
              p.name,
              String(sheets.filter((s) => s.project_id === p.id).reduce((n, s) => n + s.hours, 0))
            ])}
          />
        </Panel>
      </div>
      <Panel className="mt-5">
        <SectionHeader title="Task mix" eyebrow={`${tasks.filter((t) => t.status !== "done").length} open`} />
        <DataTable
          columns={["Status", "Count"]}
          rows={["todo", "in_progress", "review", "done"].map((s) => [s, String(tasks.filter((t) => t.status === s).length)])}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/projects"><Button variant="secondary">Portfolio</Button></Link>
          <Link href="/reports"><Button>Open Report Center</Button></Link>
        </div>
      </Panel>
    </AppShell>
  );
}

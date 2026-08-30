"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { useConfirm } from "@/components/common/use-confirm";
import { Button, Panel } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { completeActivity, listFollowUps } from "@/modules/crm/services/crm.store";
import type { CrmActivity } from "@/modules/crm/types";

export default function FollowUpsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { ask, dialog } = useConfirm();
  const [rows, setRows] = useState<CrmActivity[]>([]);

  function refresh() {
    setRows(listFollowUps(tenantId).filter((a) => a.is_active !== false));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  function markComplete(a: CrmActivity) {
    ask({
      title: "Mark follow-up complete?",
      message: `"${a.subject}" will be marked as completed and removed from open follow-ups.`,
      confirmLabel: "Mark complete",
      onConfirm: () => {
        completeActivity(a.id);
        refresh();
      }
    });
  }

  return (
    <AppShell activeModule="crm">
      <PageHeader title="Follow-ups" description="Open CRM activities that still need action." />
      <ModuleBreadcrumbs />
      <Panel>
        <p className="mb-3 text-sm text-slate-500">
          Log new items from{" "}
          <Link href="/crm/activities" className="font-semibold text-teal hover:underline">
            Activities
          </Link>
          .
        </p>
        <ul className="space-y-3">
          {rows.length === 0 ? <li className="text-sm text-slate-500">No open follow-ups.</li> : null}
          {rows.map((a) => (
            <li key={a.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 ${a.due_date && a.due_date < new Date().toISOString().slice(0, 10) ? "border-rose-300 bg-rose-50" : "border-line bg-cloud"}`}>
              <div>
                <p className="font-semibold text-ink">{a.subject}</p>
                <p className="text-sm capitalize text-slate-500">
                  {a.activity_type} · {a.related_type}
                  {a.due_date ? ` · due ${a.due_date}` : ""}
                </p>
              </div>
              <Button variant="secondary" onClick={() => markComplete(a)}>
                Mark complete
              </Button>
            </li>
          ))}
        </ul>
      </Panel>
      {dialog}
    </AppShell>
  );
}

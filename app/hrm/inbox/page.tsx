"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { getStoredTenantId } from "@/lib/auth/session";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { decideInbox, listInbox } from "@/modules/hrm/services/workday.store";

export default function InboxPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const profile = getSessionProfile();
  const { ask, dialog } = useConfirm();
  const [tick, setTick] = useState(0);
  const [extraJson, setExtraJson] = useState("");
  const [mineOnly, setMineOnly] = useState(true);

  const tasks = useMemo(
    () => listInbox(tenantId, mineOnly ? profile.email : undefined),
    [tenantId, profile.email, mineOnly, tick]
  );
  const pending = tasks.filter((t) => t.status === "pending");

  function decide(id: string, decision: "approved" | "rejected") {
    ask({
      title: decision === "approved" ? "Approve this step?" : "Send back / reject?",
      message: "This completes the Workday-style business process step.",
      confirmLabel: decision === "approved" ? "Approve" : "Reject",
      onConfirm: () => {
        decideInbox(id, decision);
        persistExtraFields(tenantId, "hrm.inbox", id, extraJson);
        setExtraJson("");
        setTick((n) => n + 1);
      }
    });
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader title="Inbox" description="Business process tasks — job changes, requisitions, personal data, offboarding." />
      <ModuleBreadcrumbs />
      <label className="mb-4 flex min-h-11 items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
        Assigned to me
      </label>
      <Panel>
        <ExtraFieldsBlock formKey="hrm.inbox" valueJson={extraJson} onChange={setExtraJson} />
        <div className="mt-4 space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-[var(--bs-radius)] border border-line p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-teal">{task.kind.replace("_", " ")}</p>
                  <p className="font-semibold text-ink">{task.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{task.body}</p>
                  <p className="mt-1 text-xs text-slate-400">From {task.requested_by} · to {task.assignee_email}</p>
                </div>
                <StatusBadge status={task.status} />
              </div>
              {task.status === "pending" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" className="!min-h-9 !text-xs" onClick={() => decide(task.id, "approved")}>Approve</Button>
                  <Button type="button" variant="danger" className="!min-h-9 !text-xs" onClick={() => decide(task.id, "rejected")}>Reject</Button>
                </div>
              ) : null}
            </div>
          ))}
          {pending.length === 0 && tasks.length === 0 ? <p className="text-sm text-slate-500">Inbox is clear.</p> : null}
        </div>
      </Panel>
      {dialog}
    </AppShell>
  );
}

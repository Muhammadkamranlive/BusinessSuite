"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { useConfirm } from "@/components/common/use-confirm";
import { Badge, Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import type { WorkflowProvider } from "@/modules/hrm/model";
import { createWorkflowIntegration, listWorkflowIntegrations, toggleWorkflowIntegration } from "@/modules/hrm/services/hrm.store";

function WorkflowsInner() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const searchParams = useSearchParams();
  const zoom = searchParams.get("zoom");
  const zoomMessage = searchParams.get("message");
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  const integrations = useMemo(() => listWorkflowIntegrations(tenantId), [tenantId, tick]);

  const [showForm, setShowForm] = useState(false);
  const [extraJson, setExtraJson] = useState("");
  const [form, setForm] = useState({ name: "", provider: "other" as WorkflowProvider, config_note: "" });

  function doSave() {
    if (!form.name.trim()) return;
    const row = createWorkflowIntegration(tenantId, {
      name: form.name.trim(),
      provider: form.provider,
      enabled: false,
      config_note: form.config_note.trim() || null
    });
    persistExtraFields(tenantId, "hrm.workflow", row.id, extraJson);
    setExtraJson("");
    setForm({ name: "", provider: "other", config_note: "" });
    setShowForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({ editing: false, entityLabel: "workflow integration", onConfirm: doSave });
  }

  const zoomNotice =
    zoom === "connected"
      ? "Zoom connected. Access token stored in an httpOnly cookie for this browser session."
      : zoom === "error"
        ? `Zoom connect failed${zoomMessage ? `: ${zoomMessage}` : ""}`
        : "";

  return (
    <AppShell activeModule="hrm">
      <PageHeader
        title="Workflow Integrations"
        description="Connect third-party tools used across HR workflows."
        actionLabel={showForm ? undefined : "Add integration"}
        onAction={() => { setExtraJson(""); setShowForm(true); }}
      />
      <ModuleBreadcrumbs />

      {zoomNotice ? <p className="mb-4 text-sm font-semibold text-ink">{zoomNotice}</p> : null}

      <Panel className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold text-ink">Zoom OAuth</p>
            <p className="text-sm text-slate-500">Requires ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET in .env.local</p>
          </div>
          <Button type="button" onClick={() => {
            window.location.href = "/api/integrations/zoom/connect";
          }}>
            Connect Zoom
          </Button>
        </div>
      </Panel>

      {showForm ? (
        <Panel className="mb-5">
          <h2 className="mb-4 text-lg font-bold text-ink">New integration</h2>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <Field label="Name">
              <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Provider">
              <SelectInput value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value as WorkflowProvider })}>
                <option value="zoom">Zoom</option>
                <option value="email">Email</option>
                <option value="google_drive">Google Drive</option>
                <option value="calendar">Calendar</option>
                <option value="other">Other</option>
              </SelectInput>
            </Field>
            <Field label="Notes" className="md:col-span-2">
              <TextInput value={form.config_note} onChange={(e) => setForm({ ...form, config_note: e.target.value })} />
            </Field>
            <ExtraFieldsBlock formKey="hrm.workflow" valueJson={extraJson} onChange={setExtraJson} />
            <div className="flex items-end gap-2 md:col-span-2">
              <Button type="submit">Add integration</Button>
              <Button type="button" variant="secondary" onClick={() => { setExtraJson(""); setShowForm(false); }}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((i) => (
          <Panel key={i.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-ink">{i.name}</p>
                  <Badge tone="info">{i.provider.replace(/_/g, " ")}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{i.config_note ?? "No configuration notes."}</p>
                <ExtraFieldsReadout tenantId={tenantId} formKey="hrm.workflow" recordId={i.id} />
                <div className="mt-3">
                  <Badge tone={i.enabled ? "success" : "neutral"}>{i.enabled ? "Enabled" : "Disabled"}</Badge>
                </div>
              </div>
              <Button
                variant={i.enabled ? "secondary" : "primary"}
                className="!px-2 !py-1 !text-xs"
                onClick={() => {
                  toggleWorkflowIntegration(i.id, !i.enabled);
                  refresh();
                }}
              >
                {i.enabled ? "Disable" : "Enable"}
              </Button>
            </div>
          </Panel>
        ))}
        {integrations.length === 0 ? (
          <Panel>
            <p className="text-sm text-slate-500">No integrations yet.</p>
          </Panel>
        ) : null}
      </div>
      {dialog}
    </AppShell>
  );
}

export default function WorkflowsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading workflows…</div>}>
      <WorkflowsInner />
    </Suspense>
  );
}

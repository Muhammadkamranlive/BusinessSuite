"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { useConfirm } from "@/components/common/use-confirm";
import { Badge, Button, Field, Panel, TextArea, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSelfServiceContext } from "@/lib/auth/current-employee";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { createHrNotification, listHrNotifications, markHrNotificationRead } from "@/modules/hrm/services/hrm.store";

export default function NotificationsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { selfService } = getSelfServiceContext(tenantId);
  const { askSave, dialog } = useConfirm();
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  const notifications = useMemo(() => listHrNotifications(tenantId), [tenantId, tick]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const [showForm, setShowForm] = useState(false);
  const [extraJson, setExtraJson] = useState("");
  const [form, setForm] = useState({ title: "", body: "" });

  function doSave() {
    if (!form.title.trim() || !form.body.trim()) return;
    const row = createHrNotification(tenantId, { title: form.title.trim(), body: form.body.trim(), read: false });
    persistExtraFields(tenantId, "hrm.announcement", row.id, extraJson);
    setExtraJson("");
    setForm({ title: "", body: "" });
    setShowForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({ editing: false, entityLabel: "announcement", onConfirm: doSave });
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader
        title="Notifications"
        description={`HR announcements and alerts · ${unreadCount} unread`}
        actionLabel={selfService || showForm ? undefined : "New announcement"}
        onAction={selfService ? undefined : () => { setExtraJson(""); setShowForm(true); }}
      />
      <ModuleBreadcrumbs />

      {showForm ? (
        <Panel className="mb-5">
          <h2 className="mb-4 text-lg font-bold text-ink">New announcement</h2>
          <form onSubmit={submit} className="grid gap-4">
            <Field label="Title">
              <TextInput required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Message">
              <TextArea required rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </Field>
            <ExtraFieldsBlock formKey="hrm.announcement" valueJson={extraJson} onChange={setExtraJson} />
            <div className="flex items-end gap-2">
              <Button type="submit">Send announcement</Button>
              <Button type="button" variant="secondary" onClick={() => { setExtraJson(""); setShowForm(false); }}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}

      <div className="grid gap-3">
        {notifications.map((n) => (
          <Panel key={n.id} className={n.read ? "opacity-70" : ""}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-ink">{n.title}</p>
                  {!n.read ? <Badge tone="info">New</Badge> : <Badge tone="neutral">Read</Badge>}
                </div>
                <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                <ExtraFieldsReadout tenantId={tenantId} formKey="hrm.announcement" recordId={n.id} />
                <p className="mt-2 text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {!n.read ? (
                <Button
                  variant="secondary"
                  className="!px-2 !py-1 !text-xs"
                  onClick={() => {
                    markHrNotificationRead(n.id);
                    refresh();
                  }}
                >
                  Mark read
                </Button>
              ) : null}
            </div>
          </Panel>
        ))}
        {notifications.length === 0 ? (
          <Panel>
            <p className="text-center text-slate-400">No notifications yet.</p>
          </Panel>
        ) : null}
      </div>
      {dialog}
    </AppShell>
  );
}

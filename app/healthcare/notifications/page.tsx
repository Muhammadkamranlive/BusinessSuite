"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createMessageThread,
  createNotification,
  listMessageThreads,
  listMessages,
  listNotificationPrefs,
  listNotifications,
  pullHmsClinicalFromSupabase,
  sendMessage,
  subscribeHmsClinical,
  upsertNotificationPref,
  type HmsMessageThread,
  type HmsNotification
} from "@/modules/healthcare/services/hms-clinical.store";
import { processReminderQueue } from "@/modules/healthcare/services/hms-reminders";
import { listPatients, pullHmsFromSupabase, subscribeHms } from "@/modules/healthcare/services/hms.store";

export default function HmsNotificationsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [tab, setTab] = useState<"prefs" | "notifications" | "threads">("notifications");
  const [notifications, setNotifications] = useState<HmsNotification[]>([]);
  const [threads, setThreads] = useState<HmsMessageThread[]>([]);
  const [prefs, setPrefs] = useState(listNotificationPrefs(tenantId));
  const [patients, setPatients] = useState(listPatients(tenantId));
  const [search, setSearch] = useState("");
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [openNotif, setOpenNotif] = useState(false);
  const [openThread, setOpenThread] = useState(false);
  const [notifForm, setNotifForm] = useState({ recipient_ref: "staff", channel: "in_app" as const, title: "Appointment reminder", body_generic: "You have an upcoming visit.", kind: "reminder" });
  const [prefForm, setPrefForm] = useState({ patient_id: "", email_enabled: true, sms_enabled: false, push_enabled: true });
  const [threadForm, setThreadForm] = useState({ subject: "", participant_emails: "" });
  const [messageBody, setMessageBody] = useState("");
  const [extraJson, setExtraJson] = useState("");
  const [error, setError] = useState("");
  const [reminderMsg, setReminderMsg] = useState("");

  function refresh() {
    setNotifications(listNotifications(tenantId));
    setThreads(listMessageThreads(tenantId));
    setPrefs(listNotificationPrefs(tenantId));
    setPatients(listPatients(tenantId));
  }
  useEffect(() => {
    void pullHmsClinicalFromSupabase(tenantId).finally(() => refresh());
    void pullHmsFromSupabase(tenantId).finally(() => refresh());
    const u1 = subscribeHmsClinical(() => refresh());
    const u2 = subscribeHms(() => refresh());
    return () => {
      u1();
      u2();
    };
  }, [tenantId]);

  const threadMessages = selectedThread ? listMessages(tenantId, selectedThread) : [];

  const notifFiltered = useMemo(
    () =>
      filterAndSort(notifications as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["title", "body_generic", "kind", "channel"],
        sortField: "created_at",
        sortDir: "desc"
      }) as unknown as HmsNotification[],
    [notifications, search]
  );

  function doSaveNotif() {
    setError("");
    try {
      createNotification(tenantId, notifForm);
      setOpenNotif(false);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create notification");
    }
  }

  function doSavePref() {
    upsertNotificationPref(tenantId, {
      patient_id: prefForm.patient_id || null,
      email_enabled: prefForm.email_enabled,
      sms_enabled: prefForm.sms_enabled,
      push_enabled: prefForm.push_enabled
    });
    refresh();
  }

  function doCreateThread() {
    const row = createMessageThread(tenantId, {
      subject: threadForm.subject.trim(),
      participant_emails: threadForm.participant_emails.split(",").map((e) => e.trim()).filter(Boolean)
    });
    persistExtraFields(tenantId, "healthcare.hms.notification", row.id, extraJson);
    setOpenThread(false);
    setSelectedThread(row.id);
    refresh();
  }

  function doSendMessage() {
    if (!selectedThread || !messageBody.trim()) return;
    sendMessage(tenantId, {
      thread_id: selectedThread,
      sender_email: "staff@hospital.local",
      body: messageBody.trim()
    });
    setMessageBody("");
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Notifications & messaging"
        description="Patient prefs, in-app alerts (no PHI in push titles), and message threads."
        actionLabel={tab === "threads" ? "New thread" : tab === "notifications" ? "Send notification" : "Save prefs"}
        onAction={() => {
          if (tab === "threads") setOpenThread(true);
          else if (tab === "notifications") setOpenNotif(true);
          else doSavePref();
        }}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button type="button" variant={tab === "notifications" ? "primary" : "secondary"} onClick={() => setTab("notifications")}>
          Notifications
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            const result = processReminderQueue(tenantId);
            setReminderMsg(`Processed reminders: ${result.sent} sent, ${result.skipped} skipped.`);
            refresh();
          }}
        >
          Process reminder queue
        </Button>
        {reminderMsg ? <span className="text-sm text-slate-600">{reminderMsg}</span> : null}
        <Button type="button" variant={tab === "prefs" ? "primary" : "secondary"} onClick={() => setTab("prefs")}>
          Preferences
        </Button>
        <Button type="button" variant={tab === "threads" ? "primary" : "secondary"} onClick={() => setTab("threads")}>
          Message threads
        </Button>
      </div>
      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
      {openNotif ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: false, entityLabel: "notification", onConfirm: doSaveNotif });
            }}
          >
            <Field label="Channel">
              <SelectInput value={notifForm.channel} onChange={(e) => setNotifForm({ ...notifForm, channel: e.target.value as typeof notifForm.channel })}>
                <option value="in_app">In-app</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="push">Push (generic body only)</option>
              </SelectInput>
            </Field>
            <Field label="Recipient ref">
              <TextInput value={notifForm.recipient_ref} onChange={(e) => setNotifForm({ ...notifForm, recipient_ref: e.target.value })} />
            </Field>
            <Field label="Title (no PHI for push)">
              <TextInput value={notifForm.title} onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })} />
            </Field>
            <Field label="Body (generic)">
              <TextInput value={notifForm.body_generic} onChange={(e) => setNotifForm({ ...notifForm, body_generic: e.target.value })} />
            </Field>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Send</Button>
              <Button type="button" variant="ghost" onClick={() => setOpenNotif(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
      {openThread ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: false, entityLabel: "message thread", onConfirm: doCreateThread });
            }}
          >
            <Field label="Subject" className="md:col-span-2">
              <TextInput required value={threadForm.subject} onChange={(e) => setThreadForm({ ...threadForm, subject: e.target.value })} />
            </Field>
            <Field label="Participants (emails, comma-separated)" className="md:col-span-2">
              <TextInput value={threadForm.participant_emails} onChange={(e) => setThreadForm({ ...threadForm, participant_emails: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.hms.notification" valueJson={extraJson} onChange={setExtraJson} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Create thread</Button>
              <Button type="button" variant="ghost" onClick={() => setOpenThread(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
      {tab === "prefs" ? (
        <Panel className="mb-4">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); askSave({ editing: false, entityLabel: "notification prefs", onConfirm: doSavePref }); }}>
            <Field label="Patient">
              <SelectInput value={prefForm.patient_id} onChange={(e) => setPrefForm({ ...prefForm, patient_id: e.target.value })}>
                <option value="">Tenant default</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.mrn} · {p.full_name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={prefForm.email_enabled} onChange={(e) => setPrefForm({ ...prefForm, email_enabled: e.target.checked })} />
                Email enabled
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={prefForm.sms_enabled} onChange={(e) => setPrefForm({ ...prefForm, sms_enabled: e.target.checked })} />
                SMS enabled
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={prefForm.push_enabled} onChange={(e) => setPrefForm({ ...prefForm, push_enabled: e.target.checked })} />
                Push enabled
              </label>
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Save preferences</Button>
            </div>
          </form>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">Patient</th>
                  <th>Email</th>
                  <th>SMS</th>
                  <th>Push</th>
                </tr>
              </thead>
              <tbody>
                {prefs.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="px-3 py-3">{p.patient_id ? patients.find((x) => x.id === p.patient_id)?.mrn ?? p.patient_id : "Default"}</td>
                    <td>{p.email_enabled ? "Yes" : "No"}</td>
                    <td>{p.sms_enabled ? "Yes" : "No"}</td>
                    <td>{p.push_enabled ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
      {tab === "threads" ? (
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <Panel>
            <h2 className="text-sm font-semibold">Threads</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {threads.map((t) => (
                <li key={t.id}>
                  <button type="button" className={`w-full rounded px-2 py-2 text-left hover:bg-slate-50 ${selectedThread === t.id ? "bg-slate-100 font-semibold" : ""}`} onClick={() => setSelectedThread(t.id)}>
                    {t.subject}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel>
            <h2 className="text-sm font-semibold">Messages</h2>
            {selectedThread ? (
              <>
                <div className="mt-2 max-h-64 space-y-2 overflow-y-auto text-sm">
                  {threadMessages.map((m) => (
                    <div key={m.id} className="rounded border border-line px-2 py-1">
                      <div className="text-xs text-slate-500">{m.sender_email}</div>
                      {m.body}
                    </div>
                  ))}
                </div>
                <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); askSave({ editing: false, entityLabel: "message", onConfirm: doSendMessage }); }}>
                  <TextInput className="flex-1" value={messageBody} onChange={(e) => setMessageBody(e.target.value)} placeholder="Reply…" />
                  <Button type="submit">Send</Button>
                </form>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Select a thread.</p>
            )}
          </Panel>
        </div>
      ) : null}
      {tab === "notifications" ? (
        <Panel>
          <DataListToolbar
            search={search}
            onSearchChange={setSearch}
            onExportCsv={() =>
              exportListCsv({
                tenantId,
                module: "healthcare",
                filename: "hms-notifications",
                rows: notifFiltered.map((r) => ({ Channel: r.channel, Title: r.title, Kind: r.kind, Date: r.created_at.slice(0, 10) }))
              })
            }
          />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">When</th>
                  <th>Channel</th>
                  <th>Title</th>
                  <th>Body</th>
                </tr>
              </thead>
              <tbody>
                {notifFiltered.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="px-3 py-3">{row.created_at.slice(0, 16)}</td>
                    <td>{row.channel}</td>
                    <td>{row.title}</td>
                    <td className="max-w-xs truncate">{row.body_generic}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </AppShell>
  );
}

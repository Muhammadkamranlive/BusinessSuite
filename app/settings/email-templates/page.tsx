"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, Plus, RefreshCw, Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { useConfirm } from "@/components/common/use-confirm";
import { Badge, Button, Field, Panel, SelectInput, TextArea, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import {
  createEmailTemplate,
  deleteEmailTemplate,
  emailApiHealth,
  listEmailTemplates,
  previewEmailTemplate,
  resetSystemEmailTemplates,
  sendTemplatedEmail,
  updateEmailTemplate
} from "@/lib/email/client";
import type { EmailTemplate } from "@/lib/email/types";
import { canMenu } from "@/modules/admin/services/acl.store";
import { getSystemSettings } from "@/modules/admin/services/admin.store";

const MENU_ID = "settings.email_templates";

type Draft = {
  id?: string;
  key: string;
  name: string;
  category: string;
  description: string;
  subject: string;
  html: string;
  text: string;
  variablesCsv: string;
  is_active: boolean;
  is_system: boolean;
};

function emptyDraft(): Draft {
  return {
    key: "",
    name: "",
    category: "custom",
    description: "",
    subject: "",
    html: "<p>Hello {{name}},</p>",
    text: "Hello {{name}},",
    variablesCsv: "name",
    is_active: true,
    is_system: false
  };
}

function toDraft(t: EmailTemplate): Draft {
  return {
    id: t.id,
    key: t.key,
    name: t.name,
    category: t.category,
    description: t.description,
    subject: t.subject,
    html: t.html,
    text: t.text,
    variablesCsv: (t.variables || []).join(", "),
    is_active: t.is_active,
    is_system: t.is_system
  };
}

export default function EmailTemplatesPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const actor = getSessionProfile();
  const { askSave, askPurge, ask, dialog } = useConfirm();
  const allowed = canMenu(actor.role, actor.email, MENU_ID, "view");
  const canCreate = canMenu(actor.role, actor.email, MENU_ID, "create");
  const canUpdate = canMenu(actor.role, actor.email, MENU_ID, "update");
  const canDelete = canMenu(actor.role, actor.email, MENU_ID, "delete");

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [health, setHealth] = useState<string>("…");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [testTo, setTestTo] = useState(actor.email || "");
  const [filter, setFilter] = useState("");

  async function refresh() {
    setError("");
    const [listRes, healthRes] = await Promise.all([listEmailTemplates(), emailApiHealth()]);
    if (!listRes.ok) {
      setError(listRes.error || "Could not load templates. Is the email API running?");
      setTemplates([]);
    } else {
      setTemplates(listRes.templates || []);
    }
    if (healthRes.ok) {
      const dry = (healthRes as { dryRun?: boolean }).dryRun ? " · dry-run" : "";
      setHealth(`Online${dry}`);
    } else {
      setHealth(healthRes.error || "Offline");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) =>
      [t.key, t.name, t.category, t.description].join(" ").toLowerCase().includes(q)
    );
  }, [templates, filter]);

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function saveDraft() {
    const variables = draft.variablesCsv
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const payload = {
      key: draft.key.trim(),
      name: draft.name.trim(),
      category: draft.category.trim() || "custom",
      description: draft.description.trim(),
      subject: draft.subject,
      html: draft.html,
      text: draft.text,
      variables,
      is_active: draft.is_active
    };

    askSave({
      editing: Boolean(draft.id),
      entityLabel: "email template",
      onConfirm: () => {
        void (async () => {
          setStatus("");
          setError("");
          const res = draft.id
            ? await updateEmailTemplate(draft.id, payload)
            : await createEmailTemplate(payload);
          if (!res.ok) {
            setError(res.error || "Save failed");
            return;
          }
          setStatus(draft.id ? "Template updated." : "Template created.");
          if (res.template) setDraft(toDraft(res.template));
          await refresh();
        })();
      }
    });
  }

  function runPreview() {
    void (async () => {
      setError("");
      const sample: Record<string, string> = {};
      draft.variablesCsv.split(",").map((v) => v.trim()).filter(Boolean).forEach((v) => {
        sample[v] = `{{${v}}}`;
      });
      const company = getSystemSettings().companyName;
      sample.company_name = sample.company_name || company;
      sample.user_name = sample.user_name || actor.name || "Alex";
      sample.employee_name = sample.employee_name || actor.name || "Alex";
      const res = await previewEmailTemplate({
        templateId: draft.id,
        templateKey: draft.key || undefined,
        subject: draft.subject,
        html: draft.html,
        text: draft.text,
        variables: sample
      });
      if (!res.ok || !res.preview) {
        setError(res.error || "Preview failed");
        return;
      }
      setPreviewSubject(res.preview.subject);
      setPreviewHtml(res.preview.html);
    })();
  }

  function sendTest() {
    if (!draft.key || !testTo.trim()) {
      setError("Pick a template key and enter a test recipient.");
      return;
    }
    ask({
      title: "Send test email?",
      message: `Send template “${draft.key}” to ${testTo.trim()} using sample variables.`,
      confirmLabel: "Send test",
      onConfirm: () => {
        void (async () => {
          const company = getSystemSettings().companyName;
          const res = await sendTemplatedEmail({
            to: testTo.trim(),
            tenantId,
            templateKey: draft.key,
            variables: {
              company_name: company,
              user_name: actor.name || "Test User",
              user_email: testTo.trim(),
              password: "TempPass123!",
              role_label: "Viewer",
              login_url: `${typeof window !== "undefined" ? window.location.origin : ""}/login`,
              employee_name: actor.name || "Test Employee",
              leave_type: "Annual",
              start_date: "2026-09-01",
              end_date: "2026-09-03",
              total_days: "3",
              reason: "Family travel",
              action_url: "/hrm/leave",
              approver_name: "HR Manager",
              customer_name: "Acme Corp",
              invoice_no: "INV-TEST-001",
              invoice_date: "2026-08-25",
              due_date: "2026-09-25",
              total_amount: "1,250.00",
              invoice_url: "/sales/invoices",
              order_no: "SO-TEST-001",
              order_url: "/sales/orders",
              form_name: "Pulse survey",
              message: "This is a test from Email Templates.",
              form_url: "/hrm/forms",
              title: "Test notification"
            },
            meta: { test: true }
          });
          if (!res.ok) {
            setStatus("");
            setError(res.error || "Test send failed");
            return;
          }
          setError("");
          const dryRun = Boolean((res.result as { dryRun?: boolean } | undefined)?.dryRun);
          setStatus(
            dryRun
              ? `Dry-run only — no real email sent to ${testTo.trim()}. Set EMAIL_DRY_RUN=false in the Email API repo (.env) and restart it.`
              : `Email sent to ${testTo.trim()}. Check that inbox (and spam).`
          );
        })();
      }
    });
  }

  if (!allowed) {
    return (
      <AppShell activeModule="settings">
        <ModuleBreadcrumbs />
        <PageHeader title="Email templates" description="You do not have access to this page." />
        <AdminSubnav active="/settings/email-templates" />
      </AppShell>
    );
  }

  return (
    <AppShell activeModule="settings">
      <ModuleBreadcrumbs />
      <PageHeader
        title="Email templates"
        description="Shared Nodemailer / Gmail templates used across Administration, HRM, Sales, and Forms. Edit once — every module can compose and send through the email API."
        actionLabel="Compose email"
        actionHref="/settings/compose"
      />
      <AdminSubnav active="/settings/email-templates" />
      {dialog}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={health.startsWith("Online") ? "success" : "danger"}>API: {health}</Badge>
        <Button variant="secondary" onClick={() => void refresh()}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>
        {canUpdate ? (
          <Button
            variant="secondary"
            onClick={() => {
              ask({
                title: "Reset system templates?",
                message: "Re-seed built-in templates (user.credentials, leave.*, invoice, order, survey). Custom templates are kept.",
                confirmLabel: "Reset system",
                onConfirm: () => {
                  void (async () => {
                    const res = await resetSystemEmailTemplates();
                    if (!res.ok) setError(res.error || "Reset failed");
                    else {
                      setStatus("System templates reset.");
                      await refresh();
                    }
                  })();
                }
              });
            }}
          >
            Reset system templates
          </Button>
        ) : null}
        {canCreate ? (
          <Button
            onClick={() => {
              setDraft(emptyDraft());
              setPreviewHtml("");
              setPreviewSubject("");
              setStatus("");
            }}
          >
            <Plus className="size-4" />
            New template
          </Button>
        ) : null}
      </div>

      {status ? <p className="mb-3 text-sm font-semibold text-teal">{status}</p> : null}
      {error ? <p className="mb-3 text-sm font-semibold text-rose-600">{error}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Panel className="min-w-0 p-4">
          <div className="mb-3">
            <Field label="Search templates">
              <TextInput value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="key, name, category…" />
            </Field>
          </div>
          <div className="max-h-[70vh] space-y-2 overflow-y-auto">
            {visible.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-500">No templates. Start the Email API (`npm run email:dev` from ERP root, or run the BusinessSuite-Email-API repo).</p>
            ) : (
              visible.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setDraft(toDraft(t));
                    setPreviewHtml("");
                    setPreviewSubject("");
                    setStatus("");
                    setError("");
                  }}
                  className={`w-full rounded-[var(--bs-radius)] border px-3 py-3 text-left transition ${
                    draft.id === t.id ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-teal"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{t.name}</span>
                    {t.is_system ? (
                      <span className={`text-[10px] font-bold uppercase ${draft.id === t.id ? "text-teal-200" : "text-teal"}`}>
                        system
                      </span>
                    ) : null}
                    {!t.is_active ? (
                      <span className={`text-[10px] font-bold uppercase ${draft.id === t.id ? "text-amber-200" : "text-amber-600"}`}>
                        inactive
                      </span>
                    ) : null}
                  </div>
                  <p className={`mt-1 font-mono text-xs ${draft.id === t.id ? "text-slate-300" : "text-slate-500"}`}>{t.key}</p>
                  <p className={`mt-1 text-xs ${draft.id === t.id ? "text-slate-300" : "text-slate-500"}`}>{t.category}</p>
                </button>
              ))
            )}
          </div>
        </Panel>

        <div className="min-w-0 space-y-4">
          <Panel className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Mail className="size-5 text-teal" />
              <h2 className="text-lg font-bold text-ink">{draft.id ? "Edit template" : "New template"}</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Key (stable id)">
                <TextInput
                  value={draft.key}
                  disabled={draft.is_system}
                  onChange={(e) => updateDraft("key", e.target.value)}
                  placeholder="e.g. custom.welcome"
                />
              </Field>
              <Field label="Name">
                <TextInput value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} />
              </Field>
              <Field label="Category">
                <SelectInput value={draft.category} onChange={(e) => updateDraft("category", e.target.value)}>
                  <option value="administration">administration</option>
                  <option value="hrm">hrm</option>
                  <option value="sales">sales</option>
                  <option value="system">system</option>
                  <option value="custom">custom</option>
                </SelectInput>
              </Field>
              <Field label="Active">
                <SelectInput
                  value={draft.is_active ? "yes" : "no"}
                  onChange={(e) => updateDraft("is_active", e.target.value === "yes")}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </SelectInput>
              </Field>
              <Field label="Description" className="md:col-span-2">
                <TextInput value={draft.description} onChange={(e) => updateDraft("description", e.target.value)} />
              </Field>
              <Field label="Subject" className="md:col-span-2">
                <TextInput value={draft.subject} onChange={(e) => updateDraft("subject", e.target.value)} />
              </Field>
              <Field label="Variables (comma-separated)" className="md:col-span-2">
                <TextInput
                  value={draft.variablesCsv}
                  onChange={(e) => updateDraft("variablesCsv", e.target.value)}
                  placeholder="company_name, user_name"
                />
              </Field>
              <Field label="HTML body" className="md:col-span-2">
                <TextArea rows={10} value={draft.html} onChange={(e) => updateDraft("html", e.target.value)} className="font-mono text-xs" />
              </Field>
              <Field label="Plain text body" className="md:col-span-2">
                <TextArea rows={5} value={draft.text} onChange={(e) => updateDraft("text", e.target.value)} className="font-mono text-xs" />
              </Field>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(draft.id ? canUpdate : canCreate) ? (
                <Button onClick={saveDraft}>{draft.id ? "Update template" : "Create template"}</Button>
              ) : null}
              <Button variant="secondary" onClick={runPreview}>
                Preview
              </Button>
              {canDelete && draft.id && !draft.is_system ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    askPurge({
                      entityLabel: "email template",
                      name: draft.name,
                      onConfirm: () => {
                        void (async () => {
                          const res = await deleteEmailTemplate(draft.id!);
                          if (!res.ok) setError(res.error || "Delete failed");
                          else {
                            setDraft(emptyDraft());
                            setStatus("Template deleted.");
                            await refresh();
                          }
                        })();
                      }
                    });
                  }}
                >
                  Delete
                </Button>
              ) : null}
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="mb-3 text-lg font-bold text-ink">Test send</h2>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Field label="Recipient">
                <TextInput type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
              </Field>
              <div className="flex items-end">
                <Button variant="secondary" onClick={sendTest} disabled={!draft.key}>
                  <Send className="size-4" />
                  Send test
                </Button>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Uses the template key above with sample variables. Requires Gmail app password on the email API (or EMAIL_DRY_RUN=true).
            </p>
          </Panel>

          {(previewSubject || previewHtml) && (
            <Panel className="p-5">
              <h2 className="mb-2 text-lg font-bold text-ink">Preview</h2>
              <p className="mb-3 text-sm font-semibold text-slate-700">Subject: {previewSubject}</p>
              <div
                className="overflow-x-auto rounded-[var(--bs-radius)] border border-line bg-white p-4 text-sm"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </Panel>
          )}
        </div>
      </div>
    </AppShell>
  );
}

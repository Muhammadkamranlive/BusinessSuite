"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Badge, Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSystemSettings, saveSystemSettings, type SystemSettings } from "@/modules/admin/services/admin.store";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { setSequencePrefix } from "@/modules/core/services/numbering.service";

export default function SystemSettingsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [status, setStatus] = useState("");
  const [extraJson, setExtraJson] = useState("");

  useEffect(() => {
    setSettings(getSystemSettings());
    setExtraJson(getExtraFieldValues(tenantId, "settings.system", tenantId));
  }, [tenantId]);

  if (!settings) {
    return (
      <AppShell activeModule="settings">
        <ModuleBreadcrumbs />
        <PageHeader title="System Settings" />
      </AppShell>
    );
  }

  function update<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function save() {
    const next = saveSystemSettings(settings!, tenantId);
    persistExtraFields(tenantId, "settings.system", tenantId, extraJson);
    setSequencePrefix(tenantId, "invoice", next.invoicePrefix);
    setSequencePrefix(tenantId, "purchase_order", next.poPrefix);
    setSequencePrefix(tenantId, "lead", next.leadPrefix);
    setSettings(next);
    setStatus("Settings saved. Document prefixes are stored in the database sequence table.");
  }

  return (
    <AppShell activeModule="settings">
      <ModuleBreadcrumbs />
      <PageHeader
        title="System Settings"
        description="Company profile, numbering prefixes, locale, and security defaults."
      />
      <AdminSubnav active="/settings/system" />

      {status ? <p className="mb-4 text-sm font-semibold text-teal">{status}</p> : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel className="p-5">
          <h2 className="mb-4 text-lg font-bold text-ink">Company profile</h2>
          <div className="grid gap-4">
            <Field label="Company name"><TextInput value={settings.companyName} onChange={(e) => update("companyName", e.target.value)} /></Field>
            <Field label="Legal name"><TextInput value={settings.legalName} onChange={(e) => update("legalName", e.target.value)} /></Field>
            <Field label="Support email"><TextInput type="email" value={settings.supportEmail} onChange={(e) => update("supportEmail", e.target.value)} /></Field>
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-4 text-lg font-bold text-ink">Locale & fiscal</h2>
          <div className="grid gap-4">
            <Field label="Timezone">
              <SelectInput value={settings.timezone} onChange={(e) => update("timezone", e.target.value)}>
                <option value="Asia/Dubai">Asia/Dubai</option>
                <option value="Asia/Karachi">Asia/Karachi</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
              </SelectInput>
            </Field>
            <Field label="Currency">
              <SelectInput value={settings.currency} onChange={(e) => update("currency", e.target.value)}>
                <option value="USD">USD</option>
                <option value="AED">AED</option>
                <option value="PKR">PKR</option>
                <option value="SAR">SAR</option>
              </SelectInput>
            </Field>
            <Field label="Date format">
              <SelectInput value={settings.dateFormat} onChange={(e) => update("dateFormat", e.target.value)}>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </SelectInput>
            </Field>
            <Field label="Fiscal year start (MM-DD)">
              <TextInput value={settings.fiscalYearStart} onChange={(e) => update("fiscalYearStart", e.target.value)} />
            </Field>
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-4 text-lg font-bold text-ink">Document numbering</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Invoice prefix"><TextInput value={settings.invoicePrefix} onChange={(e) => update("invoicePrefix", e.target.value)} /></Field>
            <Field label="PO prefix"><TextInput value={settings.poPrefix} onChange={(e) => update("poPrefix", e.target.value)} /></Field>
            <Field label="Lead prefix"><TextInput value={settings.leadPrefix} onChange={(e) => update("leadPrefix", e.target.value)} /></Field>
          </div>
          <p className="mt-3 text-xs text-slate-500">Example: {settings.invoicePrefix}-00001 · {settings.poPrefix}-00001 · {settings.leadPrefix}-00001</p>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-4 text-lg font-bold text-ink">Security defaults</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between rounded-[var(--bs-radius)] border border-line bg-cloud px-4 py-3">
              <span>
                <span className="block font-semibold text-ink">Allow user invites</span>
                <span className="text-xs text-slate-500">Admins can invite users from Users page</span>
              </span>
              <input type="checkbox" checked={settings.allowUserInvites} onChange={(e) => update("allowUserInvites", e.target.checked)} />
            </label>
            <label className="flex items-center justify-between rounded-[var(--bs-radius)] border border-line bg-cloud px-4 py-3">
              <span>
                <span className="block font-semibold text-ink">Require MFA (demo flag)</span>
                <span className="text-xs text-slate-500">Portfolio toggle for security posture</span>
              </span>
              <input type="checkbox" checked={settings.requireMfa} onChange={(e) => update("requireMfa", e.target.checked)} />
            </label>
            <Field label="Session length (hours)">
              <TextInput type="number" min={1} max={168} value={settings.sessionHours} onChange={(e) => update("sessionHours", Number(e.target.value) || 24)} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Badge tone={settings.allowUserInvites ? "success" : "warning"}>{settings.allowUserInvites ? "Invites on" : "Invites off"}</Badge>
              <Badge tone={settings.requireMfa ? "info" : "neutral"}>{settings.requireMfa ? "MFA required" : "MFA optional"}</Badge>
            </div>
          </div>
        </Panel>
      </div>

      <form
        className="mt-5 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <ExtraFieldsBlock formKey="settings.system" valueJson={extraJson} onChange={setExtraJson} />
        <Button type="submit">Save system settings</Button>
      </form>
    </AppShell>
  );
}

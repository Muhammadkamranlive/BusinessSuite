"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { useConfirm } from "@/components/common/use-confirm";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import {
  listSsoConfigs,
  pullHmsClinicalFromSupabase,
  subscribeHmsClinical,
  upsertSsoConfig,
  type HmsSsoConfig,
  type HmsSsoProvider
} from "@/modules/healthcare/services/hms-clinical.store";

export default function HmsSsoPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [configs, setConfigs] = useState<HmsSsoConfig[]>([]);
  const [form, setForm] = useState({
    provider: "oidc" as HmsSsoProvider,
    issuer_url: "",
    client_id: "",
    enabled: false,
    notes: ""
  });

  function refresh() {
    setConfigs(listSsoConfigs(tenantId));
    const oidc = listSsoConfigs(tenantId).find((c) => c.provider === "oidc");
    if (oidc) {
      setForm({
        provider: oidc.provider,
        issuer_url: oidc.issuer_url,
        client_id: oidc.client_id,
        enabled: oidc.enabled,
        notes: oidc.notes ?? ""
      });
    }
  }

  useEffect(() => {
    void pullHmsClinicalFromSupabase(tenantId).finally(() => refresh());
    return subscribeHmsClinical(() => refresh());
  }, [tenantId]);

  function doSave() {
    if (!form.issuer_url.trim() || !form.client_id.trim()) return;
    upsertSsoConfig(tenantId, {
      provider: form.provider,
      issuer_url: form.issuer_url.trim(),
      client_id: form.client_id.trim(),
      enabled: form.enabled,
      notes: form.notes || null
    });
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Enterprise SSO (stub)"
        description="Configure OIDC/SAML metadata for future IdP integration. Secrets are stored as vault references only — not live login."
      />
      <Panel className="mb-4 border-amber-200 bg-amber-50/50">
        <p className="text-sm text-amber-900">
          <strong>Enterprise stub:</strong> Enabling SSO here does not activate Supabase Auth federation. Wire a BAA-covered IdP and
          Supabase SSO in production. Client secrets must never be stored in plaintext.
        </p>
      </Panel>
      <Panel>
        <form
          className="grid max-w-2xl gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            askSave({ editing: configs.length > 0, entityLabel: "SSO config", onConfirm: doSave });
          }}
        >
          <Field label="Provider">
            <SelectInput value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value as HmsSsoProvider })}>
              <option value="oidc">OIDC</option>
              <option value="saml">SAML</option>
            </SelectInput>
          </Field>
          <Field label="Issuer URL">
            <TextInput required placeholder="https://idp.example.com" value={form.issuer_url} onChange={(e) => setForm({ ...form, issuer_url: e.target.value })} />
          </Field>
          <Field label="Client ID">
            <TextInput required value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} />
          </Field>
          <Field label="Client secret ref">
            <TextInput disabled value="vault://stub-not-configured" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
            Enable SSO flag (stub — no live IdP)
          </label>
          <Field label="Notes">
            <TextInput value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit">Save configuration</Button>
          </div>
        </form>
        {configs.length ? (
          <div className="mt-6 text-xs text-slate-500">
            Saved: {configs.map((c) => `${c.provider} (${c.enabled ? "enabled" : "disabled"})`).join(", ")}
          </div>
        ) : null}
      </Panel>
    </AppShell>
  );
}

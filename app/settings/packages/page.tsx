"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, SelectInput, TextArea, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { canMenu } from "@/modules/admin/services/acl.store";
import {
  deletePackage,
  formatMoney,
  listPackages,
  resetDefaultPackages,
  upsertPackage,
  type PlanTier,
  type SubscriptionPackage
} from "@/modules/billing/services/subscriptions.store";

const emptyForm = {
  id: "",
  code: "silver" as PlanTier,
  name: "",
  badge: "",
  tagline: "",
  description: "",
  featuresText: "",
  max_users: 10,
  monthly_price: 49,
  yearly_price: 490,
  currency: "usd",
  sort_order: 1,
  highlighted: false,
  is_active: true
};

export default function PackagesAdminPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const actor = getSessionProfile();
  const allowed = canMenu(actor.role, actor.email, "settings.subscription_packages", "view");
  const { askSave, askTrash, ask, dialog } = useConfirm();
  const [rows, setRows] = useState<SubscriptionPackage[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [extraJson, setExtraJson] = useState("");
  const [message, setMessage] = useState("");

  function refresh() {
    setRows(listPackages());
  }

  useEffect(() => {
    refresh();
  }, []);

  function edit(row: SubscriptionPackage) {
    setForm({
      id: row.id,
      code: row.code,
      name: row.name,
      badge: row.badge,
      tagline: row.tagline,
      description: row.description,
      featuresText: row.features.join("\n"),
      max_users: row.max_users,
      monthly_price: row.monthly_price_cents / 100,
      yearly_price: row.yearly_price_cents / 100,
      currency: row.currency,
      sort_order: row.sort_order,
      highlighted: Boolean(row.highlighted),
      is_active: row.is_active
    });
    setExtraJson(getExtraFieldValues(tenantId, "billing.package", row.id));
  }

  function save() {
    askSave({
      editing: Boolean(form.id),
      entityLabel: "subscription package",
      onConfirm: () => {
        const saved = upsertPackage({
          id: form.id || undefined,
          code: form.code,
          name: form.name.trim(),
          badge: form.badge.trim() || form.code,
          tagline: form.tagline.trim(),
          description: form.description.trim(),
          features: form.featuresText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean),
          max_users: Number(form.max_users) || 0,
          monthly_price_cents: Math.round(Number(form.monthly_price) * 100),
          yearly_price_cents: Math.round(Number(form.yearly_price) * 100),
          currency: form.currency.trim().toLowerCase() || "usd",
          sort_order: Number(form.sort_order) || 99,
          highlighted: form.highlighted,
          is_active: form.is_active
        });
        persistExtraFields(tenantId, "billing.package", saved.id, extraJson);
        setMessage(`Saved ${saved.name}.`);
        setForm(emptyForm);
        setExtraJson("");
        refresh();
      }
    });
  }

  if (!allowed) {
    return (
      <AppShell activeModule="settings">
        <AdminSubnav active="/settings/packages" />
        <PageHeader title="Subscription packages" description="The package catalog is a platform Super Admin tool. Company admins manage their own billing, not the catalog." />
      </AppShell>
    );
  }

  return (
    <AppShell activeModule="settings">
      <AdminSubnav active="/settings/packages" />
      <PageHeader
        title="Subscription packages"
        description="Silver, Gold, Platinum, and Professional plans with monthly and yearly prices. Companies pay to activate their ERP account."
      />
      <ModuleBreadcrumbs />
      {message ? <p className="mb-4 text-sm font-semibold text-teal">{message}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-ink">Packages</h2>
            <Button
              variant="secondary"
              onClick={() =>
                ask({
                  title: "Reset default packages?",
                  message: "Restore Silver / Gold / Platinum / Professional defaults. Custom edits will be overwritten.",
                  confirmLabel: "Reset defaults",
                  onConfirm: () => {
                    resetDefaultPackages();
                    setMessage("Defaults restored.");
                    refresh();
                  }
                })
              }
            >
              Reset defaults
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-cloud">
                  {["Plan", "Monthly", "Yearly", "Users", "Active", ""].map((h) => (
                    <th key={h || "a"} className="px-3 py-3 font-semibold text-slate-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-line">
                    <td className="px-3 py-3">
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-xs text-slate-500">{r.badge}</p>
                    </td>
                    <td className="px-3 py-3">{formatMoney(r.monthly_price_cents, r.currency)}</td>
                    <td className="px-3 py-3">{formatMoney(r.yearly_price_cents, r.currency)}</td>
                    <td className="px-3 py-3">{r.max_users === 0 ? "Unlimited" : r.max_users}</td>
                    <td className="px-3 py-3">{r.is_active ? "Yes" : "No"}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" className="!min-h-8 !px-3 !text-xs" onClick={() => edit(r)}>
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          className="!min-h-8 !px-3 !text-xs"
                          onClick={() =>
                            askTrash({
                              entityLabel: "package",
                              name: r.name,
                              onConfirm: () => {
                                deletePackage(r.id);
                                setMessage(`Removed ${r.name}.`);
                                refresh();
                              }
                            })
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <h2 className="mb-4 text-lg font-bold text-ink">{form.id ? "Edit package" : "Add package"}</h2>
          <div className="grid gap-3">
            <Field label="Tier code">
              <SelectInput value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value as PlanTier })}>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
                <option value="professional">Professional</option>
              </SelectInput>
            </Field>
            <Field label="Display name">
              <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Badge">
              <TextInput value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Popular" />
            </Field>
            <Field label="Tagline">
              <TextInput value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
            </Field>
            <Field label="Description">
              <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Field label="Features (one per line)">
              <TextArea value={form.featuresText} onChange={(e) => setForm({ ...form, featuresText: e.target.value })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Monthly price">
                <TextInput
                  type="number"
                  min={0}
                  step="1"
                  value={form.monthly_price}
                  onChange={(e) => setForm({ ...form, monthly_price: Number(e.target.value) })}
                />
              </Field>
              <Field label="Yearly price">
                <TextInput
                  type="number"
                  min={0}
                  step="1"
                  value={form.yearly_price}
                  onChange={(e) => setForm({ ...form, yearly_price: Number(e.target.value) })}
                />
              </Field>
              <Field label="Max users (0 = unlimited)">
                <TextInput
                  type="number"
                  min={0}
                  value={form.max_users}
                  onChange={(e) => setForm({ ...form, max_users: Number(e.target.value) })}
                />
              </Field>
              <Field label="Currency">
                <TextInput value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={form.highlighted} onChange={(e) => setForm({ ...form, highlighted: e.target.checked })} />
              Highlight on pricing page
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active (sellable)
            </label>
            <ExtraFieldsBlock formKey="billing.package" valueJson={extraJson} onChange={setExtraJson} />
            <div className="flex flex-wrap gap-2">
              <Button onClick={save}>{form.id ? "Update package" : "Create package"}</Button>
              {form.id ? (
                <Button variant="secondary" onClick={() => { setForm(emptyForm); setExtraJson(""); }}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>
        </Panel>
      </div>
      {dialog}
    </AppShell>
  );
}

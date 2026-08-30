"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { Button, Field, Panel, SelectInput } from "@/components/ui";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { canMenu } from "@/modules/admin/services/acl.store";
import { EXTRA_FORM_CATALOG, getExtraFormLabel } from "@/modules/forms/form-catalog";
import { getFormSchema, listTenantFormSchemas } from "@/modules/forms/services/extra-fields.store";

export default function ExtraFormFieldsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const actor = getSessionProfile();
  const allowed = canMenu(actor.role, actor.email, "settings.extra_form_fields", "view");
  const canUpdate = canMenu(actor.role, actor.email, "settings.extra_form_fields", "update");

  const [formKey, setFormKey] = useState(EXTRA_FORM_CATALOG[0].key);
  const [previewJson, setPreviewJson] = useState("{}");
  const [tick, setTick] = useState(0);
  const schemas = useMemo(() => listTenantFormSchemas(tenantId), [tenantId, tick]);
  const fieldCount = getFormSchema(tenantId, formKey).length;

  if (!allowed) {
    return (
      <AppShell activeModule="settings">
        <AdminSubnav active="/settings/forms" />
        <PageHeader title="Extra form fields" description="You do not have access to modify company form formats." />
      </AppShell>
    );
  }

  const modules = [...new Set(EXTRA_FORM_CATALOG.map((f) => f.module))];

  return (
    <AppShell activeModule="settings">
      <AdminSubnav active="/settings/forms" />
      <PageHeader
        title="Extra form fields"
        description="Each company can extend any module form. Only HR and administrators can add or change extra fields. Employees can fill them when they exist."
      />
      <ModuleBreadcrumbs />

      <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
        <Panel>
          <h2 className="mb-3 text-sm font-semibold text-ink">Forms with extra fields</h2>
          {schemas.length === 0 ? <p className="text-sm text-slate-500">None yet for this company.</p> : null}
          <ul className="space-y-2 text-sm">
            {schemas.map((s) => (
              <li key={s.form_key}>
                <button
                  type="button"
                  className="font-semibold text-teal hover:underline"
                  onClick={() => {
                    setFormKey(s.form_key);
                    setPreviewJson("{}");
                    setTick((t) => t + 1);
                  }}
                >
                  {getExtraFormLabel(s.form_key)}
                </button>
                <span className="text-slate-500"> · {s.fields.length} fields</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <Field label="Module form">
              <SelectInput
                value={formKey}
                onChange={(e) => {
                  setFormKey(e.target.value);
                  setPreviewJson("{}");
                  setTick((t) => t + 1);
                }}
              >
                {modules.map((mod) => (
                  <optgroup key={mod} label={mod}>
                    {EXTRA_FORM_CATALOG.filter((f) => f.module === mod).map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </SelectInput>
            </Field>
            <p className="self-end text-sm text-slate-500">{fieldCount} extra field{fieldCount === 1 ? "" : "s"} on this form</p>
          </div>
          <ExtraFieldsBlock
            key={`${formKey}-${tick}`}
            formKey={formKey}
            valueJson={previewJson}
            onChange={setPreviewJson}
            allowDesign={canUpdate || canMenu(actor.role, actor.email, "settings.extra_form_fields", "create")}
          />
          <div className="mt-4">
            <Button type="button" variant="secondary" onClick={() => setTick((t) => t + 1)}>
              Refresh list
            </Button>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

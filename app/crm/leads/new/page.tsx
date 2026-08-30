"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Panel, Button, SelectInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { createLead } from "@/modules/crm/services/crm.store";
import type { LeadPriority, LeadStatus } from "@/modules/crm/types";

export default function NewLeadPage() {
  const router = useRouter();
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    source: "website",
    status: "new" as LeadStatus,
    priority: "medium" as LeadPriority,
    estimated_value: 0,
    notes: ""
  });
  const [error, setError] = useState("");
  const [extraJson, setExtraJson] = useState("");

  function doSave() {
    if (!form.company_name || !form.contact_name || !form.email) {
      setError("Company name, contact name, and email are required.");
      return;
    }
    const lead = createLead(tenantId, { ...form, assigned_to: null, notes: form.notes || null });
    persistExtraFields(tenantId, "crm.lead", lead.id, extraJson);
    setExtraJson("");
    router.push(`/crm/leads/${lead.id}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    askSave({
      editing: false,
      entityLabel: "lead",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="crm">
      <PageHeader title="New Lead" description="Create a new sales lead." />
      <ModuleBreadcrumbs trail={[{ label: "Leads", href: "/crm/leads" }, { label: "New" }]} />
      <Panel>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
          {(
            [
              ["company_name", "Company Name"],
              ["contact_name", "Contact Name"],
              ["email", "Email"],
              ["phone", "Phone"],
              ["source", "Source"]
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-sm font-semibold text-ink">{label}</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
          <label className="block">
            <span className="text-sm font-semibold text-ink">Estimated Value</span>
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm"
              value={form.estimated_value}
              onChange={(e) => setForm({ ...form, estimated_value: Number(e.target.value) })}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Status</span>
            <div className="mt-1">
              <SelectInput
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}
              >
                {["new", "contacted", "qualified", "lost", "converted"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectInput>
            </div>
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-semibold text-ink">Notes</span>
            <textarea
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          <ExtraFieldsBlock formKey="crm.lead" valueJson={extraJson} onChange={setExtraJson} />
          <div className="md:col-span-2 flex gap-2">
            <Button type="submit">Save Lead</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setExtraJson("");
                router.back();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Panel>
      {dialog}
    </AppShell>
  );
}

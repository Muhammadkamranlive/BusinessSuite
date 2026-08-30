"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { CompanyLetterhead } from "@/components/forms/company-letterhead";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { FileDropzone } from "@/components/common/file-dropzone";
import { useConfirm } from "@/components/common/use-confirm";
import { Button, Field, Panel, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { getCompanyProfile, upsertCompanyProfile } from "@/modules/hrm/services/hrm.store";

const emptyForm = {
  legal_name: "",
  ntn: "",
  address: "",
  phone: "",
  email: "",
  logo_data_url: "",
  letterhead_title: "",
  letterhead_tagline: "",
  letterhead_footer: "",
  brand_color: "#1877f2"
};

export default function CompanyProfilePage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [form, setForm] = useState(emptyForm);
  const [extraJson, setExtraJson] = useState("");
  const [saved, setSaved] = useState(false);

  function refresh() {
    const profile = getCompanyProfile(tenantId);
    setForm({
      legal_name: profile?.legal_name ?? "",
      ntn: profile?.ntn ?? "",
      address: profile?.address ?? "",
      phone: profile?.phone ?? "",
      email: profile?.email ?? "",
      logo_data_url: profile?.logo_data_url ?? "",
      letterhead_title: profile?.letterhead_title ?? "",
      letterhead_tagline: profile?.letterhead_tagline ?? "",
      letterhead_footer: profile?.letterhead_footer ?? "",
      brand_color: profile?.brand_color ?? "#1877f2"
    });
    setExtraJson(getExtraFieldValues(tenantId, "hrm.company", tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  function onLogoFile(file: File) {
    if (file.size > 800_000) {
      alert("Please use a logo under ~800KB for demo storage.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, logo_data_url: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  }

  function doSave() {
    upsertCompanyProfile(tenantId, {
      legal_name: form.legal_name.trim(),
      ntn: form.ntn.trim() || null,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      logo_data_url: form.logo_data_url.trim() || null,
      letterhead_title: form.letterhead_title.trim() || null,
      letterhead_tagline: form.letterhead_tagline.trim() || null,
      letterhead_footer: form.letterhead_footer.trim() || null,
      brand_color: form.brand_color.trim() || "#1877f2"
    });
    persistExtraFields(tenantId, "hrm.company", tenantId, extraJson);
    refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({ editing: true, entityLabel: "company profile", onConfirm: doSave });
  }

  const preview = {
    legal_name: form.legal_name || "Company",
    ntn: form.ntn || null,
    address: form.address || null,
    phone: form.phone || null,
    email: form.email || null,
    logo_data_url: form.logo_data_url || null,
    letterhead_title: form.letterhead_title || null,
    letterhead_tagline: form.letterhead_tagline || null,
    letterhead_footer: form.letterhead_footer || null,
    brand_color: form.brand_color || "#1877f2",
    id: "preview",
    tenant_id: tenantId,
    created_at: "",
    updated_at: "",
    is_active: true
  };

  return (
    <AppShell activeModule="hrm">
      <PageHeader
        title="Company"
        description="Legal profile and letterhead used on custom employee forms and letters."
      />
      <ModuleBreadcrumbs />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-4 text-lg font-bold text-ink">Company details</h2>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <Field label="Legal name" className="md:col-span-2">
              <TextInput required value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
            </Field>
            <Field label="NTN / Tax number">
              <TextInput value={form.ntn} onChange={(e) => setForm({ ...form, ntn: e.target.value })} placeholder="Optional" />
            </Field>
            <Field label="Phone">
              <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Optional" />
            </Field>
            <Field label="Email" className="md:col-span-2">
              <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Optional" />
            </Field>
            <Field label="Address" className="md:col-span-2">
              <TextInput value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Optional" />
            </Field>

            <h3 className="md:col-span-2 mt-2 text-sm font-bold uppercase tracking-wide text-slate-500">Letterhead</h3>
            <Field label="Letterhead title" hint="Defaults to legal name if empty">
              <TextInput value={form.letterhead_title} onChange={(e) => setForm({ ...form, letterhead_title: e.target.value })} />
            </Field>
            <Field label="Brand color">
              <TextInput type="color" value={form.brand_color} onChange={(e) => setForm({ ...form, brand_color: e.target.value })} />
            </Field>
            <Field label="Tagline" className="md:col-span-2">
              <TextInput value={form.letterhead_tagline} onChange={(e) => setForm({ ...form, letterhead_tagline: e.target.value })} placeholder="e.g. People & Culture" />
            </Field>
            <Field label="Footer line" className="md:col-span-2">
              <TextInput value={form.letterhead_footer} onChange={(e) => setForm({ ...form, letterhead_footer: e.target.value })} placeholder="Confidential…" />
            </Field>
            <FileDropzone
              className="md:col-span-2"
              label="Logo"
              hint="PNG or JPG under ~800KB. Shown on employee forms."
              accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
              previewUrl={form.logo_data_url || undefined}
              fileName={form.logo_data_url ? "Company logo" : undefined}
              onFile={onLogoFile}
              onClear={() => setForm({ ...form, logo_data_url: "" })}
            />
            <ExtraFieldsBlock formKey="hrm.company" valueJson={extraJson} onChange={setExtraJson} />

            <div className="flex items-center gap-3 md:col-span-2">
              <Button type="submit">Save profile</Button>
              {saved ? (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-[color:var(--bs-teal)]">
                  <CheckCircle2 className="size-4" aria-hidden="true" /> Saved
                </span>
              ) : null}
            </div>
          </form>
        </Panel>

        <Panel>
          <h2 className="mb-4 text-lg font-bold text-ink">Letterhead preview</h2>
          <CompanyLetterhead company={preview} subtitle="Preview — used on custom forms sent to employees" />
          <ExtraFieldsReadout tenantId={tenantId} formKey="hrm.company" recordId={tenantId} json={extraJson} />
        </Panel>
      </div>
      {dialog}
    </AppShell>
  );
}

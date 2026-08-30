"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createJobFamily,
  createJobProfile,
  listJobFamilies,
  listJobProfiles,
  listPayGrades,
  trashJobFamily,
  trashJobProfile
} from "@/modules/hrm/services/workday.store";

export default function JobsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [tick, setTick] = useState(0);
  const [familyForm, setFamilyForm] = useState({ name: "", code: "", description: "" });
  const [profileForm, setProfileForm] = useState({ title: "", code: "", family_id: "", job_level: "P2", pay_grade_id: "", description: "" });
  const [extraJson, setExtraJson] = useState("");

  const families = useMemo(() => listJobFamilies(tenantId), [tenantId, tick]);
  const profiles = useMemo(() => listJobProfiles(tenantId), [tenantId, tick]);
  const grades = useMemo(() => listPayGrades(tenantId), [tenantId, tick]);

  return (
    <AppShell activeModule="hrm">
      <PageHeader title="Jobs" description="Job families and job profiles (Workday job catalog)." />
      <ModuleBreadcrumbs />
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel>
          <h2 className="mb-4 text-lg font-bold text-ink">Job family</h2>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({
                editing: false,
                entityLabel: "job family",
                onConfirm: () => {
                  const row = createJobFamily(tenantId, { ...familyForm, description: familyForm.description || null });
                  persistExtraFields(tenantId, "hrm.job_family", row.id, extraJson);
                  setFamilyForm({ name: "", code: "", description: "" });
                  setTick((n) => n + 1);
                }
              });
            }}
          >
            <Field label="Name"><TextInput required value={familyForm.name} onChange={(e) => setFamilyForm({ ...familyForm, name: e.target.value })} /></Field>
            <Field label="Code"><TextInput required value={familyForm.code} onChange={(e) => setFamilyForm({ ...familyForm, code: e.target.value })} /></Field>
            <Field label="Description"><TextInput value={familyForm.description} onChange={(e) => setFamilyForm({ ...familyForm, description: e.target.value })} /></Field>
            <ExtraFieldsBlock formKey="hrm.job_family" valueJson={extraJson} onChange={setExtraJson} />
            <Button type="submit">Add family</Button>
          </form>
          <ul className="mt-4 space-y-2">
            {families.map((f) => (
              <li key={f.id} className="flex items-center justify-between rounded-[var(--bs-radius)] border border-line px-3 py-2">
                <span className="text-sm font-semibold">{f.name} <span className="text-xs text-slate-500">{f.code}</span></span>
                <RecordRowActions
                  onTrash={() => askTrash({ entityLabel: "job family", name: f.name, onConfirm: () => { trashJobFamily(f.id); setTick((n) => n + 1); } })}
                />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <h2 className="mb-4 text-lg font-bold text-ink">Job profile</h2>
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({
                editing: false,
                entityLabel: "job profile",
                onConfirm: () => {
                  const row = createJobProfile(tenantId, {
                    family_id: profileForm.family_id,
                    title: profileForm.title.trim(),
                    code: profileForm.code.trim(),
                    job_level: profileForm.job_level,
                    pay_grade_id: profileForm.pay_grade_id || null,
                    description: profileForm.description || null
                  });
                  persistExtraFields(tenantId, "hrm.job_profile", row.id, extraJson);
                  setTick((n) => n + 1);
                }
              });
            }}
          >
            <Field label="Title" className="md:col-span-2"><TextInput required value={profileForm.title} onChange={(e) => setProfileForm({ ...profileForm, title: e.target.value })} /></Field>
            <Field label="Code"><TextInput required value={profileForm.code} onChange={(e) => setProfileForm({ ...profileForm, code: e.target.value })} /></Field>
            <Field label="Level"><TextInput required value={profileForm.job_level} onChange={(e) => setProfileForm({ ...profileForm, job_level: e.target.value })} /></Field>
            <Field label="Family">
              <SelectInput required value={profileForm.family_id} onChange={(e) => setProfileForm({ ...profileForm, family_id: e.target.value })}>
                <option value="">Select</option>
                {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Pay grade">
              <SelectInput value={profileForm.pay_grade_id} onChange={(e) => setProfileForm({ ...profileForm, pay_grade_id: e.target.value })}>
                <option value="">—</option>
                {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </SelectInput>
            </Field>
            <Button type="submit" className="md:col-span-2">Add job profile</Button>
          </form>
          <ul className="mt-4 space-y-2">
            {profiles.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-[var(--bs-radius)] border border-line px-3 py-2 text-sm">
                <span><span className="font-semibold">{p.title}</span> · {p.job_level} · {p.code}</span>
                <RecordRowActions onTrash={() => askTrash({ entityLabel: "job profile", name: p.title, onConfirm: () => { trashJobProfile(p.id); setTick((n) => n + 1); } })} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      {dialog}
    </AppShell>
  );
}

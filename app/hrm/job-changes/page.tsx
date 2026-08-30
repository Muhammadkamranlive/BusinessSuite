"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, SelectInput, TextArea, TextInput } from "@/components/ui";
import { getSelfServiceContext } from "@/lib/auth/current-employee";
import { getStoredTenantId } from "@/lib/auth/session";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { findCompanyHrEmail } from "@/modules/admin/services/admin.store";
import { listDepartments, listDesignations, listEmployees } from "@/modules/hrm/services/hrm.store";
import { listJobChanges, listWorkLocations, startOffboarding, submitJobChange } from "@/modules/hrm/services/workday.store";
import type { JobChangeType } from "@/modules/hrm/workday-model";

export default function JobChangesPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { employee, profile } = getSelfServiceContext(tenantId);
  const { askSave, dialog } = useConfirm();
  const [tick, setTick] = useState(0);
  const [extraJson, setExtraJson] = useState("");
  const [form, setForm] = useState({
    employee_id: employee?.id ?? "",
    type: "transfer" as JobChangeType,
    effective_date: new Date().toISOString().slice(0, 10),
    reason: "",
    to_department_id: "",
    to_manager_id: "",
    to_designation_id: "",
    to_location_id: "",
    to_salary: ""
  });

  const people = useMemo(() => listEmployees(tenantId), [tenantId]);
  const depts = useMemo(() => listDepartments(tenantId), [tenantId]);
  const desigs = useMemo(() => listDesignations(tenantId), [tenantId]);
  const locs = useMemo(() => listWorkLocations(tenantId), [tenantId, tick]);
  const rows = useMemo(() => listJobChanges(tenantId, employee && profile.role === "employee" ? employee.id : undefined), [tenantId, employee, profile.role, tick]);

  const selected = people.find((p) => p.id === form.employee_id);

  function submitChange() {
    if (!form.employee_id) return;
    const row = submitJobChange(
      tenantId,
      {
        employee_id: form.employee_id,
        type: form.type,
        effective_date: form.effective_date,
        reason: form.reason.trim(),
        from_department_id: selected?.department_id,
        to_department_id: form.to_department_id || selected?.department_id,
        from_manager_id: selected?.manager_id ?? null,
        to_manager_id: form.to_manager_id || selected?.manager_id || null,
        from_designation_id: selected?.designation_id ?? null,
        to_designation_id: form.to_designation_id || selected?.designation_id || null,
        from_location_id: null,
        to_location_id: form.to_location_id || null,
        from_salary: selected?.basic_salary ?? null,
        to_salary: form.to_salary ? Number(form.to_salary) : selected?.basic_salary ?? null,
        requested_by: profile.email
      },
      findCompanyHrEmail(tenantId, profile.email)
    );
    persistExtraFields(tenantId, "hrm.job_change", row.id, extraJson);
    setExtraJson("");
    setTick((n) => n + 1);
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader title="Job Changes" description="Transfer, promote, location change, compensation change, and termination — effective-dated, with inbox approval." />
      <ModuleBreadcrumbs />
      <Panel className="mb-5">
        <h2 className="mb-4 text-lg font-bold text-ink">Initiate change</h2>
        <form
          className="grid gap-3 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (form.type === "terminate") {
              askSave({
                editing: false,
                entityLabel: "offboarding",
                onConfirm: () => {
                  startOffboarding(tenantId, form.employee_id, form.effective_date, profile.email);
                  setTick((n) => n + 1);
                }
              });
              return;
            }
            askSave({ editing: false, entityLabel: "job change", onConfirm: submitChange });
          }}
        >
          <Field label="Worker">
            <SelectInput required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
              <option value="">Select</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Type">
            <SelectInput value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as JobChangeType })}>
              <option value="transfer">Transfer</option>
              <option value="promote">Promote</option>
              <option value="demote">Demote</option>
              <option value="location_change">Location change</option>
              <option value="compensation_change">Compensation change</option>
              <option value="terminate">Terminate / offboard</option>
            </SelectInput>
          </Field>
          <Field label="Effective date"><TextInput required type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} /></Field>
          <Field label="To department">
            <SelectInput value={form.to_department_id} onChange={(e) => setForm({ ...form, to_department_id: e.target.value })}>
              <option value="">Keep current</option>
              {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="To manager">
            <SelectInput value={form.to_manager_id} onChange={(e) => setForm({ ...form, to_manager_id: e.target.value })}>
              <option value="">Keep current</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </SelectInput>
          </Field>
          <Field label="To designation">
            <SelectInput value={form.to_designation_id} onChange={(e) => setForm({ ...form, to_designation_id: e.target.value })}>
              <option value="">Keep current</option>
              {desigs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="To location">
            <SelectInput value={form.to_location_id} onChange={(e) => setForm({ ...form, to_location_id: e.target.value })}>
              <option value="">Keep current</option>
              {locs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="To salary"><TextInput type="number" min={0} value={form.to_salary} onChange={(e) => setForm({ ...form, to_salary: e.target.value })} placeholder="Keep current" /></Field>
          <Field label="Reason" className="md:col-span-3">
            <TextArea required rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </Field>
          <ExtraFieldsBlock formKey="hrm.job_change" valueJson={extraJson} onChange={setExtraJson} />
          <div className="md:col-span-3"><Button type="submit">Submit for approval</Button></div>
        </form>
      </Panel>
      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                {["Worker", "Type", "Effective", "Reason", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line">
                  <td className="px-4 py-3"><Link href={`/hrm/employees/${r.employee_id}`} className="text-teal hover:underline">{people.find((p) => p.id === r.employee_id)?.full_name}</Link></td>
                  <td className="px-4 py-3 capitalize">{r.type.replace("_", " ")}</td>
                  <td className="px-4 py-3">{r.effective_date}</td>
                  <td className="px-4 py-3">{r.reason}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {dialog}
    </AppShell>
  );
}

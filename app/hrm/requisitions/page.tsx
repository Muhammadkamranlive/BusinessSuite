"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { findCompanyHrEmail } from "@/modules/admin/services/admin.store";
import { getDepartmentName, listDepartments } from "@/modules/hrm/services/hrm.store";
import { createRequisition, getPositionTitle, getWorkLocationName, listPositions, listRequisitions, listWorkLocations } from "@/modules/hrm/services/workday.store";

export default function RequisitionsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const profile = getSessionProfile();
  const { askSave, dialog } = useConfirm();
  const [tick, setTick] = useState(0);
  const [extraJson, setExtraJson] = useState("");
  const [form, setForm] = useState({ title: "", department_id: "", position_id: "", location_id: "", openings: "1", reason: "" });

  const rows = useMemo(() => listRequisitions(tenantId), [tenantId, tick]);
  const depts = useMemo(() => listDepartments(tenantId), [tenantId]);
  const positions = useMemo(() => listPositions(tenantId).filter((p) => p.status === "open"), [tenantId, tick]);
  const locs = useMemo(() => listWorkLocations(tenantId), [tenantId, tick]);

  return (
    <AppShell activeModule="hrm">
      <PageHeader title="Requisitions" description="Job requisitions tied to vacant positions — approval lands in Inbox." />
      <ModuleBreadcrumbs />
      <Panel className="mb-5">
        <form
          className="grid gap-3 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            askSave({
              editing: false,
              entityLabel: "requisition",
              onConfirm: () => {
                const row = createRequisition(
                  tenantId,
                  {
                    title: form.title.trim(),
                    department_id: form.department_id,
                    position_id: form.position_id || null,
                    location_id: form.location_id || null,
                    openings: Number(form.openings) || 1,
                    status: "draft",
                    reason: form.reason || null
                  },
                  findCompanyHrEmail(tenantId, profile.email)
                );
                persistExtraFields(tenantId, "hrm.requisition", row.id, extraJson);
                setTick((n) => n + 1);
              }
            });
          }}
        >
          <Field label="Title"><TextInput required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Department">
            <SelectInput required value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
              <option value="">Select</option>
              {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Vacant position">
            <SelectInput value={form.position_id} onChange={(e) => setForm({ ...form, position_id: e.target.value })}>
              <option value="">—</option>
              {positions.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.title}</option>)}
            </SelectInput>
          </Field>
          <Field label="Location">
            <SelectInput value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })}>
              <option value="">—</option>
              {locs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Openings"><TextInput type="number" min={1} value={form.openings} onChange={(e) => setForm({ ...form, openings: e.target.value })} /></Field>
          <Field label="Reason"><TextInput value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
          <ExtraFieldsBlock formKey="hrm.requisition" valueJson={extraJson} onChange={setExtraJson} />
          <div className="md:col-span-3"><Button type="submit">Submit requisition</Button></div>
        </form>
      </Panel>
      <Panel className="overflow-hidden p-0">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Title", "Department", "Position", "Location", "Openings", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line">
                <td className="px-4 py-3 font-medium">{r.title}</td>
                <td className="px-4 py-3">{getDepartmentName(r.department_id)}</td>
                <td className="px-4 py-3">{getPositionTitle(r.position_id)}</td>
                <td className="px-4 py-3">{getWorkLocationName(r.location_id)}</td>
                <td className="px-4 py-3">{r.openings}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      {dialog}
    </AppShell>
  );
}

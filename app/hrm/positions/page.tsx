"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { getEmployeeName, listDepartments, listEmployees } from "@/modules/hrm/services/hrm.store";
import { RecordRowActions } from "@/components/common/record-row-actions";
import {
  createPosition,
  getJobProfileTitle,
  getWorkLocationName,
  listCostCenters,
  listJobProfiles,
  listPositions,
  listWorkLocations,
  trashPosition,
  updatePosition
} from "@/modules/hrm/services/workday.store";

export default function PositionsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [tick, setTick] = useState(0);
  const [extraJson, setExtraJson] = useState("");
  const [form, setForm] = useState({ code: "", title: "", job_profile_id: "", department_id: "", location_id: "", cost_center_id: "", worker_id: "" });

  const rows = useMemo(() => listPositions(tenantId), [tenantId, tick]);
  const profiles = useMemo(() => listJobProfiles(tenantId), [tenantId, tick]);
  const depts = useMemo(() => listDepartments(tenantId), [tenantId]);
  const locs = useMemo(() => listWorkLocations(tenantId), [tenantId, tick]);
  const ccs = useMemo(() => listCostCenters(tenantId), [tenantId, tick]);
  const people = useMemo(() => listEmployees(tenantId), [tenantId]);

  return (
    <AppShell activeModule="hrm">
      <PageHeader title="Positions" description="Seats in the org. A worker fills a position; vacant seats drive requisitions." />
      <ModuleBreadcrumbs />
      <Panel className="mb-5">
        <h2 className="mb-4 text-lg font-bold text-ink">Create position</h2>
        <form
          className="grid gap-3 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            askSave({
              editing: false,
              entityLabel: "position",
              onConfirm: () => {
                const row = createPosition(tenantId, {
                  code: form.code.trim(),
                  title: form.title.trim(),
                  job_profile_id: form.job_profile_id,
                  department_id: form.department_id,
                  location_id: form.location_id || null,
                  cost_center_id: form.cost_center_id || null,
                  worker_id: form.worker_id || null,
                  status: form.worker_id ? "filled" : "open",
                  fte: 1,
                  headcount: 1
                });
                persistExtraFields(tenantId, "hrm.position", row.id, extraJson);
                setTick((n) => n + 1);
              }
            });
          }}
        >
          <Field label="Code"><TextInput required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
          <Field label="Title"><TextInput required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Job profile">
            <SelectInput required value={form.job_profile_id} onChange={(e) => setForm({ ...form, job_profile_id: e.target.value })}>
              <option value="">Select</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </SelectInput>
          </Field>
          <Field label="Department">
            <SelectInput required value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
              <option value="">Select</option>
              {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Location">
            <SelectInput value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })}>
              <option value="">—</option>
              {locs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Worker">
            <SelectInput value={form.worker_id} onChange={(e) => setForm({ ...form, worker_id: e.target.value })}>
              <option value="">Vacant</option>
              {people.filter((e) => e.status === "active").map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </SelectInput>
          </Field>
          <ExtraFieldsBlock formKey="hrm.position" valueJson={extraJson} onChange={setExtraJson} />
          <div className="md:col-span-3"><Button type="submit">Add position</Button></div>
        </form>
      </Panel>
      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                {["Code", "Title", "Job", "Location", "Worker", "Status", ""].map((h) => (
                  <th key={h || "actions"} className="px-4 py-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-line">
                  <td className="px-4 py-3 font-medium">{p.code}</td>
                  <td className="px-4 py-3">{p.title}</td>
                  <td className="px-4 py-3">{getJobProfileTitle(p.job_profile_id)}</td>
                  <td className="px-4 py-3">{getWorkLocationName(p.location_id)}</td>
                  <td className="px-4 py-3">
                    {p.worker_id ? <Link href={`/hrm/employees/${p.worker_id}`} className="text-teal hover:underline">{getEmployeeName(p.worker_id)}</Link> : "Vacant"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {p.status === "open" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="!min-h-8 !px-2 !text-xs"
                          onClick={() =>
                            askSave({
                              editing: true,
                              entityLabel: "position freeze",
                              onConfirm: () => {
                                updatePosition(p.id, { status: "frozen" });
                                setTick((n) => n + 1);
                              }
                            })
                          }
                        >
                          Freeze
                        </Button>
                      ) : null}
                      {p.status === "frozen" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="!min-h-8 !px-2 !text-xs"
                          onClick={() =>
                            askSave({
                              editing: true,
                              entityLabel: "position",
                              onConfirm: () => {
                                updatePosition(p.id, { status: "open" });
                                setTick((n) => n + 1);
                              }
                            })
                          }
                        >
                          Reopen
                        </Button>
                      ) : null}
                      <RecordRowActions
                        onTrash={() =>
                          askTrash({
                            entityLabel: "position",
                            name: p.title,
                            onConfirm: () => {
                              trashPosition(p.id);
                              setTick((n) => n + 1);
                            }
                          })
                        }
                      />
                    </div>
                  </td>
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

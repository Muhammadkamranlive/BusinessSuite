"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createTelemedicineSession,
  listTelemedicineSessions,
  pullHmsClinicalFromSupabase,
  subscribeHmsClinical,
  updateTelemedicineSession,
  type HmsTelemedicineSession
} from "@/modules/healthcare/services/hms-clinical.store";
import { listPatients, pullHmsFromSupabase, subscribeHms } from "@/modules/healthcare/services/hms.store";

export default function HmsTelemedicinePage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [rows, setRows] = useState<HmsTelemedicineSession[]>([]);
  const [patients, setPatients] = useState(listPatients(tenantId));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState({ patient_id: "", doctor_name: "", scheduled_at: "", notes: "" });
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listTelemedicineSessions(tenantId));
    setPatients(listPatients(tenantId));
  }
  useEffect(() => {
    void pullHmsClinicalFromSupabase(tenantId).finally(() => refresh());
    void pullHmsFromSupabase(tenantId).finally(() => refresh());
    const u1 = subscribeHmsClinical(() => refresh());
    const u2 = subscribeHms(() => refresh());
    return () => {
      u1();
      u2();
    };
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["session_no", "patient_name", "doctor_name", "status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField: "scheduled_at",
        sortDir: "desc"
      }) as unknown as HmsTelemedicineSession[],
    [rows, search, statusFilter]
  );

  function doSave() {
    const patient = patients.find((p) => p.id === form.patient_id);
    if (!patient || !form.doctor_name.trim()) return;
    const row = createTelemedicineSession(tenantId, {
      patient_id: patient.id,
      patient_name: patient.full_name,
      doctor_name: form.doctor_name.trim(),
      scheduled_at: form.scheduled_at || new Date().toISOString(),
      encounter_id: null,
      notes: form.notes || null
    });
    persistExtraFields(tenantId, "healthcare.hms.telemedicine", row.id, extraJson);
    setOpenForm(false);
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Telemedicine"
        description="Scheduled video visits with BAA-compliant provider stub."
        actionLabel="Schedule session"
        onAction={() => {
          setForm({ patient_id: patients[0]?.id ?? "", doctor_name: "", scheduled_at: "", notes: "" });
          setExtraJson("");
          setOpenForm(true);
        }}
      />
      {openForm ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: false, entityLabel: "telemedicine session", onConfirm: doSave });
            }}
          >
            <Field label="Patient">
              <SelectInput value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                <option value="">Select…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.mrn} · {p.full_name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Doctor">
              <TextInput required value={form.doctor_name} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} />
            </Field>
            <Field label="Scheduled at">
              <TextInput type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
            </Field>
            <Field label="Notes">
              <TextInput value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.hms.telemedicine" valueJson={extraJson} onChange={setExtraJson} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Schedule</Button>
              <Button type="button" variant="ghost" onClick={() => setOpenForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
      <Panel>
        <DataListToolbar
          search={search}
          onSearchChange={setSearch}
          filterValue={statusFilter}
          filterOptions={[
            { value: "scheduled", label: "Scheduled" },
            { value: "in_session", label: "In session" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" }
          ]}
          onFilterChange={setStatusFilter}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: "hms-telemedicine",
              rows: filtered.map((r) => ({
                Session: r.session_no,
                MRN: patients.find((p) => p.id === r.patient_id)?.mrn ?? "—",
                Doctor: r.doctor_name,
                Status: r.status
              }))
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Session</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Scheduled</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3 font-semibold">{row.session_no}</td>
                  <td>
                    {patients.find((p) => p.id === row.patient_id)?.mrn ?? "—"}
                    <div className="text-xs text-slate-500">{row.patient_name}</div>
                  </td>
                  <td>{row.doctor_name}</td>
                  <td>{row.scheduled_at.slice(0, 16)}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>
                    {row.status === "scheduled" ? (
                      <Button type="button" variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => {
                        updateTelemedicineSession(row.id, { status: "in_session" }, "doctor");
                        refresh();
                      }}>
                        Start
                      </Button>
                    ) : null}
                    {row.status === "in_session" ? (
                      <Button type="button" variant="primary" className="!px-2 !py-1 text-xs" onClick={() => {
                        updateTelemedicineSession(row.id, { status: "completed" }, "doctor");
                        refresh();
                      }}>
                        Complete
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}

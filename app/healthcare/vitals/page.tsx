"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  listAdmissions,
  listVitals,
  pullHmsClinicalFromSupabase,
  recordVital,
  subscribeHmsClinical,
  type HmsVital
} from "@/modules/healthcare/services/hms-clinical.store";
import { listPatients, pullHmsFromSupabase, subscribeHms } from "@/modules/healthcare/services/hms.store";

const empty = {
  patient_id: "",
  admission_id: "",
  bp_systolic: "",
  bp_diastolic: "",
  pulse: "",
  temperature_c: "",
  spo2: "",
  weight_kg: ""
};

export default function HmsVitalsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [rows, setRows] = useState<HmsVital[]>([]);
  const [patients, setPatients] = useState(listPatients(tenantId));
  const [admissions, setAdmissions] = useState(listAdmissions(tenantId));
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listVitals(tenantId));
    setPatients(listPatients(tenantId));
    setAdmissions(listAdmissions(tenantId));
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
        searchFields: ["recorded_at"],
        sortField: "recorded_at",
        sortDir: "desc"
      }) as unknown as HmsVital[],
    [rows, search]
  );

  function doSave() {
    const row = recordVital(tenantId, {
      patient_id: form.patient_id || null,
      encounter_id: null,
      admission_id: form.admission_id || null,
      bp_systolic: form.bp_systolic ? Number(form.bp_systolic) : null,
      bp_diastolic: form.bp_diastolic ? Number(form.bp_diastolic) : null,
      pulse: form.pulse ? Number(form.pulse) : null,
      temperature_c: form.temperature_c ? Number(form.temperature_c) : null,
      spo2: form.spo2 ? Number(form.spo2) : null,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      height_cm: null,
      actor: "nurse"
    });
    persistExtraFields(tenantId, "healthcare.hms.vital", row.id, extraJson);
    setOpenForm(false);
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Vitals"
        description="BP, pulse, temperature, SpO₂, and weight charting."
        actionLabel="Record vitals"
        onAction={() => {
          setForm({ ...empty, patient_id: patients[0]?.id ?? "" });
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
              askSave({ editing: false, entityLabel: "vitals", onConfirm: doSave });
            }}
          >
            <Field label="Patient">
              <SelectInput value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                <option value="">—</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.mrn} · {p.full_name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Admission (optional)">
              <SelectInput value={form.admission_id} onChange={(e) => setForm({ ...form, admission_id: e.target.value })}>
                <option value="">—</option>
                {admissions.filter((a) => a.status === "admitted").map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.admission_no}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="BP systolic">
              <TextInput type="number" value={form.bp_systolic} onChange={(e) => setForm({ ...form, bp_systolic: e.target.value })} />
            </Field>
            <Field label="BP diastolic">
              <TextInput type="number" value={form.bp_diastolic} onChange={(e) => setForm({ ...form, bp_diastolic: e.target.value })} />
            </Field>
            <Field label="Pulse (HR)">
              <TextInput type="number" value={form.pulse} onChange={(e) => setForm({ ...form, pulse: e.target.value })} />
            </Field>
            <Field label="Temp °C">
              <TextInput type="number" step="0.1" value={form.temperature_c} onChange={(e) => setForm({ ...form, temperature_c: e.target.value })} />
            </Field>
            <Field label="SpO₂ %">
              <TextInput type="number" value={form.spo2} onChange={(e) => setForm({ ...form, spo2: e.target.value })} />
            </Field>
            <Field label="Weight kg">
              <TextInput type="number" step="0.1" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.hms.vital" valueJson={extraJson} onChange={setExtraJson} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Save</Button>
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
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: "hms-vitals",
              rows: filtered.map((r) => {
                const p = r.patient_id ? patients.find((x) => x.id === r.patient_id) : null;
                return {
                  MRN: p?.mrn ?? "—",
                  BP: `${r.bp_systolic ?? "—"}/${r.bp_diastolic ?? "—"}`,
                  Pulse: r.pulse ?? "—",
                  Temp: r.temperature_c ?? "—",
                  SpO2: r.spo2 ?? "—",
                  Date: r.recorded_at.slice(0, 16)
                };
              })
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">When</th>
                <th>MRN</th>
                <th>BP</th>
                <th>Pulse</th>
                <th>Temp</th>
                <th>SpO₂</th>
                <th>Weight</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3">{row.recorded_at.slice(0, 16)}</td>
                  <td>{row.patient_id ? patients.find((p) => p.id === row.patient_id)?.mrn ?? "—" : "—"}</td>
                  <td>{row.bp_systolic ?? "—"}/{row.bp_diastolic ?? "—"}</td>
                  <td>{row.pulse ?? "—"}</td>
                  <td>{row.temperature_c ?? "—"}</td>
                  <td>{row.spo2 ?? "—"}</td>
                  <td>{row.weight_kg ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}

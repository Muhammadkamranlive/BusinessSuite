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
import { getSessionProfile } from "@/lib/auth/session-profile";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  admitPatient,
  canViewMortalityRecords,
  dischargeAdmission,
  exportDischargeSummaryPdf,
  listAdmissions,
  listBeds,
  listWards,
  pullHmsClinicalFromSupabase,
  subscribeHmsClinical,
  transferAdmission,
  type HmsAdmission
} from "@/modules/healthcare/services/hms-clinical.store";
import { listPatients, pullHmsFromSupabase, subscribeHms } from "@/modules/healthcare/services/hms.store";

export default function HmsAdmissionsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const profile = getSessionProfile();
  const canMortality = canViewMortalityRecords(profile.role) || canViewMortalityRecords(profile.email);
  const { askSave, dialog } = useConfirm();
  const [rows, setRows] = useState<HmsAdmission[]>([]);
  const [patients, setPatients] = useState(listPatients(tenantId));
  const [wards, setWards] = useState(listWards(tenantId));
  const [beds, setBeds] = useState(listBeds(tenantId));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openForm, setOpenForm] = useState(false);
  const [dischargeId, setDischargeId] = useState<string | null>(null);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [form, setForm] = useState({
    patient_id: "",
    ward_id: "",
    bed_id: "",
    admission_type: "elective" as const,
    attending_doctor: ""
  });
  const [dischargeForm, setDischargeForm] = useState({ discharge_summary: "", mortality: false });
  const [transferForm, setTransferForm] = useState({ to_ward_id: "", to_bed_id: "", reason: "" });
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listAdmissions(tenantId, { actorRole: profile.role }));
    setPatients(listPatients(tenantId));
    setWards(listWards(tenantId));
    setBeds(listBeds(tenantId));
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

  const patientMap = useMemo(() => Object.fromEntries(patients.map((p) => [p.id, p])), [patients]);
  const wardMap = useMemo(() => Object.fromEntries(wards.map((w) => [w.id, w.name])), [wards]);
  const bedMap = useMemo(() => Object.fromEntries(beds.map((b) => [b.id, b.bed_no])), [beds]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["admission_no", "patient_name", "status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField: "admitted_at",
        sortDir: "desc"
      }) as unknown as HmsAdmission[],
    [rows, search, statusFilter]
  );

  const availableBeds = beds.filter((b) => b.status === "available" || b.id === form.bed_id);

  function doAdmit() {
    const patient = patientMap[form.patient_id];
    if (!patient) return;
    const row = admitPatient(tenantId, {
      patient_id: patient.id,
      patient_name: patient.full_name,
      encounter_id: null,
      ward_id: form.ward_id || null,
      bed_id: form.bed_id || null,
      admitted_at: new Date().toISOString(),
      admission_type: form.admission_type,
      attending_doctor: form.attending_doctor || null,
      actor: "staff"
    });
    persistExtraFields(tenantId, "healthcare.hms.admission", row.id, extraJson);
    setOpenForm(false);
    refresh();
  }

  function doDischarge() {
    if (!dischargeId || !dischargeForm.discharge_summary.trim()) return;
    dischargeAdmission(tenantId, dischargeId, {
      discharge_summary: dischargeForm.discharge_summary.trim(),
      mortality: dischargeForm.mortality,
      actor: "staff"
    });
    setDischargeId(null);
    setDischargeForm({ discharge_summary: "", mortality: false });
    refresh();
  }

  function doTransfer() {
    if (!transferId || !transferForm.reason.trim()) return;
    transferAdmission(tenantId, transferId, {
      to_ward_id: transferForm.to_ward_id || null,
      to_bed_id: transferForm.to_bed_id || null,
      reason: transferForm.reason.trim(),
      actor: "staff"
    });
    setTransferId(null);
    setTransferForm({ to_ward_id: "", to_bed_id: "", reason: "" });
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="IPD admissions"
        description="Admit, transfer, and discharge inpatients — MRN-linked, no PHI in URLs."
        actionLabel="Admit patient"
        onAction={() => {
          setForm({ patient_id: patients[0]?.id ?? "", ward_id: "", bed_id: "", admission_type: "elective", attending_doctor: "" });
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
              askSave({ editing: false, entityLabel: "admission", onConfirm: doAdmit });
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
            <Field label="Admission type">
              <SelectInput value={form.admission_type} onChange={(e) => setForm({ ...form, admission_type: e.target.value as typeof form.admission_type })}>
                <option value="elective">Elective</option>
                <option value="emergency">Emergency</option>
                <option value="transfer_in">Transfer in</option>
                <option value="opd_referral">OPD referral</option>
              </SelectInput>
            </Field>
            <Field label="Ward">
              <SelectInput value={form.ward_id} onChange={(e) => setForm({ ...form, ward_id: e.target.value, bed_id: "" })}>
                <option value="">—</option>
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} · {w.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Bed">
              <SelectInput value={form.bed_id} onChange={(e) => setForm({ ...form, bed_id: e.target.value })}>
                <option value="">—</option>
                {availableBeds.filter((b) => !form.ward_id || b.ward_id === form.ward_id).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bed_no} ({b.status})
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Attending doctor">
              <TextInput value={form.attending_doctor} onChange={(e) => setForm({ ...form, attending_doctor: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.hms.admission" valueJson={extraJson} onChange={setExtraJson} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Admit</Button>
              <Button type="button" variant="ghost" onClick={() => setOpenForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
      {dischargeId ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: true, entityLabel: "discharge", onConfirm: doDischarge });
            }}
          >
            <Field label="Discharge summary" className="md:col-span-2">
              <TextInput required value={dischargeForm.discharge_summary} onChange={(e) => setDischargeForm({ ...dischargeForm, discharge_summary: e.target.value })} />
            </Field>
            {canMortality ? (
              <label className="md:col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={dischargeForm.mortality} onChange={(e) => setDischargeForm({ ...dischargeForm, mortality: e.target.checked })} />
                Mortality / deceased
              </label>
            ) : null}
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Discharge</Button>
              <Button type="button" variant="ghost" onClick={() => setDischargeId(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
      {transferId ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: true, entityLabel: "transfer", onConfirm: doTransfer });
            }}
          >
            <Field label="To ward">
              <SelectInput value={transferForm.to_ward_id} onChange={(e) => setTransferForm({ ...transferForm, to_ward_id: e.target.value, to_bed_id: "" })}>
                <option value="">—</option>
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="To bed">
              <SelectInput value={transferForm.to_bed_id} onChange={(e) => setTransferForm({ ...transferForm, to_bed_id: e.target.value })}>
                <option value="">—</option>
                {beds.filter((b) => !transferForm.to_ward_id || b.ward_id === transferForm.to_ward_id).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bed_no}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Reason" className="md:col-span-2">
              <TextInput required value={transferForm.reason} onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })} />
            </Field>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Transfer</Button>
              <Button type="button" variant="ghost" onClick={() => setTransferId(null)}>
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
            { value: "admitted", label: "Admitted" },
            { value: "transferred", label: "Transferred" },
            { value: "discharged", label: "Discharged" },
            { value: "deceased", label: "Deceased" }
          ]}
          onFilterChange={setStatusFilter}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: "hms-admissions",
              rows: filtered.map((r) => {
                const p = r.patient_id ? patientMap[r.patient_id] : null;
                return {
                  Admission: r.admission_no,
                  MRN: p?.mrn ?? "—",
                  Status: r.status,
                  Ward: r.ward_id ? wardMap[r.ward_id] ?? "—" : "—",
                  Bed: r.bed_id ? bedMap[r.bed_id] ?? "—" : "—"
                };
              })
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Admission</th>
                <th>Patient</th>
                <th>Location</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const p = row.patient_id ? patientMap[row.patient_id] : null;
                return (
                  <tr key={row.id} className="border-t border-line">
                    <td className="px-3 py-3">
                      <div className="font-semibold">{row.admission_no}</div>
                      <div className="text-xs text-slate-500">{row.admitted_at.slice(0, 10)}</div>
                    </td>
                    <td>
                      {p?.mrn ?? "—"}
                      <div className="text-xs text-slate-500">{row.patient_name}</div>
                    </td>
                    <td>
                      {row.ward_id ? wardMap[row.ward_id] ?? "—" : "—"} / {row.bed_id ? bedMap[row.bed_id] ?? "—" : "—"}
                    </td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {["admitted", "transferred"].includes(row.status) ? (
                          <>
                            <Button type="button" variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => setTransferId(row.id)}>
                              Transfer
                            </Button>
                            <Button type="button" variant="primary" className="!px-2 !py-1 text-xs" onClick={() => setDischargeId(row.id)}>
                              Discharge
                            </Button>
                          </>
                        ) : null}
                        {["discharged", "deceased"].includes(row.status) ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="!px-2 !py-1 text-xs"
                            onClick={() =>
                              exportDischargeSummaryPdf(tenantId, row.id, { canViewMortality: canMortality })
                            }
                          >
                            PDF discharge
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}

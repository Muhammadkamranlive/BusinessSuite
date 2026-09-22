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
  correctPrescription,
  createPrescriptionDraft,
  exportPrescriptionPdf,
  issuePrescription,
  listPrescriptions,
  pullHmsClinicalFromSupabase,
  subscribeHmsClinical,
  type HmsPrescription,
  type HmsPrescriptionItem
} from "@/modules/healthcare/services/hms-clinical.store";
import { checkDrugAllergy, listPatients, pullHmsFromSupabase, subscribeHms } from "@/modules/healthcare/services/hms.store";

const emptyItem = { drug_name: "", dose: "", frequency: "", route: "", duration_days: "" };

export default function HmsPrescriptionsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [rows, setRows] = useState<HmsPrescription[]>([]);
  const [patients, setPatients] = useState(listPatients(tenantId));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openForm, setOpenForm] = useState(false);
  const [correctId, setCorrectId] = useState<string | null>(null);
  const [form, setForm] = useState({ patient_id: "", prescriber_name: "", route_to: "hospital_pharmacy" as const, items: [{ ...emptyItem }] });
  const [correctItems, setCorrectItems] = useState([{ ...emptyItem }]);
  const [extraJson, setExtraJson] = useState("");
  const [error, setError] = useState("");

  function refresh() {
    setRows(listPrescriptions(tenantId));
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
        searchFields: ["rx_no", "patient_name", "prescriber_name", "status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField: "created_at",
        sortDir: "desc"
      }) as unknown as HmsPrescription[],
    [rows, search, statusFilter]
  );

  function allergyWarnings(patientId: string, items: { drug_name: string }[]) {
    return items.flatMap((item) =>
      checkDrugAllergy(tenantId, patientId, item.drug_name).map((a) => `${item.drug_name} ↔ ${a.allergen}`)
    );
  }

  function toItems(raw: typeof form.items): HmsPrescriptionItem[] {
    return raw
      .filter((i) => i.drug_name.trim())
      .map((i) => ({
        drug_name: i.drug_name.trim(),
        dose: i.dose || null,
        frequency: i.frequency || null,
        route: i.route || null,
        duration_days: i.duration_days ? Number(i.duration_days) : null
      }));
  }

  function doSaveDraft() {
    setError("");
    const patient = patients.find((p) => p.id === form.patient_id);
    if (!patient) return;
    const items = toItems(form.items);
    if (!items.length) {
      setError("Add at least one medicine.");
      return;
    }
    const warnings = allergyWarnings(patient.id, items);
    if (warnings.length) setError(`Allergy warnings (issue will block): ${warnings.join("; ")}`);
    const row = createPrescriptionDraft(tenantId, {
      patient_id: patient.id,
      patient_name: patient.full_name,
      encounter_id: null,
      prescriber_name: form.prescriber_name || "Dr.",
      route_to: form.route_to,
      items,
      actor: "doctor"
    });
    persistExtraFields(tenantId, "healthcare.hms.prescription", row.id, extraJson);
    setOpenForm(false);
    refresh();
  }

  function doIssue(rxId: string) {
    setError("");
    try {
      issuePrescription(tenantId, rxId, "doctor");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Issue failed");
    }
  }

  function doCorrect() {
    if (!correctId) return;
    setError("");
    try {
      correctPrescription(tenantId, correctId, toItems(correctItems), "doctor");
      setCorrectId(null);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Correction failed");
    }
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Prescriptions"
        description="Draft → issue with allergy check; corrections create superseding Rx."
        actionLabel="New Rx draft"
        onAction={() => {
          setForm({ patient_id: patients[0]?.id ?? "", prescriber_name: "", route_to: "hospital_pharmacy", items: [{ ...emptyItem }] });
          setExtraJson("");
          setError("");
          setOpenForm(true);
        }}
      />
      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
      {openForm ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: false, entityLabel: "prescription", onConfirm: doSaveDraft });
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
            <Field label="Prescriber">
              <TextInput value={form.prescriber_name} onChange={(e) => setForm({ ...form, prescriber_name: e.target.value })} />
            </Field>
            {form.patient_id && allergyWarnings(form.patient_id, form.items).length ? (
              <p className="md:col-span-2 text-sm text-amber-700">
                Allergy warnings: {allergyWarnings(form.patient_id, form.items).join("; ")}
              </p>
            ) : null}
            {form.items.map((item, idx) => (
              <div key={idx} className="md:col-span-2 grid gap-2 rounded border border-line p-3 md:grid-cols-5">
                <TextInput placeholder="Drug" value={item.drug_name} onChange={(e) => {
                  const items = [...form.items];
                  items[idx] = { ...items[idx], drug_name: e.target.value };
                  setForm({ ...form, items });
                }} />
                <TextInput placeholder="Dose" value={item.dose} onChange={(e) => {
                  const items = [...form.items];
                  items[idx] = { ...items[idx], dose: e.target.value };
                  setForm({ ...form, items });
                }} />
                <TextInput placeholder="Frequency" value={item.frequency} onChange={(e) => {
                  const items = [...form.items];
                  items[idx] = { ...items[idx], frequency: e.target.value };
                  setForm({ ...form, items });
                }} />
                <TextInput placeholder="Route" value={item.route} onChange={(e) => {
                  const items = [...form.items];
                  items[idx] = { ...items[idx], route: e.target.value };
                  setForm({ ...form, items });
                }} />
                <TextInput placeholder="Days" type="number" value={item.duration_days} onChange={(e) => {
                  const items = [...form.items];
                  items[idx] = { ...items[idx], duration_days: e.target.value };
                  setForm({ ...form, items });
                }} />
              </div>
            ))}
            <Button type="button" variant="ghost" className="md:col-span-2 !w-fit" onClick={() => setForm({ ...form, items: [...form.items, { ...emptyItem }] })}>
              + Add line
            </Button>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.hms.prescription" valueJson={extraJson} onChange={setExtraJson} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Save draft</Button>
              <Button type="button" variant="ghost" onClick={() => setOpenForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
      {correctId ? (
        <Panel className="mb-4">
          <p className="mb-2 text-sm font-semibold">Correct issued Rx</p>
          {correctItems.map((item, idx) => (
            <div key={idx} className="mb-2 grid gap-2 md:grid-cols-5">
              <TextInput placeholder="Drug" value={item.drug_name} onChange={(e) => {
                const items = [...correctItems];
                items[idx] = { ...items[idx], drug_name: e.target.value };
                setCorrectItems(items);
              }} />
              <TextInput placeholder="Dose" value={item.dose} onChange={(e) => {
                const items = [...correctItems];
                items[idx] = { ...items[idx], dose: e.target.value };
                setCorrectItems(items);
              }} />
              <TextInput placeholder="Frequency" value={item.frequency} onChange={(e) => {
                const items = [...correctItems];
                items[idx] = { ...items[idx], frequency: e.target.value };
                setCorrectItems(items);
              }} />
              <TextInput placeholder="Route" value={item.route} onChange={(e) => {
                const items = [...correctItems];
                items[idx] = { ...items[idx], route: e.target.value };
                setCorrectItems(items);
              }} />
              <TextInput placeholder="Days" type="number" value={item.duration_days} onChange={(e) => {
                const items = [...correctItems];
                items[idx] = { ...items[idx], duration_days: e.target.value };
                setCorrectItems(items);
              }} />
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="button" onClick={() => askSave({ editing: true, entityLabel: "Rx correction", onConfirm: doCorrect })}>
              Issue correction
            </Button>
            <Button type="button" variant="ghost" onClick={() => setCorrectId(null)}>
              Cancel
            </Button>
          </div>
        </Panel>
      ) : null}
      <Panel>
        <DataListToolbar
          search={search}
          onSearchChange={setSearch}
          filterValue={statusFilter}
          filterOptions={[
            { value: "draft", label: "Draft" },
            { value: "issued", label: "Issued" },
            { value: "dispensed", label: "Dispensed" },
            { value: "superseded", label: "Superseded" }
          ]}
          onFilterChange={setStatusFilter}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: "hms-prescriptions",
              rows: filtered.map((r) => ({
                Rx: r.rx_no,
                MRN: patients.find((p) => p.id === r.patient_id)?.mrn ?? "—",
                Status: r.status,
                Items: r.items.length
              }))
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Rx</th>
                <th>Patient</th>
                <th>Medicines</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3 font-semibold">{row.rx_no}</td>
                  <td>
                    {patients.find((p) => p.id === row.patient_id)?.mrn ?? "—"}
                    <div className="text-xs text-slate-500">{row.patient_name}</div>
                  </td>
                  <td className="text-xs">{row.items.map((i) => i.drug_name).join(", ")}</td>
                  <td>
                    <StatusBadge status={row.status} />
                    {row.allergy_checked ? <span className="ml-1 text-xs text-teal-600">✓ allergies</span> : null}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {row.status === "draft" ? (
                        <Button type="button" variant="primary" className="!px-2 !py-1 text-xs" onClick={() => askSave({ editing: false, entityLabel: "Rx issue", onConfirm: () => doIssue(row.id) })}>
                          Issue
                        </Button>
                      ) : null}
                      {["issued", "dispensed"].includes(row.status) ? (
                        <>
                          <Button type="button" variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => exportPrescriptionPdf(tenantId, row.id)}>
                            Print / PDF
                          </Button>
                          <Button type="button" variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => {
                            setCorrectId(row.id);
                            setCorrectItems(row.items.map((i) => ({
                              drug_name: i.drug_name,
                              dose: i.dose ?? "",
                              frequency: i.frequency ?? "",
                              route: i.route ?? "",
                              duration_days: i.duration_days != null ? String(i.duration_days) : ""
                            })));
                          }}>
                            Correct
                          </Button>
                        </>
                      ) : null}
                    </div>
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

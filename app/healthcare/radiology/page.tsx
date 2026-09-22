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
  createImagingOrder,
  listImagingOrders,
  pullHmsClinicalFromSupabase,
  signOffImaging,
  updateImagingOrder,
  subscribeHmsClinical,
  type HmsImagingOrder
} from "@/modules/healthcare/services/hms-clinical.store";
import { listPatients, pullHmsFromSupabase, subscribeHms } from "@/modules/healthcare/services/hms.store";

export default function HmsRadiologyPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [rows, setRows] = useState<HmsImagingOrder[]>([]);
  const [patients, setPatients] = useState(listPatients(tenantId));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openForm, setOpenForm] = useState(false);
  const [signOffId, setSignOffId] = useState<string | null>(null);
  const [pacsEditId, setPacsEditId] = useState<string | null>(null);
  const [pacsUrl, setPacsUrl] = useState("");
  const [form, setForm] = useState({ patient_id: "", modality: "xray" as const, body_part: "", clinical_indication: "", dicom_ref: "" });
  const [signForm, setSignForm] = useState({ report_text: "", radiologist_name: "", dicom_ref: "" });
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listImagingOrders(tenantId));
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
        searchFields: ["order_no", "patient_name", "modality", "status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField: "created_at",
        sortDir: "desc"
      }) as unknown as HmsImagingOrder[],
    [rows, search, statusFilter]
  );

  function doCreate() {
    const patient = patients.find((p) => p.id === form.patient_id);
    if (!patient) return;
    const row = createImagingOrder(tenantId, {
      patient_id: patient.id,
      patient_name: patient.full_name,
      encounter_id: null,
      modality: form.modality,
      body_part: form.body_part || null,
      clinical_indication: form.clinical_indication || null,
      dicom_ref: form.dicom_ref || null,
      actor: "doctor"
    });
    persistExtraFields(tenantId, "healthcare.hms.imaging", row.id, extraJson);
    setOpenForm(false);
    refresh();
  }

  function doSignOff() {
    if (!signOffId || !signForm.report_text.trim()) return;
    signOffImaging(tenantId, signOffId, {
      report_text: signForm.report_text.trim(),
      radiologist_name: signForm.radiologist_name || "Radiologist",
      dicom_ref: signForm.dicom_ref || undefined,
      actor: "radiologist"
    });
    setSignOffId(null);
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Radiology orders"
        description="Imaging orders with modality, DICOM ref, and radiologist sign-off."
        actionLabel="New imaging order"
        onAction={() => {
          setForm({ patient_id: patients[0]?.id ?? "", modality: "xray", body_part: "", clinical_indication: "", dicom_ref: "" });
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
              askSave({ editing: false, entityLabel: "imaging order", onConfirm: doCreate });
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
            <Field label="Modality">
              <SelectInput value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value as typeof form.modality })}>
                <option value="xray">X-ray</option>
                <option value="ct">CT</option>
                <option value="mri">MRI</option>
                <option value="ultrasound">Ultrasound</option>
                <option value="other">Other</option>
              </SelectInput>
            </Field>
            <Field label="Body part">
              <TextInput value={form.body_part} onChange={(e) => setForm({ ...form, body_part: e.target.value })} />
            </Field>
            <Field label="DICOM ref">
              <TextInput value={form.dicom_ref} onChange={(e) => setForm({ ...form, dicom_ref: e.target.value })} />
            </Field>
            <Field label="Clinical indication" className="md:col-span-2">
              <TextInput value={form.clinical_indication} onChange={(e) => setForm({ ...form, clinical_indication: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.hms.imaging" valueJson={extraJson} onChange={setExtraJson} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Create order</Button>
              <Button type="button" variant="ghost" onClick={() => setOpenForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
      {signOffId ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: true, entityLabel: "imaging sign-off", onConfirm: doSignOff });
            }}
          >
            <Field label="Report" className="md:col-span-2">
              <TextInput required value={signForm.report_text} onChange={(e) => setSignForm({ ...signForm, report_text: e.target.value })} />
            </Field>
            <Field label="Radiologist">
              <TextInput value={signForm.radiologist_name} onChange={(e) => setSignForm({ ...signForm, radiologist_name: e.target.value })} />
            </Field>
            <Field label="DICOM ref">
              <TextInput value={signForm.dicom_ref} onChange={(e) => setSignForm({ ...signForm, dicom_ref: e.target.value })} />
            </Field>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Sign off</Button>
              <Button type="button" variant="ghost" onClick={() => setSignOffId(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
      {pacsEditId ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              updateImagingOrder(pacsEditId, { pacs_viewer_url: pacsUrl.trim() || null }, "radiologist");
              setPacsEditId(null);
              refresh();
            }}
          >
            <Field label="PACS viewer URL">
              <TextInput value={pacsUrl} onChange={(e) => setPacsUrl(e.target.value)} placeholder="https://pacs.example.com/viewer/…" />
            </Field>
            <p className="text-xs text-slate-500">Embedded viewer uses sandbox allow-scripts allow-same-origin. External PACS must permit iframe embedding.</p>
            <div className="flex gap-2">
              <Button type="submit">Save URL</Button>
              <Button type="button" variant="ghost" onClick={() => setPacsEditId(null)}>
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
            { value: "ordered", label: "Ordered" },
            { value: "signed_off", label: "Signed off" }
          ]}
          onFilterChange={setStatusFilter}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: "hms-imaging",
              rows: filtered.map((r) => ({
                Order: r.order_no,
                MRN: patients.find((p) => p.id === r.patient_id)?.mrn ?? "—",
                Modality: r.modality,
                Status: r.status
              }))
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Order</th>
                <th>Patient</th>
                <th>Modality</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3">
                    <div className="font-semibold">{row.order_no}</div>
                    <div className="text-xs text-slate-500">{row.dicom_ref || "—"}</div>
                  </td>
                  <td>
                    {patients.find((p) => p.id === row.patient_id)?.mrn ?? "—"}
                    <div className="text-xs text-slate-500">{row.patient_name}</div>
                  </td>
                  <td>{row.modality} {row.body_part ? `· ${row.body_part}` : ""}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <Button type="button" variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => {
                        setPacsEditId(row.id);
                        setPacsUrl(row.pacs_viewer_url ?? "");
                      }}>
                        PACS URL
                      </Button>
                      {row.status !== "signed_off" ? (
                        <Button type="button" variant="primary" className="!px-2 !py-1 text-xs" onClick={() => {
                          setSignOffId(row.id);
                          setSignForm({ report_text: "", radiologist_name: "", dicom_ref: row.dicom_ref ?? "" });
                        }}>
                          Sign off
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.filter((r) => r.pacs_viewer_url).map((row) => (
          <div key={`pacs-${row.id}`} className="mt-4 border-t border-line pt-4">
            <p className="mb-2 text-sm font-semibold">{row.order_no} · PACS viewer</p>
            <iframe
              title={`PACS ${row.order_no}`}
              src={row.pacs_viewer_url!}
              className="h-64 w-full rounded border border-line md:h-96"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        ))}
      </Panel>
    </AppShell>
  );
}

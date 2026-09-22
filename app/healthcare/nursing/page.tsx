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
  administerMar,
  listAdmissions,
  listMar,
  pullHmsClinicalFromSupabase,
  scheduleMar,
  subscribeHmsClinical,
  type HmsMar
} from "@/modules/healthcare/services/hms-clinical.store";
import { listPatients, pullHmsFromSupabase, subscribeHms } from "@/modules/healthcare/services/hms.store";

export default function HmsNursingPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [rows, setRows] = useState<HmsMar[]>([]);
  const [patients, setPatients] = useState(listPatients(tenantId));
  const [admissions, setAdmissions] = useState(listAdmissions(tenantId));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState({
    patient_id: "",
    admission_id: "",
    drug_name: "",
    dose: "",
    route: "",
    scheduled_at: ""
  });
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listMar(tenantId));
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
        searchFields: ["drug_name", "dose", "status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField: "scheduled_at",
        sortDir: "asc"
      }) as unknown as HmsMar[],
    [rows, search, statusFilter]
  );

  function doSchedule() {
    if (!form.drug_name.trim()) return;
    const row = scheduleMar(tenantId, {
      patient_id: form.patient_id || null,
      admission_id: form.admission_id || null,
      drug_name: form.drug_name.trim(),
      dose: form.dose || null,
      route: form.route || null,
      scheduled_at: form.scheduled_at || new Date().toISOString()
    });
    persistExtraFields(tenantId, "healthcare.hms.mar", row.id, extraJson);
    setOpenForm(false);
    refresh();
  }

  function doAdminister(marId: string, status: HmsMar["status"]) {
    administerMar(tenantId, marId, { status, given_by: "nurse" });
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Nursing MAR"
        description="Medication administration record — schedule and administer doses."
        actionLabel="Schedule dose"
        onAction={() => {
          setForm({ patient_id: patients[0]?.id ?? "", admission_id: "", drug_name: "", dose: "", route: "", scheduled_at: "" });
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
              askSave({ editing: false, entityLabel: "MAR dose", onConfirm: doSchedule });
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
            <Field label="Admission">
              <SelectInput value={form.admission_id} onChange={(e) => setForm({ ...form, admission_id: e.target.value })}>
                <option value="">—</option>
                {admissions.filter((a) => ["admitted", "transferred"].includes(a.status)).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.admission_no}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Drug">
              <TextInput required value={form.drug_name} onChange={(e) => setForm({ ...form, drug_name: e.target.value })} />
            </Field>
            <Field label="Dose">
              <TextInput value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} />
            </Field>
            <Field label="Route">
              <TextInput value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} />
            </Field>
            <Field label="Scheduled at">
              <TextInput type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.hms.mar" valueJson={extraJson} onChange={setExtraJson} />
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
            { value: "given", label: "Given" },
            { value: "missed", label: "Missed" },
            { value: "held", label: "Held" },
            { value: "refused", label: "Refused" }
          ]}
          onFilterChange={setStatusFilter}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: "hms-mar",
              rows: filtered.map((r) => ({
                MRN: r.patient_id ? patients.find((p) => p.id === r.patient_id)?.mrn ?? "—" : "—",
                Drug: r.drug_name,
                Dose: r.dose ?? "",
                Status: r.status,
                Scheduled: r.scheduled_at.slice(0, 16)
              }))
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Scheduled</th>
                <th>MRN</th>
                <th>Drug</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3">{row.scheduled_at.slice(0, 16)}</td>
                  <td>{row.patient_id ? patients.find((p) => p.id === row.patient_id)?.mrn ?? "—" : "—"}</td>
                  <td>
                    {row.drug_name}
                    <div className="text-xs text-slate-500">{row.dose} {row.route}</div>
                  </td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>
                    {row.status === "scheduled" ? (
                      <div className="flex flex-wrap gap-1">
                        <Button type="button" variant="primary" className="!px-2 !py-1 text-xs" onClick={() => askSave({ editing: false, entityLabel: "administration", onConfirm: () => doAdminister(row.id, "given") })}>
                          Given
                        </Button>
                        <Button type="button" variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => doAdminister(row.id, "held")}>
                          Held
                        </Button>
                        <Button type="button" variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => doAdminister(row.id, "missed")}>
                          Missed
                        </Button>
                      </div>
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

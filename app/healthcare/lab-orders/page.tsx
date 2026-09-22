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
  addLabResult,
  collectLabSample,
  createLabOrder,
  exportLabReportPdf,
  listLabOrders,
  listLabResults,
  printLabBarcode,
  pullHmsClinicalFromSupabase,
  subscribeHmsClinical,
  type HmsLabOrder
} from "@/modules/healthcare/services/hms-clinical.store";
import { listPatients, pullHmsFromSupabase, subscribeHms } from "@/modules/healthcare/services/hms.store";

export default function HmsLabOrdersPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [rows, setRows] = useState<HmsLabOrder[]>([]);
  const [results, setResults] = useState(listLabResults(tenantId));
  const [patients, setPatients] = useState(listPatients(tenantId));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openForm, setOpenForm] = useState(false);
  const [resultOrderId, setResultOrderId] = useState<string | null>(null);
  const [form, setForm] = useState({ patient_id: "", test_name: "", ordering_physician: "", sample_barcode: "" });
  const [resultForm, setResultForm] = useState({ test_name: "", result_value: "", unit: "", flag: "normal" as const });
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listLabOrders(tenantId));
    setResults(listLabResults(tenantId));
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
        searchFields: ["order_no", "patient_name", "sample_barcode", "status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField: "created_at",
        sortDir: "desc"
      }) as unknown as HmsLabOrder[],
    [rows, search, statusFilter]
  );

  const pending = filtered.filter((o) => ["ordered", "collected", "processing"].includes(o.status));
  const resulted = filtered.filter((o) => ["resulted", "critical"].includes(o.status));

  function doCreate() {
    const patient = patients.find((p) => p.id === form.patient_id);
    if (!patient || !form.test_name.trim()) return;
    const row = createLabOrder(tenantId, {
      patient_id: patient.id,
      patient_name: patient.full_name,
      encounter_id: null,
      ordering_physician: form.ordering_physician || null,
      tests: [{ name: form.test_name.trim() }],
      sample_barcode: form.sample_barcode || undefined,
      actor: "doctor"
    });
    persistExtraFields(tenantId, "healthcare.hms.lab_order", row.id, extraJson);
    setOpenForm(false);
    refresh();
  }

  function doAddResult() {
    if (!resultOrderId || !resultForm.test_name.trim()) return;
    addLabResult(tenantId, {
      lab_order_id: resultOrderId,
      test_name: resultForm.test_name.trim(),
      result_value: resultForm.result_value || null,
      unit: resultForm.unit || null,
      flag: resultForm.flag,
      actor: "lab_tech"
    });
    setResultOrderId(null);
    setResultForm({ test_name: "", result_value: "", unit: "", flag: "normal" });
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Lab orders"
        description="Order tests, sample barcodes, and result entry with critical flags."
        actionLabel="New lab order"
        onAction={() => {
          setForm({ patient_id: patients[0]?.id ?? "", test_name: "", ordering_physician: "", sample_barcode: "" });
          setExtraJson("");
          setOpenForm(true);
        }}
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Panel>
          <h2 className="text-sm font-semibold">Pending ({pending.length})</h2>
          <p className="mt-1 text-xs text-slate-500">Ordered / collected / processing</p>
        </Panel>
        <Panel>
          <h2 className="text-sm font-semibold">Resulted ({resulted.length})</h2>
          <p className="mt-1 text-xs text-slate-500">Including critical alerts</p>
        </Panel>
      </div>
      {openForm ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: false, entityLabel: "lab order", onConfirm: doCreate });
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
            <Field label="Test name">
              <TextInput required value={form.test_name} onChange={(e) => setForm({ ...form, test_name: e.target.value })} />
            </Field>
            <Field label="Ordering physician">
              <TextInput value={form.ordering_physician} onChange={(e) => setForm({ ...form, ordering_physician: e.target.value })} />
            </Field>
            <Field label="Sample barcode">
              <TextInput value={form.sample_barcode} onChange={(e) => setForm({ ...form, sample_barcode: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.hms.lab_order" valueJson={extraJson} onChange={setExtraJson} />
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
      {resultOrderId ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: false, entityLabel: "lab result", onConfirm: doAddResult });
            }}
          >
            <Field label="Test name">
              <TextInput required value={resultForm.test_name} onChange={(e) => setResultForm({ ...resultForm, test_name: e.target.value })} />
            </Field>
            <Field label="Result value">
              <TextInput value={resultForm.result_value} onChange={(e) => setResultForm({ ...resultForm, result_value: e.target.value })} />
            </Field>
            <Field label="Unit">
              <TextInput value={resultForm.unit} onChange={(e) => setResultForm({ ...resultForm, unit: e.target.value })} />
            </Field>
            <Field label="Flag">
              <SelectInput value={resultForm.flag} onChange={(e) => setResultForm({ ...resultForm, flag: e.target.value as typeof resultForm.flag })}>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="low">Low</option>
                <option value="critical">Critical</option>
              </SelectInput>
            </Field>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Add result</Button>
              <Button type="button" variant="ghost" onClick={() => setResultOrderId(null)}>
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
            { value: "resulted", label: "Resulted" },
            { value: "critical", label: "Critical" }
          ]}
          onFilterChange={setStatusFilter}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: "hms-lab-orders",
              rows: filtered.map((r) => ({
                Order: r.order_no,
                MRN: patients.find((p) => p.id === r.patient_id)?.mrn ?? "—",
                Barcode: r.sample_barcode ?? "",
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
                <th>Tests</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3">
                    <div className="font-semibold">{row.order_no}</div>
                    <div className="text-xs text-slate-500">{row.sample_barcode}</div>
                  </td>
                  <td>
                    {patients.find((p) => p.id === row.patient_id)?.mrn ?? "—"}
                    <div className="text-xs text-slate-500">{row.patient_name}</div>
                  </td>
                  <td className="text-xs">{row.tests.map((t) => t.name).join(", ")}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {!row.barcode_printed_at ? (
                        <Button type="button" variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => { printLabBarcode(tenantId, row.id); refresh(); }}>
                          Print barcode
                        </Button>
                      ) : null}
                      {row.status === "ordered" ? (
                        <Button type="button" variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => { collectLabSample(tenantId, row.id); refresh(); }}>
                          Collect sample
                        </Button>
                      ) : null}
                      {!["resulted", "critical", "cancelled"].includes(row.status) ? (
                        <Button type="button" variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => {
                          setResultOrderId(row.id);
                          setResultForm({ test_name: row.tests[0]?.name ?? "", result_value: "", unit: "", flag: "normal" });
                        }}>
                          Add result
                        </Button>
                      ) : (
                        <>
                          <span className="text-xs text-slate-500 self-center">
                            {results.filter((r) => r.lab_order_id === row.id).length} result(s)
                          </span>
                          <Button type="button" variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => exportLabReportPdf(tenantId, row.id)}>
                            PDF report
                          </Button>
                        </>
                      )}
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

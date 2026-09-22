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
  dispenseFromRx,
  listDispenses,
  listPharmacyStock,
  listPrescriptions,
  pullHmsClinicalFromSupabase,
  subscribeHmsClinical,
  type HmsDispense
} from "@/modules/healthcare/services/hms-clinical.store";
import { listPatients, pullHmsFromSupabase, subscribeHms } from "@/modules/healthcare/services/hms.store";

export default function HmsDispensingPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [rows, setRows] = useState<HmsDispense[]>([]);
  const [rxList, setRxList] = useState(listPrescriptions(tenantId).filter((p) => p.status === "issued"));
  const [stock, setStock] = useState(listPharmacyStock(tenantId));
  const [patients, setPatients] = useState(listPatients(tenantId));
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState({ prescription_id: "", stock_id: "", drug_name: "", quantity: "1" });
  const [extraJson, setExtraJson] = useState("");
  const [error, setError] = useState("");

  function refresh() {
    setRows(listDispenses(tenantId));
    setRxList(listPrescriptions(tenantId).filter((p) => p.status === "issued"));
    setStock(listPharmacyStock(tenantId));
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
        searchFields: ["dispense_no", "drug_name", "patient_name"],
        sortField: "dispensed_at",
        sortDir: "desc"
      }) as unknown as HmsDispense[],
    [rows, search]
  );

  function doDispense() {
    setError("");
    try {
      const rx = rxList.find((r) => r.id === form.prescription_id);
      const row = dispenseFromRx(tenantId, {
        prescription_id: form.prescription_id,
        stock_id: form.stock_id || null,
        drug_name: form.drug_name || rx?.items[0]?.drug_name || "",
        quantity: Number(form.quantity) || 1,
        actor: "pharmacist"
      });
      persistExtraFields(tenantId, "healthcare.hms.dispense", row.id, extraJson);
      setOpenForm(false);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dispense failed");
    }
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Dispensing"
        description="Dispense from issued prescriptions with stock deduction."
        actionLabel="Dispense from Rx"
        onAction={() => {
          const rx = rxList[0];
          setForm({
            prescription_id: rx?.id ?? "",
            stock_id: stock[0]?.id ?? "",
            drug_name: rx?.items[0]?.drug_name ?? "",
            quantity: "1"
          });
          setExtraJson("");
          setError("");
          setOpenForm(true);
        }}
      />
      {openForm ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: false, entityLabel: "dispense", onConfirm: doDispense });
            }}
          >
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <Field label="Prescription">
              <SelectInput value={form.prescription_id} onChange={(e) => {
                const rx = rxList.find((r) => r.id === e.target.value);
                setForm({ ...form, prescription_id: e.target.value, drug_name: rx?.items[0]?.drug_name ?? "" });
              }}>
                <option value="">Select…</option>
                {rxList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.rx_no} · {patients.find((p) => p.id === r.patient_id)?.mrn ?? r.patient_name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Stock SKU">
              <SelectInput value={form.stock_id} onChange={(e) => setForm({ ...form, stock_id: e.target.value })}>
                <option value="">—</option>
                {stock.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sku} · {s.drug_name} (qty {s.quantity})
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Drug">
              <TextInput value={form.drug_name} onChange={(e) => setForm({ ...form, drug_name: e.target.value })} />
            </Field>
            <Field label="Quantity">
              <TextInput type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.hms.dispense" valueJson={extraJson} onChange={setExtraJson} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Dispense</Button>
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
              filename: "hms-dispenses",
              rows: filtered.map((r) => ({ Dispense: r.dispense_no, Drug: r.drug_name, Qty: r.quantity, Date: r.dispensed_at.slice(0, 10) }))
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Dispense</th>
                <th>Drug</th>
                <th>Qty</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3 font-semibold">{row.dispense_no}</td>
                  <td>{row.drug_name}</td>
                  <td>{row.quantity}</td>
                  <td>{row.dispensed_at.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}

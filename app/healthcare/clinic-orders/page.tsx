"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { money } from "@/lib/utils";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createClinicOrder,
  listClinicOrders,
  listMarketplaceProducts,
  listProviders,
  pullMarketplaceFromSupabase,
  reorderClinicOrder,
  subscribeMarketplace,
  trashClinicOrder,
  type ClinicOrder
} from "@/modules/healthcare/services/pharmacy-marketplace.store";

export default function ClinicOrdersPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<ClinicOrder[]>([]);
  const [providers, setProviders] = useState(listProviders(tenantId));
  const [products, setProducts] = useState(listMarketplaceProducts(tenantId));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("order_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openForm, setOpenForm] = useState(false);
  const [extraJson, setExtraJson] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    provider_id: "",
    product_id: "",
    quantity: "1",
    patient_name: "",
    patient_dob: "",
    patient_mrn: "",
    shipping_address: "",
    dosage_notes: "",
    medical_necessity: "",
    attestation_signed: false,
    consent_acknowledged: false
  });

  function refresh() {
    setRows(listClinicOrders(tenantId));
    setProviders(listProviders(tenantId).filter((p) => p.can_order));
    setProducts(listMarketplaceProducts(tenantId).filter((p) => p.status === "active"));
  }
  useEffect(() => {
    void pullMarketplaceFromSupabase(tenantId).finally(() => refresh());
    return subscribeMarketplace(() => refresh());
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["order_no", "patient_name", "provider_name", "clinic_name", "pharmacy_name", "status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as ClinicOrder[],
    [rows, search, statusFilter, sortField, sortDir]
  );

  function doSave() {
    const provider = providers.find((p) => p.id === form.provider_id);
    const product = products.find((p) => p.id === form.product_id);
    if (!provider || !product || !form.patient_name.trim()) {
      setError("Approved provider, product, and patient are required.");
      return;
    }
    if (!form.attestation_signed || !form.consent_acknowledged) {
      setError("Attestation and consent acknowledgments are required.");
      return;
    }
    const qty = Math.max(1, Number(form.quantity) || 1);
    const row = createClinicOrder(tenantId, {
      provider_id: provider.id,
      provider_name: provider.full_name,
      clinic_name: provider.clinic_name,
      patient_name: form.patient_name.trim(),
      patient_dob: form.patient_dob || null,
      patient_mrn: form.patient_mrn.trim() || null,
      pharmacy_id: product.pharmacy_id,
      pharmacy_name: product.pharmacy_name,
      shipping_address: form.shipping_address.trim() || null,
      dosage_notes: form.dosage_notes.trim() || null,
      medical_necessity: form.medical_necessity.trim() || null,
      attestation_signed: true,
      consent_acknowledged: true,
      lines: [
        {
          product_id: product.id,
          product_name: product.name,
          pharmacy_id: product.pharmacy_id,
          pharmacy_name: product.pharmacy_name,
          sku: product.sku,
          strength: product.strength,
          quantity: qty,
          unit_price: product.unit_price,
          controlled: product.controlled
        }
      ]
    });
    persistExtraFields(tenantId, "healthcare.clinic_order", row.id, extraJson);
    setOpenForm(false);
    setError("");
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Clinic orders"
        description="Patient-specific Rx orders with attestation, consent, and pharmacy routing."
        actionLabel="New clinic order"
        onAction={() => {
          setForm({
            provider_id: providers[0]?.id ?? "",
            product_id: products[0]?.id ?? "",
            quantity: "1",
            patient_name: "",
            patient_dob: "",
            patient_mrn: "",
            shipping_address: "",
            dosage_notes: "",
            medical_necessity: "",
            attestation_signed: false,
            consent_acknowledged: false
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
              askSave({ editing: false, entityLabel: "clinic order", onConfirm: doSave });
            }}
          >
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <Field label="Approved provider">
              <SelectInput value={form.provider_id} onChange={(e) => setForm({ ...form, provider_id: e.target.value })}>
                <option value="">Select…</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} · {p.clinic_name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Product">
              <SelectInput value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
                <option value="">Select…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.pharmacy_name} · {money(p.unit_price)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Quantity">
              <TextInput type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </Field>
            <Field label="Patient name">
              <TextInput required value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} />
            </Field>
            <Field label="Patient DOB">
              <TextInput type="date" value={form.patient_dob} onChange={(e) => setForm({ ...form, patient_dob: e.target.value })} />
            </Field>
            <Field label="Patient MRN">
              <TextInput value={form.patient_mrn} onChange={(e) => setForm({ ...form, patient_mrn: e.target.value })} />
            </Field>
            <Field label="Shipping address" className="md:col-span-2">
              <TextInput value={form.shipping_address} onChange={(e) => setForm({ ...form, shipping_address: e.target.value })} />
            </Field>
            <Field label="Dosage / Rx notes" className="md:col-span-2">
              <TextInput value={form.dosage_notes} onChange={(e) => setForm({ ...form, dosage_notes: e.target.value })} />
            </Field>
            <Field label="Medical necessity" className="md:col-span-2">
              <TextInput value={form.medical_necessity} onChange={(e) => setForm({ ...form, medical_necessity: e.target.value })} />
            </Field>
            <Field label="Acknowledgments" className="md:col-span-2">
              <div className="flex flex-col gap-2 pt-1 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.attestation_signed}
                    onChange={(e) => setForm({ ...form, attestation_signed: e.target.checked })}
                  />
                  Electronic attestation signed (prescriber responsibility)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.consent_acknowledged}
                    onChange={(e) => setForm({ ...form, consent_acknowledged: e.target.checked })}
                  />
                  Patient consent / required disclosures acknowledged
                </label>
              </div>
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.clinic_order" valueJson={extraJson} onChange={setExtraJson} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Submit order</Button>
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
            { value: "pending", label: "Pending" },
            { value: "processing", label: "Processing" },
            { value: "accepted", label: "Accepted" },
            { value: "shipped", label: "Shipped" },
            { value: "completed", label: "Completed" },
            { value: "canceled", label: "Canceled" },
            { value: "rejected", label: "Rejected" }
          ]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "order_date", label: "Date" },
            { value: "order_no", label: "Order #" },
            { value: "total_amount", label: "Total" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: "clinic-orders",
              rows: filtered.map((r) => ({
                Order: r.order_no,
                Patient: r.patient_name,
                Provider: r.provider_name,
                Pharmacy: r.pharmacy_name,
                Status: r.status,
                Total: r.total_amount
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "healthcare",
              title: "Clinic orders",
              filename: "clinic-orders",
              columns: ["Order", "Patient", "Pharmacy", "Status", "Total"],
              rows: filtered.map((r) => [r.order_no, r.patient_name, r.pharmacy_name, r.status, r.total_amount])
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Order</th>
                <th>Patient / Provider</th>
                <th>Pharmacy</th>
                <th>Status</th>
                <th>Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3">
                    <div className="font-semibold">{row.order_no}</div>
                    <div className="text-xs text-slate-500">{row.order_date}</div>
                    <ExtraFieldsReadout tenantId={tenantId} formKey="healthcare.clinic_order" recordId={row.id} />
                  </td>
                  <td>
                    {row.patient_name}
                    <div className="text-xs text-slate-500">
                      {row.provider_name} · {row.clinic_name}
                    </div>
                  </td>
                  <td>
                    {row.pharmacy_name}
                    <div className="text-xs text-slate-500">{row.lines.map((l) => l.product_name).join(", ")}</div>
                  </td>
                  <td>
                    <StatusBadge status={row.status} />
                    <div className="text-xs text-slate-500">Pay: {row.payment_status}</div>
                    {row.tracking_no ? <div className="text-xs text-slate-500">Track {row.tracking_no}</div> : null}
                  </td>
                  <td>{money(row.total_amount)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        className="!px-2 !py-1 text-xs"
                        onClick={() => {
                          reorderClinicOrder(tenantId, row.id);
                          refresh();
                        }}
                      >
                        Reorder
                      </Button>
                      <RecordRowActions
                        onEdit={() => {
                          setExtraJson(getExtraFieldValues(tenantId, "healthcare.clinic_order", row.id));
                          setOpenForm(true);
                        }}
                        onTrash={() =>
                          askTrash({
                            entityLabel: "clinic order",
                            onConfirm: () => {
                              trashClinicOrder(row.id);
                              refresh();
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
    </AppShell>
  );
}

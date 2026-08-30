"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createAdjustment,
  listAdjustments,
  listProducts,
  listWarehouses,
  trashAdjustment,
  updateAdjustment,
  type StockAdjustment
} from "@/modules/inventory/services/inventory.store";

const empty = {
  product_id: "",
  warehouse_id: "",
  quantity_delta: "",
  reason: "",
  adjustment_date: new Date().toISOString().slice(0, 10)
};

export default function AdjustmentsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<StockAdjustment[]>([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("adjustment_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<StockAdjustment | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");
  const products = listProducts(tenantId);
  const warehouses = listWarehouses(tenantId);

  function refresh() {
    setRows(listAdjustments(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const enriched = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        product_name: products.find((p) => p.id === r.product_id)?.name ?? "—",
        warehouse_code: warehouses.find((w) => w.id === r.warehouse_id)?.code ?? "—"
      })),
    [rows, products, warehouses]
  );

  const filtered = useMemo(
    () =>
      filterAndSort(enriched as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["adjustment_no", "product_name", "warehouse_code", "reason"],
        sortField,
        sortDir
      }) as unknown as Array<StockAdjustment & { product_name: string; warehouse_code: string }>,
    [enriched, search, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, adjustment_date: new Date().toISOString().slice(0, 10) });
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: StockAdjustment) {
    setEditing(row);
    setForm({
      product_id: row.product_id,
      warehouse_id: row.warehouse_id,
      quantity_delta: String(row.quantity_delta),
      reason: row.reason,
      adjustment_date: row.adjustment_date
    });
    setExtraJson(getExtraFieldValues(tenantId, "inventory.adjustment", row.id));
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    setError("");
    if (!form.product_id || !form.warehouse_id) {
      setError("Product and warehouse are required.");
      return;
    }
    const delta = Number(form.quantity_delta);
    if (!delta) {
      setError("Quantity change cannot be zero.");
      return;
    }
    const payload = {
      product_id: form.product_id,
      warehouse_id: form.warehouse_id,
      quantity_delta: delta,
      reason: form.reason.trim() || "Adjustment",
      adjustment_date: form.adjustment_date
    };
    if (editing) {
      updateAdjustment(editing.id, payload);
      persistExtraFields(tenantId, "inventory.adjustment", editing.id, extraJson);
    } else {
      const row = createAdjustment(tenantId, payload);
      persistExtraFields(tenantId, "inventory.adjustment", row.id, extraJson);
    }
    setExtraJson("");
    setForm({ ...empty, adjustment_date: new Date().toISOString().slice(0, 10) });
    setEditing(null);
    setOpenForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "stock adjustment",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="inventory">
      <PageHeader title="Stock Adjustments" description="Correct stock (+ / −) with a reason." actionLabel="New adjustment" onAction={openCreate} />
      <ModuleBreadcrumbs />
      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <Field label="Product">
              <SelectInput value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} required>
                <option value="">Select…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Warehouse">
              <SelectInput value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })} required>
                <option value="">Select…</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Qty change (+/−)">
              <TextInput type="number" step="1" value={form.quantity_delta} onChange={(e) => setForm({ ...form, quantity_delta: e.target.value })} required />
            </Field>
            <Field label="Date">
              <TextInput type="date" value={form.adjustment_date} onChange={(e) => setForm({ ...form, adjustment_date: e.target.value })} />
            </Field>
            <Field label="Reason" className="md:col-span-2">
              <TextInput value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </Field>
            <ExtraFieldsBlock formKey="inventory.adjustment" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">{editing ? "Update adjustment" : "Save adjustment"}</Button>
              <Button type="button" variant="secondary" onClick={() => { setExtraJson(""); setEditing(null); setOpenForm(false); }}>
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
          searchPlaceholder="Search adjustment, product, reason…"
          sortValue={sortField}
          sortOptions={[
            { value: "adjustment_no", label: "Adj no" },
            { value: "product_name", label: "Product" },
            { value: "adjustment_date", label: "Date" },
            { value: "quantity_delta", label: "Delta" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "inventory",
              filename: "adjustments",
              rows: filtered.map((r) => ({
                No: r.adjustment_no,
                Product: r.product_name,
                Warehouse: r.warehouse_code,
                Delta: r.quantity_delta,
                Reason: r.reason,
                Date: r.adjustment_date
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "inventory",
              title: "Stock Adjustments",
              filename: "adjustments",
              columns: ["No", "Product", "Warehouse", "Delta", "Date"],
              rows: filtered.map((r) => [r.adjustment_no, r.product_name, r.warehouse_code, String(r.quantity_delta), r.adjustment_date])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Adj No", "Product", "Warehouse", "Delta", "Reason", "Date", ""].map((h) => (
                <th key={h || "a"} className="px-3 py-3 font-semibold text-slate-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-line">
                <td className="px-3 py-3 font-medium">
                  {r.adjustment_no}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="inventory.adjustment" recordId={r.id} />
                </td>
                <td className="px-3 py-3">{r.product_name}</td>
                <td className="px-3 py-3">{r.warehouse_code}</td>
                <td className="px-3 py-3">{r.quantity_delta > 0 ? `+${r.quantity_delta}` : r.quantity_delta}</td>
                <td className="px-3 py-3">{r.reason}</td>
                <td className="px-3 py-3">{r.adjustment_date}</td>
                <td className="px-3 py-3">
                  <RecordRowActions
                    onEdit={() => openEdit(r)}
                    onTrash={() =>
                      askTrash({
                        entityLabel: "stock adjustment",
                        name: r.adjustment_no,
                        onConfirm: () => {
                          trashAdjustment(r.id);
                          refresh();
                        }
                      })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      {dialog}
    </AppShell>
  );
}

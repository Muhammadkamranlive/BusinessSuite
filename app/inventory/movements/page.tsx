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
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  listProducts,
  listStockMovements,
  listWarehouses,
  postStockMovement,
  trashStockMovement,
  type Product,
  type StockMovement,
  type Warehouse
} from "@/modules/inventory/services/inventory.store";

const OUT_TYPES = new Set(["sale", "transfer_out"]);

const empty = {
  product_id: "",
  warehouse_id: "",
  movement_type: "purchase" as StockMovement["movement_type"],
  quantity: "",
  unit_cost: "",
  movement_date: new Date().toISOString().slice(0, 10),
  notes: ""
};

export default function StockMovementsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortField, setSortField] = useState("movement_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openForm, setOpenForm] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setMovements(listStockMovements(tenantId));
    setProducts(listProducts(tenantId));
    setWarehouses(listWarehouses(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const enriched = useMemo(
    () =>
      movements.map((m) => ({
        ...m,
        product_name: products.find((p) => p.id === m.product_id)?.name ?? "—"
      })),
    [movements, products]
  );

  const filtered = useMemo(
    () =>
      filterAndSort(enriched as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["product_name", "movement_type", "notes", "movement_date"],
        statusField: "movement_type",
        statusValue: typeFilter,
        sortField,
        sortDir
      }) as unknown as Array<StockMovement & { product_name: string }>,
    [enriched, search, typeFilter, sortField, sortDir]
  );

  function openCreate() {
    setForm({ ...empty, movement_date: new Date().toISOString().slice(0, 10) });
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    setError("");
    if (!form.product_id || !form.warehouse_id) {
      setError("Product and warehouse are required.");
      return;
    }
    const absQty = Math.abs(Number(form.quantity) || 0);
    if (!absQty) {
      setError("Quantity must be greater than zero.");
      return;
    }
    const signed = OUT_TYPES.has(form.movement_type) ? -absQty : absQty;
    const row = postStockMovement(tenantId, {
      product_id: form.product_id,
      warehouse_id: form.warehouse_id,
      movement_type: form.movement_type,
      reference_type: null,
      reference_id: null,
      quantity: signed,
      unit_cost: Number(form.unit_cost) || 0,
      movement_date: form.movement_date || new Date().toISOString().slice(0, 10),
      notes: form.notes.trim() || null
    });
    persistExtraFields(tenantId, "inventory.movement", row.id, extraJson);
    setExtraJson("");
    setForm({ ...empty, movement_date: new Date().toISOString().slice(0, 10) });
    setOpenForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: false,
      entityLabel: "stock movement",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="inventory">
      <PageHeader
        title="Stock Movements"
        description="Stock in / out updates product quantities shown on Products and Reports."
        actionLabel="Post movement"
        onAction={openCreate}
      />
      <ModuleBreadcrumbs />

      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
            {error ? <p className="md:col-span-3 text-sm text-rose-600">{error}</p> : null}
            <Field label="Product">
              <SelectInput value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} required>
                <option value="">Select product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Warehouse">
              <SelectInput value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })} required>
                <option value="">Select warehouse…</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Type">
              <SelectInput
                value={form.movement_type}
                onChange={(e) => setForm({ ...form, movement_type: e.target.value as StockMovement["movement_type"] })}
              >
                {["opening", "purchase", "sale", "transfer_in", "transfer_out", "adjustment"].map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Quantity">
              <TextInput type="number" min={0.01} step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
            </Field>
            <Field label="Unit cost">
              <TextInput type="number" min={0} step="0.01" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
            </Field>
            <Field label="Date">
              <TextInput type="date" value={form.movement_date} onChange={(e) => setForm({ ...form, movement_date: e.target.value })} />
            </Field>
            <Field label="Notes">
              <TextInput value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Reference / remark" />
            </Field>
            <ExtraFieldsBlock formKey="inventory.movement" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-3 flex gap-2">
              <Button type="submit">Post movement</Button>
              <Button type="button" variant="secondary" onClick={() => { setExtraJson(""); setOpenForm(false); }}>
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
          searchPlaceholder="Search product, type, notes…"
          filterLabel="types"
          filterValue={typeFilter}
          filterOptions={["opening", "purchase", "sale", "transfer_in", "transfer_out", "adjustment"].map((t) => ({
            value: t,
            label: t.replace(/_/g, " ")
          }))}
          onFilterChange={setTypeFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "movement_date", label: "Date" },
            { value: "product_name", label: "Product" },
            { value: "movement_type", label: "Type" },
            { value: "quantity", label: "Qty" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "inventory",
              filename: "stock-movements",
              rows: filtered.map((m) => ({
                Date: m.movement_date,
                Product: m.product_name,
                Type: m.movement_type,
                Qty: m.quantity,
                Notes: m.notes ?? ""
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "inventory",
              title: "Stock Movements",
              filename: "stock-movements",
              columns: ["Date", "Product", "Type", "Qty"],
              rows: filtered.map((m) => [m.movement_date, m.product_name, m.movement_type, String(m.quantity)])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Date", "Product", "Type", "Qty", "Reference", ""].map((h) => (
                <th key={h || "a"} className="px-3 py-3 font-semibold text-slate-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-line">
                <td className="px-3 py-3">
                  {m.movement_date}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="inventory.movement" recordId={m.id} />
                </td>
                <td className="px-3 py-3">{m.product_name}</td>
                <td className="px-3 py-3 capitalize">{m.movement_type.replace(/_/g, " ")}</td>
                <td className="px-3 py-3">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                <td className="px-3 py-3">{m.notes ?? "—"}</td>
                <td className="px-3 py-3">
                  <RecordRowActions
                    onTrash={() =>
                      askTrash({
                        entityLabel: "stock movement",
                        name: `${m.movement_type} · ${m.movement_date}`,
                        onConfirm: () => {
                          trashStockMovement(m.id);
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

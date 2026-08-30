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
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createTransfer,
  listProducts,
  listTransfers,
  listWarehouses,
  trashTransfer,
  updateTransfer,
  type StockTransfer
} from "@/modules/inventory/services/inventory.store";

const empty = {
  product_id: "",
  from_warehouse_id: "",
  to_warehouse_id: "",
  quantity: "",
  transfer_date: new Date().toISOString().slice(0, 10),
  status: "posted" as StockTransfer["status"],
  notes: ""
};

export default function TransfersPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<StockTransfer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("transfer_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<StockTransfer | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");
  const products = listProducts(tenantId);
  const warehouses = listWarehouses(tenantId);

  function refresh() {
    setRows(listTransfers(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const enriched = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        product_name: products.find((p) => p.id === r.product_id)?.name ?? "—",
        from_code: warehouses.find((w) => w.id === r.from_warehouse_id)?.code ?? "—",
        to_code: warehouses.find((w) => w.id === r.to_warehouse_id)?.code ?? "—"
      })),
    [rows, products, warehouses]
  );

  const filtered = useMemo(
    () =>
      filterAndSort(enriched as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["transfer_no", "product_name", "from_code", "to_code", "notes"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as Array<StockTransfer & { product_name: string; from_code: string; to_code: string }>,
    [enriched, search, statusFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, transfer_date: new Date().toISOString().slice(0, 10) });
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: StockTransfer) {
    setEditing(row);
    setForm({
      product_id: row.product_id,
      from_warehouse_id: row.from_warehouse_id,
      to_warehouse_id: row.to_warehouse_id,
      quantity: String(row.quantity),
      transfer_date: row.transfer_date,
      status: row.status,
      notes: row.notes ?? ""
    });
    setExtraJson(getExtraFieldValues(tenantId, "inventory.transfer", row.id));
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    setError("");
    if (!form.product_id || !form.from_warehouse_id || !form.to_warehouse_id) {
      setError("Product and both warehouses are required.");
      return;
    }
    if (form.from_warehouse_id === form.to_warehouse_id) {
      setError("From and To warehouses must differ.");
      return;
    }
    const payload = {
      product_id: form.product_id,
      from_warehouse_id: form.from_warehouse_id,
      to_warehouse_id: form.to_warehouse_id,
      quantity: Number(form.quantity) || 0,
      transfer_date: form.transfer_date,
      status: form.status,
      notes: form.notes.trim()
    };
    if (editing) {
      updateTransfer(editing.id, payload);
      persistExtraFields(tenantId, "inventory.transfer", editing.id, extraJson);
    } else {
      const row = createTransfer(tenantId, payload);
      persistExtraFields(tenantId, "inventory.transfer", row.id, extraJson);
    }
    setExtraJson("");
    setForm({ ...empty, transfer_date: new Date().toISOString().slice(0, 10) });
    setEditing(null);
    setOpenForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "stock transfer",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="inventory">
      <PageHeader title="Stock Transfers" description="Move stock between warehouses." actionLabel="New transfer" onAction={openCreate} />
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
            <Field label="Quantity">
              <TextInput type="number" min={0.01} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
            </Field>
            <Field label="From warehouse">
              <SelectInput value={form.from_warehouse_id} onChange={(e) => setForm({ ...form, from_warehouse_id: e.target.value })} required>
                <option value="">Select…</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="To warehouse">
              <SelectInput value={form.to_warehouse_id} onChange={(e) => setForm({ ...form, to_warehouse_id: e.target.value })} required>
                <option value="">Select…</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Date">
              <TextInput type="date" value={form.transfer_date} onChange={(e) => setForm({ ...form, transfer_date: e.target.value })} />
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StockTransfer["status"] })}>
                <option value="draft">draft</option>
                <option value="posted">posted</option>
              </SelectInput>
            </Field>
            <ExtraFieldsBlock formKey="inventory.transfer" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">{editing ? "Update transfer" : "Save transfer"}</Button>
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
          searchPlaceholder="Search transfer, product, warehouse…"
          filterLabel="statuses"
          filterValue={statusFilter}
          filterOptions={[
            { value: "draft", label: "draft" },
            { value: "posted", label: "posted" }
          ]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "transfer_no", label: "Transfer" },
            { value: "product_name", label: "Product" },
            { value: "transfer_date", label: "Date" },
            { value: "status", label: "Status" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "inventory",
              filename: "transfers",
              rows: filtered.map((r) => ({
                No: r.transfer_no,
                Product: r.product_name,
                Qty: r.quantity,
                From: r.from_code,
                To: r.to_code,
                Date: r.transfer_date,
                Status: r.status
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "inventory",
              title: "Stock Transfers",
              filename: "transfers",
              columns: ["No", "Product", "Qty", "From", "To", "Status"],
              rows: filtered.map((r) => [r.transfer_no, r.product_name, String(r.quantity), r.from_code, r.to_code, r.status])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Transfer", "Product", "Qty", "From", "To", "Date", "Status", ""].map((h) => (
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
                  {r.transfer_no}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="inventory.transfer" recordId={r.id} />
                </td>
                <td className="px-3 py-3">{r.product_name}</td>
                <td className="px-3 py-3">{r.quantity}</td>
                <td className="px-3 py-3">{r.from_code}</td>
                <td className="px-3 py-3">{r.to_code}</td>
                <td className="px-3 py-3">{r.transfer_date}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-3 py-3">
                  <RecordRowActions
                    onEdit={() => openEdit(r)}
                    onTrash={() =>
                      askTrash({
                        entityLabel: "stock transfer",
                        name: r.transfer_no,
                        onConfirm: () => {
                          trashTransfer(r.id);
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

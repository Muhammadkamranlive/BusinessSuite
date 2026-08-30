"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { DocumentLinesEditor } from "@/components/ops/document-lines-editor";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { money } from "@/lib/utils";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { listProducts } from "@/modules/inventory/services/inventory.store";
import { emptyDocumentLine, linesSubtotal, normalizeLines, type DocumentLine } from "@/modules/ops/document-line";
import {
  createPurchaseOrder,
  listPurchaseOrders,
  listSuppliers,
  trashPurchaseOrder,
  updatePurchaseOrder,
  type PurchaseOrder,
  type Supplier
} from "@/modules/purchase/services/purchase.store";

const empty = {
  supplier_id: "",
  order_date: new Date().toISOString().slice(0, 10),
  expected_delivery_date: "",
  status: "approved" as PurchaseOrder["status"]
};

export default function PurchaseOrdersPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ReturnType<typeof listProducts>>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("order_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [lines, setLines] = useState<DocumentLine[]>([emptyDocumentLine()]);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setOrders(listPurchaseOrders(tenantId));
    setSuppliers(listSuppliers(tenantId));
    setProducts(listProducts(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(orders as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["purchase_order_no", "supplier_name", "status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as PurchaseOrder[],
    [orders, search, statusFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, order_date: new Date().toISOString().slice(0, 10) });
    setLines([emptyDocumentLine()]);
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: PurchaseOrder) {
    setEditing(row);
    setForm({
      supplier_id: row.supplier_id,
      order_date: row.order_date,
      expected_delivery_date: row.expected_delivery_date,
      status: row.status
    });
    setLines(row.lines?.length ? row.lines : [emptyDocumentLine()]);
    setExtraJson(getExtraFieldValues(tenantId, "purchases.order", row.id));
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    setError("");
    const supplier = suppliers.find((s) => s.id === form.supplier_id);
    if (!supplier) {
      setError("Select a supplier.");
      return;
    }
    const normalized = normalizeLines(lines);
    const payload = {
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      order_date: form.order_date,
      expected_delivery_date: form.expected_delivery_date || form.order_date,
      status: form.status,
      lines: normalized,
      total_amount: normalized.length ? linesSubtotal(normalized) : editing?.total_amount ?? 0
    };
    if (editing) {
      updatePurchaseOrder(editing.id, payload);
      persistExtraFields(tenantId, "purchases.order", editing.id, extraJson);
    } else {
      const row = createPurchaseOrder(tenantId, payload);
      persistExtraFields(tenantId, "purchases.order", row.id, extraJson);
    }
    setExtraJson("");
    setForm({ ...empty, order_date: new Date().toISOString().slice(0, 10) });
    setLines([emptyDocumentLine()]);
    setEditing(null);
    setOpenForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "purchase order",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="purchases">
      <PageHeader title="Purchase Orders" description="Add product lines. GRN posting receives those lines into stock." actionLabel="New purchase order" onAction={openCreate} />
      <ModuleBreadcrumbs />
      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
            {error ? <p className="md:col-span-3 text-sm text-rose-600">{error}</p> : null}
            <Field label="Supplier">
              <SelectInput value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })} required>
                <option value="">Select…</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Order date">
              <TextInput type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} />
            </Field>
            <Field label="Expected delivery">
              <TextInput type="date" value={form.expected_delivery_date} onChange={(e) => setForm({ ...form, expected_delivery_date: e.target.value })} />
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PurchaseOrder["status"] })}>
                {["draft", "sent", "approved", "received", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
              </SelectInput>
            </Field>
            <DocumentLinesEditor lines={lines} onChange={setLines} products={products} priceField="purchase_price" />
            <ExtraFieldsBlock formKey="purchases.order" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-3 flex gap-2">
              <Button type="submit">{editing ? "Update PO" : "Save PO"}</Button>
              <Button type="button" variant="secondary" onClick={() => { setExtraJson(""); setEditing(null); setOpenForm(false); }}>Cancel</Button>
            </div>
          </form>
        </Panel>
      ) : null}
      <Panel>
        <DataListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search PO, supplier…"
          filterLabel="statuses"
          filterValue={statusFilter}
          filterOptions={["draft", "sent", "approved", "received", "cancelled"].map((s) => ({ value: s, label: s }))}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "purchase_order_no", label: "PO no" },
            { value: "supplier_name", label: "Supplier" },
            { value: "order_date", label: "Order date" },
            { value: "total_amount", label: "Amount" },
            { value: "status", label: "Status" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "purchases",
              filename: "purchase-orders",
              rows: filtered.map((o) => ({
                No: o.purchase_order_no,
                Supplier: o.supplier_name,
                Date: o.order_date,
                ETA: o.expected_delivery_date,
                Amount: o.total_amount,
                Status: o.status
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "purchases",
              title: "Purchase Orders",
              filename: "purchase-orders",
              columns: ["No", "Supplier", "Date", "Amount", "Status"],
              rows: filtered.map((o) => [o.purchase_order_no, o.supplier_name, o.order_date, money(o.total_amount), o.status])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["PO No", "Supplier", "Order Date", "ETA", "Amount", "Status", ""].map((h) => (
                <th key={h || "a"} className="px-3 py-3 font-semibold text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-b border-line">
                <td className="px-3 py-3 font-medium">
                  {o.purchase_order_no}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="purchases.order" recordId={o.id} />
                </td>
                <td className="px-3 py-3">{o.supplier_name}</td>
                <td className="px-3 py-3">{o.order_date}</td>
                <td className="px-3 py-3">{o.expected_delivery_date}</td>
                <td className="px-3 py-3">{money(o.total_amount)}</td>
                <td className="px-3 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-3 py-3">
                  <RecordRowActions
                    onEdit={() => openEdit(o)}
                    onTrash={() =>
                      askTrash({
                        entityLabel: "purchase order",
                        name: o.purchase_order_no,
                        onConfirm: () => {
                          trashPurchaseOrder(o.id);
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

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
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { listProducts } from "@/modules/inventory/services/inventory.store";
import { emptyDocumentLine, normalizeLines, type DocumentLine } from "@/modules/ops/document-line";
import {
  createGoodsReceipt,
  getPurchaseOrderByNo,
  listGoodsReceipts,
  listPurchaseOrders,
  postGoodsReceipt,
  trashGoodsReceipt,
  updateGoodsReceipt,
  type GoodsReceipt
} from "@/modules/purchase/services/purchase.store";

const empty = {
  purchase_order_no: "",
  supplier_name: "",
  receipt_date: new Date().toISOString().slice(0, 10),
  status: "posted" as GoodsReceipt["status"],
  qc_status: "accepted" as NonNullable<GoodsReceipt["qc_status"]>,
  notes: ""
};

export default function GoodsReceiptsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<GoodsReceipt[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("receipt_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<GoodsReceipt | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [lines, setLines] = useState<DocumentLine[]>([emptyDocumentLine()]);
  const [extraJson, setExtraJson] = useState("");
  const orders = listPurchaseOrders(tenantId);
  const products = listProducts(tenantId);

  function refresh() {
    setRows(listGoodsReceipts(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["receipt_no", "purchase_order_no", "supplier_name", "notes"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as GoodsReceipt[],
    [rows, search, statusFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, receipt_date: new Date().toISOString().slice(0, 10) });
    setLines([emptyDocumentLine()]);
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: GoodsReceipt) {
    setEditing(row);
    setForm({
      purchase_order_no: row.purchase_order_no === "—" ? "" : row.purchase_order_no,
      supplier_name: row.supplier_name,
      receipt_date: row.receipt_date,
      status: row.status,
      qc_status: row.qc_status ?? "accepted",
      notes: row.notes === "—" ? "" : row.notes
    });
    setLines(row.lines?.length ? row.lines : [emptyDocumentLine()]);
    setExtraJson(getExtraFieldValues(tenantId, "purchases.receipt", row.id));
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    setError("");
    if (!form.supplier_name.trim()) {
      setError("Supplier is required.");
      return;
    }
    const payload = {
      purchase_order_no: form.purchase_order_no || "—",
      supplier_name: form.supplier_name.trim(),
      receipt_date: form.receipt_date,
      status: form.status,
      notes: form.notes.trim() || "—",
      qc_status: form.qc_status,
      lines: normalizeLines(lines)
    };
    if (editing) {
      updateGoodsReceipt(editing.id, payload);
      persistExtraFields(tenantId, "purchases.receipt", editing.id, extraJson);
    } else {
      try {
        const row = createGoodsReceipt(tenantId, payload);
        persistExtraFields(tenantId, "purchases.receipt", row.id, extraJson);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not post goods receipt.");
        return;
      }
    }
    setExtraJson("");
    setForm({ ...empty, receipt_date: new Date().toISOString().slice(0, 10) });
    setLines([emptyDocumentLine()]);
    setEditing(null);
    setOpenForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "goods receipt",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="purchases">
      <PageHeader title="Goods Receipts" description="Posted GRNs increase warehouse stock from PO/GRN lines." actionLabel="New GRN" onAction={openCreate} />
      <ModuleBreadcrumbs />
      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <Field label="Purchase order">
              <SelectInput
                value={form.purchase_order_no}
                onChange={(e) => {
                  const po = getPurchaseOrderByNo(tenantId, e.target.value);
                  setForm({ ...form, purchase_order_no: e.target.value, supplier_name: po?.supplier_name ?? form.supplier_name });
                  if (po?.lines?.length) setLines(po.lines);
                }}
              >
                <option value="">Select PO…</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.purchase_order_no}>{o.purchase_order_no} — {o.supplier_name}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Supplier">
              <TextInput value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} required />
            </Field>
            <Field label="Receipt date">
              <TextInput type="date" value={form.receipt_date} onChange={(e) => setForm({ ...form, receipt_date: e.target.value })} />
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as GoodsReceipt["status"] })}>
                <option value="draft">draft</option>
                <option value="posted">posted (updates stock)</option>
              </SelectInput>
            </Field>
            <Field label="QC">
              <SelectInput value={form.qc_status} onChange={(e) => setForm({ ...form, qc_status: e.target.value as NonNullable<GoodsReceipt["qc_status"]> })}>
                <option value="accepted">accepted</option>
                <option value="pending">pending</option>
                <option value="hold">hold</option>
                <option value="rejected">rejected</option>
              </SelectInput>
            </Field>
            <DocumentLinesEditor lines={lines} onChange={setLines} products={products} priceField="purchase_price" />
            <Field label="Notes" className="md:col-span-2">
              <TextInput value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <ExtraFieldsBlock formKey="purchases.receipt" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">{editing ? "Update GRN" : "Save GRN"}</Button>
              <Button type="button" variant="secondary" onClick={() => { setExtraJson(""); setEditing(null); setOpenForm(false); }}>Cancel</Button>
            </div>
          </form>
        </Panel>
      ) : null}
      <Panel>
        <DataListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search GRN, PO, supplier…"
          filterLabel="statuses"
          filterValue={statusFilter}
          filterOptions={[
            { value: "draft", label: "draft" },
            { value: "posted", label: "posted" }
          ]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "receipt_no", label: "GRN" },
            { value: "supplier_name", label: "Supplier" },
            { value: "receipt_date", label: "Date" },
            { value: "status", label: "Status" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "purchases",
              filename: "goods-receipts",
              rows: filtered.map((r) => ({
                GRN: r.receipt_no,
                PO: r.purchase_order_no,
                Supplier: r.supplier_name,
                Date: r.receipt_date,
                Status: r.status,
                Notes: r.notes
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "purchases",
              title: "Goods Receipts",
              filename: "goods-receipts",
              columns: ["GRN", "PO", "Supplier", "Date", "Status"],
              rows: filtered.map((r) => [r.receipt_no, r.purchase_order_no, r.supplier_name, r.receipt_date, r.status])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["GRN", "PO", "Supplier", "Date", "Status", ""].map((h) => (
                <th key={h || "a"} className="px-3 py-3 font-semibold text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-line">
                <td className="px-3 py-3 font-medium">
                  {r.receipt_no}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="purchases.receipt" recordId={r.id} />
                </td>
                <td className="px-3 py-3">{r.purchase_order_no}</td>
                <td className="px-3 py-3">{r.supplier_name}</td>
                <td className="px-3 py-3">{r.receipt_date}</td>
                <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {r.status === "draft" ? (
                      <Button variant="secondary" onClick={() => { postGoodsReceipt(tenantId, r.id); refresh(); }}>Post to stock</Button>
                    ) : (
                      <span className="text-xs text-slate-500">{r.notes}</span>
                    )}
                    <RecordRowActions
                      onEdit={() => openEdit(r)}
                      onTrash={() =>
                        askTrash({
                          entityLabel: "goods receipt",
                          name: r.receipt_no,
                          onConfirm: () => {
                            trashGoodsReceipt(r.id);
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
      </Panel>
      {dialog}
    </AppShell>
  );
}

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
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { DocumentLinesEditor } from "@/components/ops/document-lines-editor";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { listProducts } from "@/modules/inventory/services/inventory.store";
import { emptyDocumentLine, type DocumentLine } from "@/modules/ops/document-line";
import {
  createDeliveryNote,
  listDeliveryNotes,
  listSalesOrders,
  trashDeliveryNote,
  updateDeliveryNote,
  type DeliveryNote
} from "@/modules/sales/services/sales.store";

export default function DeliveriesPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<DeliveryNote[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("delivery_no");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<DeliveryNote | null>(null);
  const [form, setForm] = useState({ customer_name: "", delivery_date: new Date().toISOString().slice(0, 10), status: "draft" as DeliveryNote["status"], transporter: "", tracking_no: "", pod_notes: "", sales_order_id: "" });
  const [lines, setLines] = useState<DocumentLine[]>([emptyDocumentLine()]);
  const [extraJson, setExtraJson] = useState("");
  const orders = listSalesOrders(tenantId);
  const products = listProducts(tenantId);

  function refresh() { setRows(listDeliveryNotes(tenantId)); }
  useEffect(() => { refresh(); }, [tenantId]);
  const filtered = useMemo(
    () => filterAndSort(rows as unknown as Array<Record<string, unknown>>, { search, searchFields: ["delivery_no", "customer_name", "tracking_no"], statusField: "status", statusValue: statusFilter, sortField, sortDir }) as unknown as DeliveryNote[],
    [rows, search, statusFilter, sortField, sortDir]
  );

  function doSave() {
    const payload = {
      customer_name: form.customer_name.trim(),
      delivery_date: form.delivery_date,
      status: form.status,
      transporter: form.transporter.trim() || null,
      tracking_no: form.tracking_no.trim() || null,
      pod_notes: form.pod_notes.trim() || null,
      sales_order_id: form.sales_order_id || null,
      lines
    };
    const row = editing ? updateDeliveryNote(editing.id, payload) : createDeliveryNote(tenantId, payload);
    if (row) persistExtraFields(tenantId, "sales.delivery", row.id, extraJson);
    setOpenForm(false);
    refresh();
  }

  return (
    <AppShell activeModule="sales">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader title="Delivery notes" description="Dispatch, tracking, and proof of delivery against sales orders." actionLabel="New delivery" onAction={() => { setEditing(null); setForm({ customer_name: "", delivery_date: new Date().toISOString().slice(0, 10), status: "draft", transporter: "", tracking_no: "", pod_notes: "", sales_order_id: "" }); setLines([emptyDocumentLine()]); setExtraJson(""); setOpenForm(true); }} />
      {openForm ? (
        <Panel className="mb-4">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); askSave({ editing: Boolean(editing), entityLabel: "delivery note", onConfirm: doSave }); }}>
            <Field label="Customer"><TextInput required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></Field>
            <Field label="Sales order">
              <SelectInput value={form.sales_order_id} onChange={(e) => {
                const so = orders.find((o) => o.id === e.target.value);
                setForm({ ...form, sales_order_id: e.target.value, customer_name: so?.customer_name || form.customer_name });
                if (so?.lines?.length) setLines(so.lines);
              }}>
                <option value="">Direct</option>
                {orders.map((o) => <option key={o.id} value={o.id}>{o.order_no} · {o.customer_name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Transporter"><TextInput value={form.transporter} onChange={(e) => setForm({ ...form, transporter: e.target.value })} /></Field>
            <Field label="Tracking no"><TextInput value={form.tracking_no} onChange={(e) => setForm({ ...form, tracking_no: e.target.value })} /></Field>
            <Field label="POD notes"><TextInput value={form.pod_notes} onChange={(e) => setForm({ ...form, pod_notes: e.target.value })} /></Field>
            <div className="md:col-span-2"><DocumentLinesEditor lines={lines} onChange={setLines} products={products} tenantId={tenantId} /></div>
            <div className="md:col-span-2"><ExtraFieldsBlock formKey="sales.delivery" valueJson={extraJson} onChange={setExtraJson} /></div>
            <Button type="submit">Save</Button>
          </form>
        </Panel>
      ) : null}
      <Panel>
        <DataListToolbar search={search} onSearchChange={setSearch} filterValue={statusFilter} filterOptions={[{ value: "all", label: "All" }, { value: "draft", label: "Draft" }, { value: "dispatched", label: "Dispatched" }, { value: "delivered", label: "Delivered" }]} onFilterChange={setStatusFilter} sortValue={sortField} sortOptions={[{ value: "delivery_no", label: "Number" }]} onSortChange={setSortField} sortDir={sortDir} onSortDirChange={setSortDir} onExportCsv={() => exportListCsv({ tenantId, module: "sales", filename: "deliveries", rows: filtered.map((r) => ({ No: r.delivery_no, Customer: r.customer_name, Status: r.status, Tracking: r.tracking_no ?? "" })) })} onExportPdf={() => exportListPdf({ tenantId, module: "sales", title: "Delivery notes", filename: "deliveries", columns: ["No", "Customer", "Status"], rows: filtered.map((r) => [r.delivery_no, r.customer_name, r.status]) })} />
        <table className="mt-3 w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th className="px-3 py-2">Delivery</th><th>Customer</th><th>Status</th><th>Tracking</th><th /></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-3 py-3 font-semibold">{r.delivery_no}</td>
                <td>{r.customer_name}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>{r.tracking_no ?? "—"}</td>
                <td>
                  <RecordRowActions onEdit={() => { setEditing(r); setForm({ customer_name: r.customer_name, delivery_date: r.delivery_date, status: r.status, transporter: r.transporter ?? "", tracking_no: r.tracking_no ?? "", pod_notes: r.pod_notes ?? "", sales_order_id: r.sales_order_id ?? "" }); setLines(r.lines?.length ? r.lines : [emptyDocumentLine()]); setOpenForm(true); }} onTrash={() => askTrash({ entityLabel: "delivery note", onConfirm: () => { trashDeliveryNote(r.id); refresh(); } })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}

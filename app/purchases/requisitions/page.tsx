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
import { money } from "@/lib/utils";
import { listProducts } from "@/modules/inventory/services/inventory.store";
import { emptyDocumentLine, linesSubtotal, type DocumentLine } from "@/modules/ops/document-line";
import {
  approveRequisition,
  convertRequisitionToPo,
  createRequisition,
  listRequisitions,
  listSuppliers,
  rejectRequisition,
  submitRequisition,
  trashRequisition,
  updateRequisition,
  type PurchaseRequisition
} from "@/modules/purchase/services/purchase.store";

export default function RequisitionsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<PurchaseRequisition[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("requisition_no");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<PurchaseRequisition | null>(null);
  const [form, setForm] = useState({ requested_by: "", department: "", needed_by: "", notes: "" });
  const [lines, setLines] = useState<DocumentLine[]>([emptyDocumentLine()]);
  const [extraJson, setExtraJson] = useState("");
  const [poSupplier, setPoSupplier] = useState<Record<string, string>>({});
  const products = listProducts(tenantId);
  const suppliers = listSuppliers(tenantId);

  function refresh() { setRows(listRequisitions(tenantId)); }
  useEffect(() => { refresh(); }, [tenantId]);
  const filtered = useMemo(
    () => filterAndSort(rows as unknown as Array<Record<string, unknown>>, { search, searchFields: ["requisition_no", "requested_by", "department"], statusField: "status", statusValue: statusFilter, sortField, sortDir }) as unknown as PurchaseRequisition[],
    [rows, search, statusFilter, sortField, sortDir]
  );

  function doSave() {
    const payload = {
      requested_by: form.requested_by.trim(),
      department: form.department.trim() || null,
      status: "draft" as PurchaseRequisition["status"],
      needed_by: form.needed_by || null,
      notes: form.notes.trim() || null,
      lines,
      total_amount: linesSubtotal(lines)
    };
    const row = editing ? updateRequisition(editing.id, payload) : createRequisition(tenantId, payload);
    if (row) persistExtraFields(tenantId, "purchases.requisition", row.id, extraJson);
    setOpenForm(false);
    refresh();
  }

  return (
    <AppShell activeModule="purchases">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader title="Purchase requisitions" description="Internal indents with submit → approve workflow before PO creation." actionLabel="New requisition" onAction={() => { setEditing(null); setForm({ requested_by: "", department: "", needed_by: "", notes: "" }); setLines([emptyDocumentLine()]); setExtraJson(""); setOpenForm(true); }} />
      {openForm ? (
        <Panel className="mb-4">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); askSave({ editing: Boolean(editing), entityLabel: "requisition", onConfirm: doSave }); }}>
            <Field label="Requested by"><TextInput required value={form.requested_by} onChange={(e) => setForm({ ...form, requested_by: e.target.value })} /></Field>
            <Field label="Department"><TextInput value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
            <Field label="Needed by"><TextInput type="date" value={form.needed_by} onChange={(e) => setForm({ ...form, needed_by: e.target.value })} /></Field>
            <Field label="Notes"><TextInput value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            <div className="md:col-span-2"><DocumentLinesEditor lines={lines} onChange={setLines} products={products} priceField="purchase_price" /></div>
            <div className="md:col-span-2"><ExtraFieldsBlock formKey="purchases.requisition" valueJson={extraJson} onChange={setExtraJson} /></div>
            <Button type="submit">Save draft</Button>
          </form>
        </Panel>
      ) : null}
      <Panel>
        <DataListToolbar search={search} onSearchChange={setSearch} filterValue={statusFilter} filterOptions={[{ value: "all", label: "All" }, { value: "draft", label: "Draft" }, { value: "submitted", label: "Submitted" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }]} onFilterChange={setStatusFilter} sortValue={sortField} sortOptions={[{ value: "requisition_no", label: "Number" }]} onSortChange={setSortField} sortDir={sortDir} onSortDirChange={setSortDir} onExportCsv={() => exportListCsv({ tenantId, module: "purchases", filename: "requisitions", rows: filtered.map((r) => ({ No: r.requisition_no, By: r.requested_by, Status: r.status, Amount: r.total_amount })) })} onExportPdf={() => exportListPdf({ tenantId, module: "purchases", title: "Requisitions", filename: "requisitions", columns: ["No", "By", "Status"], rows: filtered.map((r) => [r.requisition_no, r.requested_by, r.status]) })} />
        <table className="mt-3 w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th className="px-3 py-2">Requisition</th><th>Requested by</th><th>Status</th><th>Amount</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-3 py-3 font-semibold">{r.requisition_no}</td>
                <td>{r.requested_by}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>{money(r.total_amount)}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {r.status === "draft" ? (
                      <Button type="button" variant="secondary" className="!min-h-8 !px-2 !text-xs" onClick={() => askSave({ editing: true, entityLabel: "requisition submission", onConfirm: () => { submitRequisition(r.id); refresh(); } })}>Submit</Button>
                    ) : null}
                    {r.status === "submitted" ? (
                      <>
                        <Button type="button" className="!min-h-8 !px-2 !text-xs" onClick={() => askSave({ editing: true, entityLabel: "requisition approval", onConfirm: () => { approveRequisition(r.id); refresh(); } })}>Approve</Button>
                        <Button type="button" variant="secondary" className="!min-h-8 !px-2 !text-xs" onClick={() => askSave({ entityLabel: "requisition rejection", onConfirm: () => { rejectRequisition(r.id); refresh(); } })}>Reject</Button>
                      </>
                    ) : null}
                    {r.status === "approved" ? (
                      <>
                        <SelectInput className="!min-h-8 !text-xs" value={poSupplier[r.id] ?? ""} onChange={(e) => setPoSupplier({ ...poSupplier, [r.id]: e.target.value })}>
                          <option value="">Supplier for PO…</option>
                          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </SelectInput>
                        <Button type="button" variant="secondary" className="!min-h-8 !px-2 !text-xs" disabled={!poSupplier[r.id]} onClick={() => { const sup = suppliers.find((s) => s.id === poSupplier[r.id]); if (!sup) return; askSave({ editing: false, entityLabel: "purchase order from requisition", onConfirm: () => { convertRequisitionToPo(tenantId, r.id, sup.name, sup.id); refresh(); } }); }}>Create PO</Button>
                      </>
                    ) : null}
                    <RecordRowActions onEdit={() => { setEditing(r); setForm({ requested_by: r.requested_by, department: r.department ?? "", needed_by: r.needed_by ?? "", notes: r.notes ?? "" }); setLines(r.lines?.length ? r.lines : [emptyDocumentLine()]); setOpenForm(true); }} onTrash={() => askTrash({ entityLabel: "requisition", onConfirm: () => { trashRequisition(r.id); refresh(); } })} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}

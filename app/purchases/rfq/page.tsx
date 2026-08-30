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
import { emptyDocumentLine, type DocumentLine } from "@/modules/ops/document-line";
import {
  awardRfq,
  createRfq,
  createVendorQuote,
  listRfqs,
  listSuppliers,
  listVendorQuotes,
  trashRfq,
  updateRfq,
  type PurchaseRfq
} from "@/modules/purchase/services/purchase.store";

export default function RfqPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<PurchaseRfq[]>([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("rfq_no");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<PurchaseRfq | null>(null);
  const [form, setForm] = useState({ title: "", due_date: "", notes: "" });
  const [lines, setLines] = useState<DocumentLine[]>([emptyDocumentLine()]);
  const [extraJson, setExtraJson] = useState("");
  const [quoteForm, setQuoteForm] = useState({ rfq_id: "", supplier_name: "", total_amount: "" });
  const products = listProducts(tenantId);
  const suppliers = listSuppliers(tenantId);

  function refresh() { setRows(listRfqs(tenantId)); }
  useEffect(() => { refresh(); }, [tenantId]);
  const filtered = useMemo(
    () => filterAndSort(rows as unknown as Array<Record<string, unknown>>, { search, searchFields: ["rfq_no", "title", "status"], sortField, sortDir }) as unknown as PurchaseRfq[],
    [rows, search, sortField, sortDir]
  );

  function doSave() {
    const payload = { title: form.title.trim(), due_date: form.due_date || null, notes: form.notes.trim() || null, status: "open" as const, lines };
    const row = editing ? updateRfq(editing.id, payload) : createRfq(tenantId, payload);
    if (row) persistExtraFields(tenantId, "purchases.rfq", row.id, extraJson);
    setOpenForm(false);
    refresh();
  }

  return (
    <AppShell activeModule="purchases">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader title="Request for quotation" description="Send the same indent to multiple vendors, compare quotes, and award a PO." actionLabel="New RFQ" onAction={() => { setEditing(null); setForm({ title: "", due_date: "", notes: "" }); setLines([emptyDocumentLine()]); setExtraJson(""); setOpenForm(true); }} />
      {openForm ? (
        <Panel className="mb-4">
          <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); askSave({ editing: Boolean(editing), entityLabel: "RFQ", onConfirm: doSave }); }}>
            <Field label="Title"><TextInput required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Due date"><TextInput type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
            <DocumentLinesEditor lines={lines} onChange={setLines} products={products} priceField="purchase_price" />
            <ExtraFieldsBlock formKey="purchases.rfq" valueJson={extraJson} onChange={setExtraJson} />
            <Button type="submit">Save RFQ</Button>
          </form>
        </Panel>
      ) : null}
      <Panel className="mb-4">
        <h2 className="mb-3 text-lg font-bold text-ink">Record vendor quote</h2>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={(e) => { e.preventDefault(); askSave({ editing: false, entityLabel: "vendor quote", onConfirm: () => { createVendorQuote(tenantId, { rfq_id: quoteForm.rfq_id, supplier_name: quoteForm.supplier_name, total_amount: Number(quoteForm.total_amount) || 0, status: "received" }); setQuoteForm({ rfq_id: "", supplier_name: "", total_amount: "" }); refresh(); } }); }}>
          <Field label="RFQ">
            <SelectInput value={quoteForm.rfq_id} onChange={(e) => setQuoteForm({ ...quoteForm, rfq_id: e.target.value })} required>
              <option value="">Select</option>
              {rows.map((r) => <option key={r.id} value={r.id}>{r.rfq_no}</option>)}
            </SelectInput>
          </Field>
          <Field label="Supplier">
            <SelectInput value={quoteForm.supplier_name} onChange={(e) => setQuoteForm({ ...quoteForm, supplier_name: e.target.value })} required>
              <option value="">Select</option>
              {suppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Amount"><TextInput type="number" required value={quoteForm.total_amount} onChange={(e) => setQuoteForm({ ...quoteForm, total_amount: e.target.value })} /></Field>
          <div className="flex items-end"><Button type="submit">Add quote</Button></div>
        </form>
      </Panel>
      <Panel>
        <DataListToolbar search={search} onSearchChange={setSearch} sortValue={sortField} sortOptions={[{ value: "rfq_no", label: "Number" }]} onSortChange={setSortField} sortDir={sortDir} onSortDirChange={setSortDir} onExportCsv={() => exportListCsv({ tenantId, module: "purchases", filename: "rfqs", rows: filtered.map((r) => ({ No: r.rfq_no, Title: r.title, Status: r.status })) })} onExportPdf={() => exportListPdf({ tenantId, module: "purchases", title: "RFQs", filename: "rfqs", columns: ["No", "Title", "Status"], rows: filtered.map((r) => [r.rfq_no, r.title, r.status]) })} />
        <ul className="mt-3 space-y-3">
          {filtered.map((r) => {
            const quotes = listVendorQuotes(tenantId, r.id);
            return (
              <li key={r.id} className="rounded-[var(--bs-radius)] border border-line px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{r.title} <span className="text-xs text-slate-500">{r.rfq_no}</span></p>
                    <StatusBadge status={r.status} />
                  </div>
                  <RecordRowActions onEdit={() => { setEditing(r); setForm({ title: r.title, due_date: r.due_date ?? "", notes: r.notes ?? "" }); setLines(r.lines?.length ? r.lines : [emptyDocumentLine()]); setOpenForm(true); }} onTrash={() => askTrash({ entityLabel: "RFQ", onConfirm: () => { trashRfq(r.id); refresh(); } })} />
                </div>
                <table className="mt-2 w-full text-sm">
                  <tbody>
                    {quotes.map((q) => (
                      <tr key={q.id} className="border-t border-line">
                        <td className="py-2">{q.supplier_name}</td>
                        <td>{money(q.total_amount)}</td>
                        <td><StatusBadge status={q.status} /></td>
                        <td>
                          {r.status !== "awarded" ? (
                            <Button type="button" variant="secondary" onClick={() => askSave({ editing: false, entityLabel: "purchase order from awarded quote", onConfirm: () => { awardRfq(tenantId, r.id, q.id); refresh(); } })}>Award PO</Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                    {quotes.length === 0 ? <tr><td className="py-2 text-slate-500" colSpan={4}>No vendor quotes yet.</td></tr> : null}
                  </tbody>
                </table>
              </li>
            );
          })}
        </ul>
      </Panel>
      {dialog}
    </AppShell>
  );
}

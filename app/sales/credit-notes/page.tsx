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
import { Button, Field, Panel, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { money } from "@/lib/utils";
import { applyCreditNote, createCreditNote, listCreditNotes, trashCreditNote, updateCreditNote, type CreditNote } from "@/modules/sales/services/sales.store";

export default function CreditNotesPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<CreditNote[]>([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("credit_note_no");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<CreditNote | null>(null);
  const [form, setForm] = useState({ customer_name: "", invoice_no: "", note_date: new Date().toISOString().slice(0, 10), amount: "", reason: "", status: "open" as CreditNote["status"] });
  const [extraJson, setExtraJson] = useState("");

  function refresh() { setRows(listCreditNotes(tenantId)); }
  useEffect(() => { refresh(); }, [tenantId]);
  const filtered = useMemo(
    () => filterAndSort(rows as unknown as Array<Record<string, unknown>>, { search, searchFields: ["credit_note_no", "customer_name", "invoice_no"], sortField, sortDir }) as unknown as CreditNote[],
    [rows, search, sortField, sortDir]
  );

  function doSave() {
    const payload = { customer_name: form.customer_name.trim(), invoice_no: form.invoice_no.trim() || null, note_date: form.note_date, amount: Number(form.amount) || 0, reason: form.reason.trim(), status: form.status };
    const row = editing ? updateCreditNote(editing.id, payload) : createCreditNote(tenantId, payload);
    if (row) persistExtraFields(tenantId, "sales.credit_note", row.id, extraJson);
    setOpenForm(false);
    refresh();
  }

  return (
    <AppShell activeModule="sales">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader title="Credit notes" description="Returns and price corrections post to AR in the ledger." actionLabel="New credit note" onAction={() => { setEditing(null); setForm({ customer_name: "", invoice_no: "", note_date: new Date().toISOString().slice(0, 10), amount: "", reason: "", status: "open" }); setExtraJson(""); setOpenForm(true); }} />
      {openForm ? (
        <Panel className="mb-4">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); askSave({ editing: Boolean(editing), entityLabel: "credit note", onConfirm: doSave }); }}>
            <Field label="Customer"><TextInput required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></Field>
            <Field label="Invoice no"><TextInput value={form.invoice_no} onChange={(e) => setForm({ ...form, invoice_no: e.target.value })} /></Field>
            <Field label="Amount"><TextInput type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Reason"><TextInput required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
            <div className="md:col-span-2"><ExtraFieldsBlock formKey="sales.credit_note" valueJson={extraJson} onChange={setExtraJson} /></div>
            <Button type="submit">Save</Button>
          </form>
        </Panel>
      ) : null}
      <Panel>
        <DataListToolbar search={search} onSearchChange={setSearch} sortValue={sortField} sortOptions={[{ value: "credit_note_no", label: "Number" }]} onSortChange={setSortField} sortDir={sortDir} onSortDirChange={setSortDir} onExportCsv={() => exportListCsv({ tenantId, module: "sales", filename: "credit-notes", rows: filtered.map((r) => ({ No: r.credit_note_no, Customer: r.customer_name, Amount: r.amount, Status: r.status })) })} onExportPdf={() => exportListPdf({ tenantId, module: "sales", title: "Credit notes", filename: "credit-notes", columns: ["No", "Customer", "Amount"], rows: filtered.map((r) => [r.credit_note_no, r.customer_name, money(r.amount)]) })} />
        <table className="mt-3 w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th className="px-3 py-2">Note</th><th>Customer</th><th>Amount</th><th>Status</th><th /></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-3 py-3 font-semibold">{r.credit_note_no}</td>
                <td>{r.customer_name}</td>
                <td>{money(r.amount)}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>
                  {r.status !== "applied" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="!min-h-8 !px-3 !text-xs"
                      onClick={() => {
                        try {
                          applyCreditNote(r.id);
                          refresh();
                        } catch (e) {
                          window.alert(e instanceof Error ? e.message : "Cannot apply credit note.");
                        }
                      }}
                    >
                      Apply to invoice
                    </Button>
                  ) : null}
                  <RecordRowActions onEdit={() => { setEditing(r); setForm({ customer_name: r.customer_name, invoice_no: r.invoice_no ?? "", note_date: r.note_date, amount: String(r.amount), reason: r.reason, status: r.status }); setOpenForm(true); }} onTrash={() => askTrash({ entityLabel: "credit note", onConfirm: () => { trashCreditNote(r.id); refresh(); } })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}

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
import { DocumentLinesEditor } from "@/components/ops/document-lines-editor";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { money } from "@/lib/utils";
import { listProducts } from "@/modules/inventory/services/inventory.store";
import { emptyDocumentLine, linesSubtotal, type DocumentLine } from "@/modules/ops/document-line";
import {
  createSalesReturn,
  listInvoices,
  listSalesReturns,
  trashSalesReturn,
  updateSalesReturn,
  type SalesReturn
} from "@/modules/sales/services/sales.store";

const empty = {
  customer_name: "",
  invoice_no: "",
  return_date: new Date().toISOString().slice(0, 10),
  status: "received" as SalesReturn["status"],
  reason: ""
};

export default function SalesReturnsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<SalesReturn[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("return_no");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<SalesReturn | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [lines, setLines] = useState<DocumentLine[]>([emptyDocumentLine()]);
  const [extraJson, setExtraJson] = useState("");
  const invoices = listInvoices(tenantId);
  const products = listProducts(tenantId);

  function refresh() {
    setRows(listSalesReturns(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["return_no", "customer_name", "invoice_no", "reason", "status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as SalesReturn[],
    [rows, search, statusFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, return_date: new Date().toISOString().slice(0, 10) });
    setLines([emptyDocumentLine()]);
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: SalesReturn) {
    setEditing(row);
    setForm({
      customer_name: row.customer_name,
      invoice_no: row.invoice_no,
      return_date: row.return_date,
      status: row.status,
      reason: row.reason
    });
    setLines(row.lines?.length ? row.lines : [emptyDocumentLine()]);
    setExtraJson(getExtraFieldValues(tenantId, "sales.return", row.id));
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    setError("");
    if (!form.customer_name.trim()) {
      setError("Customer is required.");
      return;
    }
    const payload = {
      customer_name: form.customer_name.trim(),
      invoice_no: form.invoice_no.trim() || "—",
      return_date: form.return_date,
      status: form.status,
      total_amount: linesSubtotal(lines),
      reason: form.reason.trim() || "—",
      lines,
      warehouse_id: editing?.warehouse_id
    };
    if (editing) {
      updateSalesReturn(editing.id, payload);
      persistExtraFields(tenantId, "sales.return", editing.id, extraJson);
    } else {
      const row = createSalesReturn(tenantId, payload);
      persistExtraFields(tenantId, "sales.return", row.id, extraJson);
    }
    setExtraJson("");
    setForm({ ...empty, return_date: new Date().toISOString().slice(0, 10) });
    setLines([emptyDocumentLine()]);
    setEditing(null);
    setOpenForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "sales return",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="sales">
      <PageHeader
        title="Sales Returns"
        description="Received/credited returns restock warehouse lines."
        actionLabel="New return"
        onAction={openCreate}
      />
      <ModuleBreadcrumbs />
      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <Field label="Invoice">
              <SelectInput
                value={form.invoice_no}
                onChange={(e) => {
                  const inv = invoices.find((i) => i.invoice_no === e.target.value);
                  setForm({ ...form, invoice_no: e.target.value, customer_name: inv?.customer_name ?? form.customer_name });
                  if (inv?.lines?.length) setLines(inv.lines);
                }}
              >
                <option value="">Optional link…</option>
                {invoices.map((i) => (
                  <option key={i.id} value={i.invoice_no}>
                    {i.invoice_no} — {i.customer_name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Customer">
              <TextInput value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
            </Field>
            <Field label="Date">
              <TextInput type="date" value={form.return_date} onChange={(e) => setForm({ ...form, return_date: e.target.value })} />
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SalesReturn["status"] })}>
                {["draft", "received", "credited"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Reason" className="md:col-span-2">
              <TextInput value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </Field>
            <DocumentLinesEditor lines={lines} onChange={setLines} products={products} tenantId={tenantId} />
            <ExtraFieldsBlock formKey="sales.return" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">{editing ? "Update return" : "Save return"}</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setExtraJson("");
                  setEditing(null);
                  setOpenForm(false);
                }}
              >
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
          searchPlaceholder="Search returns…"
          filterLabel="statuses"
          filterValue={statusFilter}
          filterOptions={[
            { value: "draft", label: "draft" },
            { value: "received", label: "received" },
            { value: "credited", label: "credited" }
          ]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "return_no", label: "Return no" },
            { value: "customer_name", label: "Customer" },
            { value: "invoice_no", label: "Invoice" },
            { value: "return_date", label: "Date" },
            { value: "total_amount", label: "Amount" },
            { value: "status", label: "Status" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "sales",
              filename: "sales-returns",
              rows: filtered.map((r) => ({
                No: r.return_no,
                Customer: r.customer_name,
                Invoice: r.invoice_no,
                Date: r.return_date,
                Amount: r.total_amount,
                Status: r.status,
                Reason: r.reason
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "sales",
              title: "Sales Returns",
              filename: "sales-returns",
              columns: ["No", "Customer", "Invoice", "Date", "Amount", "Status"],
              rows: filtered.map((r) => [r.return_no, r.customer_name, r.invoice_no, r.return_date, String(r.total_amount), r.status])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Return No", "Customer", "Invoice", "Date", "Amount", "Status", ""].map((h) => (
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
                  {r.return_no}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="sales.return" recordId={r.id} />
                </td>
                <td className="px-3 py-3">{r.customer_name}</td>
                <td className="px-3 py-3">{r.invoice_no}</td>
                <td className="px-3 py-3">{r.return_date}</td>
                <td className="px-3 py-3">{money(r.total_amount)}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-3 py-3">
                  <RecordRowActions
                    onEdit={() => openEdit(r)}
                    onTrash={() =>
                      askTrash({
                        entityLabel: "sales return",
                        name: r.return_no,
                        onConfirm: () => {
                          trashSalesReturn(r.id);
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

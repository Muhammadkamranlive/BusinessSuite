"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { money } from "@/lib/utils";
import { listInvoices, trashInvoice, updateInvoice, type Invoice } from "@/modules/sales/services/sales.store";

const emptyEdit = {
  customer_name: "",
  invoice_date: "",
  due_date: "",
  status: "draft" as Invoice["status"]
};

export default function InvoicesPage() {
  const router = useRouter();
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("invoice_no");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyEdit);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setInvoices(listInvoices(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(invoices as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["invoice_no", "customer_name", "status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as Invoice[],
    [invoices, search, statusFilter, sortField, sortDir]
  );

  function openEdit(row: Invoice) {
    setEditing(row);
    setForm({
      customer_name: row.customer_name,
      invoice_date: row.invoice_date,
      due_date: row.due_date,
      status: row.status
    });
    setExtraJson(getExtraFieldValues(tenantId, "sales.invoice", row.id));
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    if (!editing) return;
    setError("");
    if (!form.customer_name.trim()) {
      setError("Customer is required.");
      return;
    }
    updateInvoice(editing.id, {
      customer_name: form.customer_name.trim(),
      invoice_date: form.invoice_date,
      due_date: form.due_date,
      status: form.status
    });
    persistExtraFields(tenantId, "sales.invoice", editing.id, extraJson);
    setExtraJson("");
    setEditing(null);
    setOpenForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: true,
      entityLabel: "invoice",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="sales">
      <PageHeader
        title="Invoices"
        description="Sales invoices and payment status."
        actionLabel="New Invoice"
        onAction={() => router.push("/sales/invoices/new")}
      />
      <ModuleBreadcrumbs />

      {openForm && editing ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <p className="md:col-span-2 text-sm text-slate-500">
              Editing header for <span className="font-semibold text-ink">{editing.invoice_no}</span>. Line items stay on New Invoice.
            </p>
            <Field label="Customer">
              <TextInput value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Invoice["status"] })}>
                {["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Invoice date">
              <TextInput type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} />
            </Field>
            <Field label="Due date">
              <TextInput type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </Field>
            <ExtraFieldsBlock formKey="sales.invoice" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Update invoice</Button>
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
          searchPlaceholder="Search invoices…"
          filterLabel="statuses"
          filterValue={statusFilter}
          filterOptions={[
            { value: "draft", label: "draft" },
            { value: "sent", label: "sent" },
            { value: "partially_paid", label: "partially_paid" },
            { value: "paid", label: "paid" },
            { value: "overdue", label: "overdue" },
            { value: "cancelled", label: "cancelled" }
          ]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "invoice_no", label: "Invoice no" },
            { value: "customer_name", label: "Customer" },
            { value: "invoice_date", label: "Date" },
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
              filename: "invoices",
              rows: filtered.map((i) => ({
                No: i.invoice_no,
                Customer: i.customer_name,
                Date: i.invoice_date,
                Due: i.due_date,
                Amount: i.total_amount,
                Paid: i.paid_amount,
                Balance: i.balance_due,
                Status: i.status
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "sales",
              title: "Invoices",
              filename: "invoices",
              columns: ["No", "Customer", "Date", "Amount", "Status"],
              rows: filtered.map((i) => [i.invoice_no, i.customer_name, i.invoice_date, String(i.total_amount), i.status])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Invoice No", "Customer", "Date", "Due", "Amount", "Paid", "Balance", "Status", ""].map((h) => (
                <th key={h || "a"} className="px-3 py-3 font-semibold text-slate-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-b border-line">
                <td className="px-3 py-3 font-medium">
                  {i.invoice_no}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="sales.invoice" recordId={i.id} />
                </td>
                <td className="px-3 py-3">{i.customer_name}</td>
                <td className="px-3 py-3">{i.invoice_date}</td>
                <td className="px-3 py-3">{i.due_date}</td>
                <td className="px-3 py-3">{money(i.total_amount)}</td>
                <td className="px-3 py-3">{money(i.paid_amount)}</td>
                <td className="px-3 py-3">{money(i.balance_due)}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={i.status} />
                </td>
                <td className="px-3 py-3">
                  <RecordRowActions
                    onEdit={() => openEdit(i)}
                    onTrash={() =>
                      askTrash({
                        entityLabel: "invoice",
                        name: i.invoice_no,
                        onConfirm: () => {
                          trashInvoice(i.id);
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

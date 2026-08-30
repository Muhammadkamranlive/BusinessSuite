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
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { money } from "@/lib/utils";
import {
  listInvoices,
  listPayments,
  recordPayment,
  trashPayment,
  updatePayment,
  type Invoice,
  type PaymentReceived
} from "@/modules/sales/services/sales.store";

const empty = {
  invoice_id: "",
  amount: "",
  payment_method: "bank",
  payment_date: new Date().toISOString().slice(0, 10)
};

export default function PaymentsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [payments, setPayments] = useState<PaymentReceived[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("payment_no");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<PaymentReceived | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setPayments(listPayments(tenantId));
    setInvoices(listInvoices(tenantId).filter((i) => i.status !== "cancelled" && i.balance_due > 0));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(payments as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["payment_no", "customer_name", "payment_method"],
        sortField,
        sortDir
      }) as unknown as PaymentReceived[],
    [payments, search, sortField, sortDir]
  );

  const selected = invoices.find((i) => i.id === form.invoice_id) ?? listInvoices(tenantId).find((i) => i.id === form.invoice_id);

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, payment_date: new Date().toISOString().slice(0, 10) });
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: PaymentReceived) {
    setEditing(row);
    setForm({
      invoice_id: row.invoice_id,
      amount: String(row.amount),
      payment_method: row.payment_method,
      payment_date: row.payment_date
    });
    setExtraJson(getExtraFieldValues(tenantId, "sales.payment", row.id));
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    setError("");
    if (editing) {
      const amount = Number(form.amount) || 0;
      if (amount <= 0) {
        setError("Amount must be greater than zero.");
        return;
      }
      updatePayment(editing.id, {
        amount,
        payment_method: form.payment_method,
        payment_date: form.payment_date,
        customer_name: editing.customer_name
      });
      persistExtraFields(tenantId, "sales.payment", editing.id, extraJson);
    } else {
      const invoice = listInvoices(tenantId).find((i) => i.id === form.invoice_id);
      if (!invoice) {
        setError("Select an invoice.");
        return;
      }
      const amount = Number(form.amount) || 0;
      if (amount <= 0) {
        setError("Amount must be greater than zero.");
        return;
      }
      try {
        const result = recordPayment(
          tenantId,
          invoice.id,
          amount,
          form.payment_method,
          invoice.customer_name,
          form.payment_date
        );
        if (!result) {
          setError("Could not record payment.");
          return;
        }
        persistExtraFields(tenantId, "sales.payment", result.id, extraJson);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not record payment.");
        return;
      }
    }
    setExtraJson("");
    setForm({ ...empty, payment_date: new Date().toISOString().slice(0, 10) });
    setEditing(null);
    setOpenForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "payment",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="sales">
      <PageHeader
        title="Payments Received"
        description="Record customer payments against open invoices."
        actionLabel="Record payment"
        onAction={openCreate}
      />
      <ModuleBreadcrumbs />

      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            {!editing ? (
              <Field label="Invoice">
                <SelectInput value={form.invoice_id} onChange={(e) => setForm({ ...form, invoice_id: e.target.value })} required>
                  <option value="">Select open invoice…</option>
                  {invoices.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.invoice_no} — {i.customer_name} (due {money(i.balance_due)})
                    </option>
                  ))}
                </SelectInput>
              </Field>
            ) : (
              <Field label="Payment">
                <TextInput value={editing.payment_no} disabled />
              </Field>
            )}
            <Field label="Amount">
              <TextInput
                type="number"
                min={0.01}
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder={selected && !editing ? String(selected.balance_due) : ""}
                required
              />
            </Field>
            <Field label="Method">
              <SelectInput value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                {["bank", "cash", "card", "online", "cheque"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Payment date">
              <TextInput type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
            </Field>
            <ExtraFieldsBlock formKey="sales.payment" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">{editing ? "Update payment" : "Save payment"}</Button>
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
          searchPlaceholder="Search payments…"
          sortValue={sortField}
          sortOptions={[
            { value: "payment_no", label: "Payment no" },
            { value: "customer_name", label: "Customer" },
            { value: "payment_date", label: "Date" },
            { value: "amount", label: "Amount" },
            { value: "payment_method", label: "Method" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "sales",
              filename: "payments",
              rows: filtered.map((p) => ({
                No: p.payment_no,
                Customer: p.customer_name,
                Date: p.payment_date,
                Amount: p.amount,
                Method: p.payment_method
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "sales",
              title: "Payments Received",
              filename: "payments",
              columns: ["No", "Customer", "Date", "Amount", "Method"],
              rows: filtered.map((p) => [p.payment_no, p.customer_name, p.payment_date, String(p.amount), p.payment_method])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Payment No", "Customer", "Date", "Amount", "Method", ""].map((h) => (
                <th key={h || "a"} className="px-3 py-3 font-semibold text-slate-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-line">
                <td className="px-3 py-3 font-medium">
                  {p.payment_no}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="sales.payment" recordId={p.id} />
                </td>
                <td className="px-3 py-3">{p.customer_name}</td>
                <td className="px-3 py-3">{p.payment_date}</td>
                <td className="px-3 py-3">{money(p.amount)}</td>
                <td className="px-3 py-3 capitalize">{p.payment_method}</td>
                <td className="px-3 py-3">
                  <RecordRowActions
                    onEdit={() => openEdit(p)}
                    onTrash={() =>
                      askTrash({
                        entityLabel: "payment",
                        name: p.payment_no,
                        onConfirm: () => {
                          trashPayment(p.id);
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
